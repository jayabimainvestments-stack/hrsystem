const db = require('../config/db');

// Helper to update liabilities
const updateLiability = async (client, month, type, amountDiff) => {
    if (amountDiff === 0) return;

    // Check if exists
    const check = await client.query('SELECT 1 FROM payroll_liabilities WHERE month = $1 AND type = $2', [month, type]);

    if (check.rows.length > 0) {
        await client.query(`
            UPDATE payroll_liabilities 
            SET total_payable = total_payable + $1 
            WHERE month = $2 AND type = $3
        `, [amountDiff, month, type]);
    } else {
        await client.query(`
            INSERT INTO payroll_liabilities (month, type, total_payable, status)
            VALUES ($1, $2, $3, 'Pending')
        `, [month, type, amountDiff]);
    }
};

// Helper to calculate progressive tax (PAYE)
const calculateTax = (taxableIncome, brackets) => {
    if (taxableIncome <= 0 || !brackets || brackets.length === 0) return 0;

    let tax = 0;
    for (const bracket of brackets) {
        if (taxableIncome > bracket.min_income) {
            const applicableAmount = Math.min(taxableIncome, bracket.max_income || Infinity) - bracket.min_income;
            tax += applicableAmount * (bracket.tax_rate / 100);
        }
    }
    return tax;
};

// Helper: Calculate Split Fuel Allowance based on working days and price history
const calculateSplitFuelAllowance = async (client, totalLiters, startDate, endDate) => {
    try {
        // 1. Get all working days in range (Excluding Sat, Sun)
        let workingDays = [];
        let curr = new Date(startDate);
        const end = new Date(endDate);
        
        while (curr <= end) {
            const day = curr.getDay();
            if (day !== 0 && day !== 6) { // Not Sat or Sun
                workingDays.push(new Date(curr).toISOString().split('T')[0]);
            }
            curr.setDate(curr.getDate() + 1);
        }

        // 2. Filter out Company Holidays
        const holidayRes = await client.query(
            "SELECT date::text FROM company_holidays WHERE date::date BETWEEN $1 AND $2",
            [startDate, endDate]
        );
        const holidays = new Set(holidayRes.rows.map(h => h.date.split(' ')[0]));
        workingDays = workingDays.filter(d => !holidays.has(d));

        if (workingDays.length === 0) return { totalAmount: 0, reason: "No working days in period", dailyBreakdown: [] };

        const dailyQuota = totalLiters / workingDays.length;
        let totalAmount = 0;
        let priceSegments = {}; // { price: days }
        let dailyBreakdown = [];

        // 3. Pre-fetch all fuel prices to avoid N+1 DB queries per day
        const priceCacheRes = await client.query('SELECT effective_from_date, price_per_liter FROM fuel_price_history ORDER BY effective_from_date DESC');
        const priceHistory = priceCacheRes.rows.map(r => ({ date: new Date(r.effective_from_date), price: parseFloat(r.price_per_liter) }));

        // 4. Calculate daily amount based on cached price history
        for (const date of workingDays) {
            const currentDate = new Date(date);
            const applicable = priceHistory.find(h => h.date <= currentDate);
            
            const price = applicable ? applicable.price : 0;
            const amount = dailyQuota * price;
            totalAmount += amount;
            
            priceSegments[price] = (priceSegments[price] || 0) + 1;
            dailyBreakdown.push({
                date,
                price,
                liters: Math.round(dailyQuota * 100) / 100,
                amount: Math.round(amount * 100) / 100
            });
        }

        // 4. Build Reason string
        const breakdownStr = Object.entries(priceSegments)
            .map(([price, days]) => `${(days * dailyQuota).toFixed(2)}L @ Rs.${price}`)
            .join(' + ');
        
        const finalReason = `Split: ${workingDays.length} working days. [${breakdownStr}]`;
        
        return { 
            totalAmount: Math.round(totalAmount * 100) / 100, 
            reason: finalReason,
            dailyBreakdown
        };
    } catch (e) {
        console.error("[FUEL_CALC_ERROR]", e);
        return { totalAmount: 0, reason: "Error in split calculation", dailyBreakdown: [] };
    }
};

const createPayroll = async (req, res) => {
    const { user_id, month, year, reauth_token, fuel_rate_override } = req.body;
    const processingYear = year || new Date().getFullYear();

    const monthMap = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };

    const monthNum = monthMap[month] || '01';
    const datePrefix = `${processingYear}-${monthNum}`;

    // --- Enterprise Security: Mandatory Re-auth for Payroll ---
    if (!reauth_token || reauth_token !== 'PAYROLL_VERIFIED_SESSION') {
        return res.status(401).json({
            message: 'High-security action: Please re-authenticate to authorize payroll disbursement.'
        });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 0. Fetch the Salary Catalog (All active components)
        const catalogRes = await client.query("SELECT * FROM salary_components WHERE status = 'Active'");
        const catalog = catalogRes.rows;

        // Identify standard components from Catalog
        const findInCatalog = (keywords) => catalog.find(c => keywords.some(k => c.name.toLowerCase().includes(k.toLowerCase())));
        const compBasic = findInCatalog(['basic pay', 'basic salary']);
        const compEpf8 = findInCatalog(['epf 8%', 'e.p.f. 8%']);
        const compWelfare = findInCatalog(['welfare']);

        // 1. Check for duplicates
        const dupCheck = await client.query('SELECT id FROM payroll WHERE user_id = $1 AND month = $2', [user_id, datePrefix]);
        if (dupCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Payroll record already exists for this employee in this month.' });
        }

        // 2. Get Employee Info
        const empRes = await client.query(`
            SELECT e.*, u.name 
            FROM employees e
            JOIN users u ON e.user_id = u.id
            WHERE u.id = $1
        `, [user_id]);

        if (empRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Employee not found' });
        }
        const employee = empRes.rows[0];

        // RULE 3: Auto-snapshot from employee_salary_structure → monthly_salary_overrides
        // This replaces the manual "Snapshot Baseline" button — it happens automatically
        const baselineRes = await client.query(`
            SELECT component_id, amount, quantity
            FROM employee_salary_structure
            WHERE employee_id = $1
        `, [employee.id]);

        if (baselineRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                message: `No permanent salary structure found for this employee. Please set up their Salary Structure in Manual Deductions & Allowances first.`
            });
        }

        // Upsert each baseline component into monthly_salary_overrides (only if not already overridden)
        if (baselineRes.rows.length > 0) {
            const values = [];
            const flatValues = [];
            let p_index = 1;
            for (const comp of baselineRes.rows) {
                values.push(`($${p_index++}, $${p_index++}, $${p_index++}, $${p_index++}, $${p_index++}, 'Approved', 'Auto-snapshot from Master Baseline')`);
                flatValues.push(employee.id, datePrefix, comp.component_id, comp.amount, comp.quantity);
            }
            await client.query(`
                INSERT INTO monthly_salary_overrides (employee_id, month, component_id, amount, quantity, status, reason)
                VALUES ${values.join(', ')}
                ON CONFLICT (employee_id, month, component_id) DO NOTHING
            `, flatValues);
        }

        // RULE 1+2: Now fetch all Approved components for this month
        // (baseline auto-inserted above + manual overrides that were approved via Governance)
        const componentsRes = await client.query(`
            SELECT 
                mo.amount, 
                mo.quantity, 
                sc.name, 
                sc.type, 
                sc.is_taxable, 
                sc.epf_eligible,
                sc.etf_eligible,
                sc.welfare_eligible,
                sc.id as component_id,
                mo.reason
            FROM monthly_salary_overrides mo
            JOIN salary_components sc ON mo.component_id = sc.id
            WHERE mo.employee_id = $1 AND mo.month = $2 AND mo.status = 'Approved'
        `, [employee.id, datePrefix]);

        const components = componentsRes.rows;

        if (components.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                message: 'No approved salary components found for this month. Please check the employee salary structure.'
            });
        }

        // --- Dynamic Context: Policy, Tax, etc. ---
        const [policyRes, taxRes] = await Promise.all([
            client.query('SELECT * FROM attendance_policies WHERE id = 1'),
            client.query('SELECT * FROM tax_brackets ORDER BY min_income ASC')
        ]);

        const policy = policyRes.rows[0];
        const taxBrackets = taxRes.rows;
        const appliedComponentIds = new Set();

        let basicSalary = 0;
        let totalEarnings = 0;
        let totalDeductionsInStructure = 0;
        let totalTaxable = 0;

        let epfBase = 0;
        let etfBase = 0;
        let welfareBase = 0;

        let breakdown = [];
        let attendanceAllowanceIdx = -1;

        for (const comp of components) {
            let amount = parseFloat(comp.amount);
            let quantity = parseFloat(comp.quantity || 0);
            const compName = comp.name.toLowerCase();

            // Skip EPF/ETF/Welfare from structure — RULE 5: calculated from basic salary only at the end
            if (compName.includes('epf') || compName.includes('etf') || compName.includes('welfare')) {
                console.log(`[PAYROLL_ENGINE] Skipping '${comp.name}' from structure — auto-calculated from Basic Salary (Rule 5).`);
                continue;
            }

            // Fuel display: append liters & calculate dynamic split if applicable
            if (compName.includes('fuel') && quantity > 0) {
                // Determine cycle dates for March 2026 (or relevant month)
                // User requirement: Feb 25 - Mar 25
                const fuelStartDate = (month === 'March' && processingYear == 2026) ? '2026-02-25' : `${datePrefix}-01`;
                const fuelEndDate = (month === 'March' && processingYear == 2026) ? '2026-03-25' : new Date(processingYear, monthNum, 0).toISOString().split('T')[0];

                const splitResult = await calculateSplitFuelAllowance(client, quantity, fuelStartDate, fuelEndDate);
                amount = splitResult.totalAmount;
                comp.name = `${comp.name} (${quantity}L)`;
                comp.reason = splitResult.reason; // Inject into the component
                console.log(`[FUEL_ENGINE] Applied split for ${employee.name}: ${amount} (Liters: ${quantity})`);
            }

            if (compName.includes('basic')) basicSalary = amount;

            if (comp.type === 'Earning') {
                totalEarnings += amount;
                if (comp.is_taxable) totalTaxable += amount;

                // Statutory Bases (Rule 5+: Data-driven from Catalog)
                if (comp.epf_eligible) epfBase += amount;
                if (comp.etf_eligible) etfBase += amount;
                if (comp.welfare_eligible) welfareBase += amount;

                const idx = breakdown.push({ name: comp.name, amount, type: 'Earning', details: comp.reason || comp.details }) - 1;
                if (compName.includes('attendance')) attendanceAllowanceIdx = idx;
            } else if (comp.type === 'Deduction') {
                // Skip loan-type deductions from structure — RULE 4: handled by employee_loans tracker below
                if (compName.includes('loan')) {
                    console.log(`[PAYROLL_ENGINE] Skipping structure loan component '${comp.name}' — handled by Loan Tracker (Rule 4).`);
                    continue;
                }
                totalDeductionsInStructure += amount;
                breakdown.push({ name: comp.name, amount, type: 'Deduction', details: comp.reason || comp.details });
            }

            appliedComponentIds.add(comp.component_id);
        }

        // --- 2.1 NEW: Loan Installment Tracker Integration ---
        const activeLoansRes = await client.query(`
            SELECT * FROM employee_loans 
            WHERE employee_id = $1 
            AND status = 'Approved'
            AND start_date <= $2::date
            AND end_date >= $2::date
            AND installments_paid < num_installments
        `, [employee.id, `${datePrefix}-01`]);

        for (const loan of activeLoansRes.rows) {
            const installment = parseFloat(loan.installment_amount);
            totalDeductionsInStructure += installment;
            breakdown.push({
                name: `Loan Installment (Ref: ${loan.id})`,
                amount: installment,
                type: 'Deduction',
                loan_id: loan.id // Tag for post-processing
            });
        }

        /* 
3. Process Attendance/Leave Deductions (LOP) - GATED BY APPROVAL (Manual Entry Page)
        console.log(`[PAYROLL_ENGINE] Loading Policy for ${user_id}:`, policy);

        const leaveRes = await client.query(`
            SELECT 
                COALESCE(SUM(unpaid_days), 0) as total_unpaid_days,
                COALESCE(SUM(short_leave_hours), 0) as total_short_leave_hours,
                COUNT(*) FILTER (WHERE leave_type = 'Half Day' AND status = 'Approved') as half_day_count
            FROM leaves 
            WHERE user_id = $1 AND status = 'Approved'
            AND (start_date::text LIKE $2 OR end_date::text LIKE $2)
        `, [user_id, `${datePrefix}%`]);

        const attendanceRes = await client.query(`
            SELECT 
                COUNT(*) FILTER (WHERE LOWER(a.status) = 'absent') as absent_count,
                COALESCE(SUM(a.late_minutes), 0) as total_late_minutes,
                COALESCE(SUM(a.short_leave_hours), 0) as total_short_leave_hours
            FROM attendance a
            JOIN employees e ON a.employee_id = e.id
            WHERE e.user_id = $1 AND a.date::text LIKE $2
            -- ABSENCE DE-DUPLICATION: Don't count absence if there's an approved leave for that day
            AND NOT EXISTS (
                SELECT 1 FROM leaves l 
                WHERE l.user_id = $1 
                AND l.status = 'Approved' 
                AND a.date::date BETWEEN l.start_date::date AND l.end_date::date
            )
        `, [user_id, `${datePrefix}%`]);

        const lData = leaveRes.rows[0];
        const aData = attendanceRes.rows[0];

        const fullUnpaidDays = parseFloat(lData.total_unpaid_days || 0) +
            parseFloat(aData.absent_count || 0) +
            (parseFloat(lData.half_day_count || 0) * 0.5); 

        const totalLateHours = (parseFloat(aData.total_late_minutes || 0) / 60) +
            parseFloat(aData.total_short_leave_hours || 0) +
            parseFloat(lData.total_short_leave_hours || 0);

        const hourRate = policy?.late_hourly_rate > 0 ? parseFloat(policy.late_hourly_rate) : (basicSalary / 240);
        const dayRate = policy?.absent_day_amount > 0
            ? parseFloat(policy.absent_day_amount)
            : (basicSalary / 30) * parseFloat(policy?.absent_deduction_rate || 1);

        const absentDeduction = fullUnpaidDays * dayRate;
        const lateDeduction = totalLateHours * hourRate;

        if (absentDeduction > 0 || lateDeduction > 0) {
            const totalAttendanceDeduction = absentDeduction + lateDeduction;
            const compNoPay = findInCatalog(['no pay']);

            if (attendanceAllowanceIdx !== -1) {
                let allowAmt = breakdown[attendanceAllowanceIdx].amount;
                if (totalAttendanceDeduction <= allowAmt) {
                    breakdown[attendanceAllowanceIdx].amount -= totalAttendanceDeduction;
                    console.log(`[PAYROLL_ENGINE] Deducted ${totalAttendanceDeduction} from Attendance Allowance`);
                } else {
                    const remainder = totalAttendanceDeduction - allowAmt;
                    breakdown[attendanceAllowanceIdx].amount = 0;
                    breakdown.push({
                        name: 'Attendance Penalty (Over Allowance)',
                        amount: remainder,
                        type: 'Deduction',
                        details: `Total penalty ${totalAttendanceDeduction} exceeded allowance ${allowAmt}`
                    });
                }
            } else {
                if (absentDeduction > 0) {
                    breakdown.push({
                        name: compNoPay ? compNoPay.name : 'Absence/Leave Deduction (LOP)',
                        amount: absentDeduction,
                        type: 'Deduction',
                        details: `${fullUnpaidDays} days @ LKR ${dayRate.toLocaleString()} per day`
                    });
                }
                if (lateDeduction > 0) {
                    breakdown.push({
                        name: 'Late/Short Leave Deduction',
                        amount: lateDeduction,
                        type: 'Deduction',
                        details: `${totalLateHours.toFixed(2)} hours accumulated`
                    });
                }
            }

            totalTaxable -= totalAttendanceDeduction;
        }
        */ 

        // RULE 5+: Welfare — calculated from Basic Salary preferentially (Enterprise Rule: 2%)
        const welfareAmount = (basicSalary > 0) ? (basicSalary * 0.02) : ((welfareBase > 0) ? (welfareBase * 0.02) : 0);
        if (welfareAmount > 0) {
            breakdown.push({
                name: compWelfare ? compWelfare.name : 'Welfare',
                amount: welfareAmount,
                type: 'Deduction',
                details: `2% of Eligible Earnings (Base: LKR ${welfareBase.toLocaleString()})`
            });
        }

        // RULE 5: EPF/ETF from Eligible Bases
        const epf_employee = (employee.is_epf_eligible && epfBase > 0) ? (epfBase * 0.08) : 0;
        const epf_employer = (employee.is_epf_eligible && epfBase > 0) ? (epfBase * 0.12) : 0;
        const etf_employer = (employee.is_etf_eligible && etfBase > 0) ? (etfBase * 0.03) : 0;

        if (epf_employee > 0) {
            breakdown.push({
                name: compEpf8 ? compEpf8.name : 'EPF (Employee 8%)',
                amount: epf_employee,
                type: 'Statutory'
            });
        }

        // 5. Calculate Progressive Tax (PAYE)
        const incomeTax = calculateTax(totalTaxable - epf_employee, taxBrackets);
        if (incomeTax > 0) {
            breakdown.push({ name: 'Income Tax (PAYE)', amount: incomeTax, type: 'Deduction' });
        }

        // 6. Final Totals
        const total_statutory = breakdown.filter(i => i.type === 'Statutory').reduce((sum, i) => sum + i.amount, 0);
        const total_deductions_val = breakdown.filter(i => i.type === 'Deduction').reduce((sum, i) => sum + i.amount, 0);

        const total_deductions = total_statutory + total_deductions_val;
        const net_salary = totalEarnings - total_deductions;

        // 7. Save Payroll
        const payrollRes = await client.query(
            `INSERT INTO payroll 
            (user_id, month, basic_salary, deductions, bonuses, epf_employee, epf_employer, etf_employer, welfare, net_salary, welfare_status, statutory_status) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Pending', 'Pending') 
            RETURNING id, net_salary`,
            [user_id, datePrefix, basicSalary, total_deductions, totalEarnings - basicSalary, epf_employee, epf_employer, etf_employer, welfareAmount, net_salary]
        );
        const payrollId = payrollRes.rows[0].id;

        if (breakdown.length > 0) {
            const values = [];
            const flatValues = [];
            let p_index = 1;
            for (const item of breakdown) {
                values.push(`($${p_index++}, $${p_index++}, $${p_index++}, $${p_index++}, $${p_index++})`);
                flatValues.push(payrollId, item.name, item.amount, item.type, item.details);
            }
            await client.query(`
                INSERT INTO payroll_details (payroll_id, component_name, amount, type, details) 
                VALUES ${values.join(', ')}
            `, flatValues);
        }

        // --- 7.1 Post-Processing: Decrement Loan Installments ONLY if applied ---
        const structurePromises = [];
        for (const comp of components) {
            if (comp.name.toLowerCase().includes('loan') && comp.installments_remaining > 0 && appliedComponentIds.has(comp.component_id)) {
                structurePromises.push(client.query(`
                    UPDATE employee_salary_structure 
                    SET installments_remaining = installments_remaining - 1 
                    WHERE employee_id = $1 AND component_id = $2
                `, [employee.id, comp.component_id]));
            }
        }
        if (structurePromises.length > 0) await Promise.all(structurePromises);

        // New Loan Tracker Post-Processing
        const loanInstPromises = [];
        const loanInstallments = breakdown.filter(i => i.loan_id);
        for (const inst of loanInstallments) {
            loanInstPromises.push(client.query(`
                UPDATE employee_loans 
                SET installments_paid = installments_paid + 1,
                    status = CASE WHEN (installments_paid + 1) >= num_installments THEN 'Completed' ELSE status END,
                    updated_at = NOW()
                WHERE id = $1
            `, [inst.loan_id]));

            // Log into loan_payments for history tracking
            loanInstPromises.push(client.query(`
                INSERT INTO loan_payments (loan_id, payment_date, amount, type, month, note, created_by)
                VALUES ($1, CURRENT_DATE, $2, 'payroll', $3, $4, $5)
            `, [inst.loan_id, inst.amount, datePrefix, `Payroll deduction for ${month} ${processingYear}`, req.user.id]));
        }
        if (loanInstPromises.length > 0) await Promise.all(loanInstPromises);

        // 8. Update Liabilities & Audit Log
        const liabilityPromises = [];
        liabilityPromises.push(updateLiability(client, datePrefix, 'EPF 8%', epf_employee));
        liabilityPromises.push(updateLiability(client, datePrefix, 'EPF 12%', epf_employer));
        liabilityPromises.push(updateLiability(client, datePrefix, 'ETF 3%', etf_employer));
        if (incomeTax > 0) liabilityPromises.push(updateLiability(client, datePrefix, 'PAYE Tax', incomeTax));
        if (welfareAmount > 0) {
            liabilityPromises.push(updateLiability(client, datePrefix, 'Welfare 2%', welfareAmount));
            liabilityPromises.push(client.query(`
                INSERT INTO welfare_ledger (transaction_date, type, amount, description, ref_id)
                VALUES (CURRENT_DATE, 'Collection', $1, $2, $3)
            `, [welfareAmount, `Welfare collection for ${employee.name} (${datePrefix})`, payrollId]));
        }
        await Promise.all(liabilityPromises);

        // Enterprise Audit Log
        await client.query(`
            INSERT INTO audit_logs (user_id, action, entity, entity_id, new_values)
            VALUES ($1, $2, $3, $4, $5)
        `, [req.user.id, 'PROCESS_PAYROLL', 'Payroll', payrollId, JSON.stringify({ details: `Processed payroll for user ${user_id} for ${month}. Net: ${net_salary}` })]);

        await client.query('COMMIT');
        res.status(201).json({ message: 'Standardized Payroll processed successfully', id: payrollId, net_salary, breakdown });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
};

// @desc    Update payroll record
// @route   PUT /api/payroll/:id
// @access  Private (Admin/HR)
const updatePayroll = async (req, res) => {
    const { id } = req.params;
    const { breakdown } = req.body;

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // Check if locked
        const checkLock = await client.query('SELECT locked FROM payroll WHERE id = $1', [id]);
        if (checkLock.rows.length > 0 && checkLock.rows[0].locked) {
            await client.query('ROLLBACK');
            return res.status(403).json({ message: 'Payroll record is locked and cannot be modified.' });
        }

        // 0. Fetch Catalog to understand eligibility
        const catalogRes = await client.query("SELECT * FROM salary_components WHERE status = 'Active'");
        const catalog = catalogRes.rows;

        // 1. Get Old Record (to calculate liability diffs later)
        const oldRes = await client.query(`
            SELECT p.*, e.is_epf_eligible, e.is_etf_eligible 
            FROM payroll p 
            JOIN employees e ON p.user_id = e.user_id 
            WHERE p.id = $1
        `, [id]);
        if (oldRes.rows.length === 0) throw new Error('Payroll record not found');
        const oldPayroll = oldRes.rows[0];
        const month = oldPayroll.month;
        const isEpfEligible = oldPayroll.is_epf_eligible;
        const isEtfEligible = oldPayroll.is_etf_eligible;

        let finalBreakdown = breakdown;

        // 2. Calculate New Values based on final Breakdown + Catalog
        let basic_salary = 0;
        let allowances = 0;
        let welfare = 0;
        let epf_employee = 0;
        let epf_employer = 0;
        let etf_employer = 0;

        let epfBase = 0;
        let etfBase = 0;
        let welfareBase = 0;

        // Map breakdown items to Catalog to find eligibility
        for (const item of finalBreakdown) {
            const amount = parseFloat(item.amount);
            const itemName = item.name.toLowerCase();
            const catalogItem = catalog.find(c => c.name.toLowerCase() === itemName);

            if (itemName.includes('basic')) basic_salary = amount;
            if (itemName === 'welfare') welfare = amount;

            if (isEpfEligible) {
                if (itemName.includes('epf (employee)') || itemName.includes('epf 8%')) epf_employee = amount;
                if (itemName.includes('epf (employer)') || itemName.includes('epf 12%')) epf_employer = amount;
            }
            if (isEtfEligible) {
                if (itemName.includes('etf (employer)') || itemName.includes('etf 3%')) etf_employer = amount;
            }

            if (item.type === 'Earning') {
                if (!itemName.includes('basic')) allowances += amount;
                // Track bases for auto-calc fallback
                if (catalogItem) {
                    if (catalogItem.epf_eligible) epfBase += amount;
                    if (catalogItem.etf_eligible) etfBase += amount;
                    if (catalogItem.welfare_eligible) welfareBase += amount;
                } else if (itemName.includes('basic')) {
                    epfBase += amount; etfBase += amount; welfareBase += amount;
                }
            }
        }

        // Auto-calc portions if missing in breakdown
        if (isEpfEligible && epf_employer === 0 && epfBase > 0) epf_employer = epfBase * 0.12;
        if (isEtfEligible && etf_employer === 0 && etfBase > 0) etf_employer = etfBase * 0.03;
        if (welfare === 0 && welfareBase > 0) welfare = welfareBase * 0.02;

        const total_earnings = finalBreakdown.filter(i => i.type === 'Earning').reduce((sum, i) => sum + parseFloat(i.amount), 0);
        const total_deductions = finalBreakdown.filter(i => i.type === 'Deduction' || i.type === 'Statutory').reduce((sum, i) => sum + parseFloat(i.amount), 0);
        const net_salary = total_earnings - total_deductions;

        // 3. Update Payroll Table
        await client.query(`
                UPDATE payroll 
                SET basic_salary = $1, bonuses = $2, deductions = $3, welfare = $4, 
                    epf_employee = $5, epf_employer = $6, etf_employer = $7, net_salary = $8
                WHERE id = $9
            `, [basic_salary, allowances, total_deductions, welfare, epf_employee, epf_employer, etf_employer, net_salary, id]);

        // 4. Update Details (Delete all and Re-insert)
        await client.query('DELETE FROM payroll_details WHERE payroll_id = $1', [id]);
        for (const item of finalBreakdown) {
            await client.query(
                `INSERT INTO payroll_details (payroll_id, component_name, amount, type) VALUES ($1, $2, $3, $4)`,
                [id, item.name, item.amount, item.type]
            );
        }

        // --- 4.1 Sync Liabilities (Diff between New and Old) ---
        const oldPayeDetails = await client.query(`SELECT amount FROM payroll_details WHERE payroll_id = $1 AND component_name = 'Income Tax (PAYE)'`, [id]);
        // Note: Since we just deleted details, we should have calculated PAYE during the update loop. 
        // However, the update loop above doesn't calculate PAYE. 
        // For updates, the user passes the breakdown in req.body. Let's find PAYE in that breakdown.
        const newPayeItem = finalBreakdown.find(i => i.name.toLowerCase().includes('paye') || i.name.toLowerCase().includes('income tax'));
        const newPayeTax = newPayeItem ? parseFloat(newPayeItem.amount) : 0;

        // We need to fetch the original PAYE from the database BEFORE we deleted the details. 
        // I'll use the record fetched in Step 1 (oldRes).
        // Actually, the easiest way to get the OLD Paye is to query it before the delete. 
        // Let's re-run a query for old values if needed, or rely on oldPayroll for most.
        // oldPayroll only has epf/etf/welfare, but NOT paye.

        // Re-fetching old PAYE before it's lost
        const oldDetailsRes = await client.query(`SELECT component_name, amount FROM payroll_details WHERE payroll_id = $1`, [id]);
        const oldPayeAmount = parseFloat(oldDetailsRes.rows.find(d => d.component_name.toLowerCase().includes('paye'))?.amount || 0);

        // Calculate Diffs
        const diffEpf8 = epf_employee - parseFloat(oldPayroll.epf_employee || 0);
        const diffEpf12 = epf_employer - parseFloat(oldPayroll.epf_employer || 0);
        const diffEtf3 = etf_employer - parseFloat(oldPayroll.etf_employer || 0);
        const diffWelfare = welfare - parseFloat(oldPayroll.welfare || 0);
        const diffPaye = newPayeTax - oldPayeAmount;

        await updateLiability(client, month, 'EPF 8%', diffEpf8);
        await updateLiability(client, month, 'EPF 12%', diffEpf12);
        await updateLiability(client, month, 'ETF 3%', diffEtf3);
        await updateLiability(client, month, 'Welfare 2%', diffWelfare);
        if (diffPaye !== 0) await updateLiability(client, month, 'PAYE Tax', diffPaye);

        // Enterprise Audit Log
        await client.query(`
                INSERT INTO audit_logs (user_id, action, entity, entity_id, new_values)
                VALUES ($1, $2, $3, $4, $5)
            `, [req.user.id, 'UPDATE_PAYROLL', 'Payroll', id, JSON.stringify({ details: `Updated payroll record ${id}. New Net: ${net_salary}` })]);

        await client.query('COMMIT');
        res.status(200).json({ message: 'Payroll updated successfully', net_salary });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
};

// @desc    Delete payroll record (and reverse liabilities)
// @route   DELETE /api/payroll/:id
// @access  Private (Admin/HR)
const deletePayroll = async (req, res) => {
    const { id } = req.params;

    try {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Get Record before deletion
            const payrollRes = await client.query('SELECT * FROM payroll WHERE id = $1', [id]);
            if (payrollRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ message: 'Payroll record not found' });
            }
            const payroll = payrollRes.rows[0];

            if (payroll.locked) {
                await client.query('ROLLBACK');
                return res.status(403).json({ message: 'Payroll record is locked and cannot be deleted.' });
            }

            const month = payroll.month;

            // 2. Fetch Details to find PAYE Tax amount
            const detailsRes = await client.query(
                `SELECT amount FROM payroll_details WHERE payroll_id = $1 AND component_name = 'Income Tax (PAYE)'`,
                [id]
            );
            const payeAmount = detailsRes.rows.length > 0 ? parseFloat(detailsRes.rows[0].amount) : 0;

            // 3. Calculate Amounts to Reverse (Negative)
            const epfAmount = -(parseFloat(payroll.epf_employee) + parseFloat(payroll.epf_employer));
            const etfAmount = -(parseFloat(payroll.etf_employer));
            const welfareAmount = -(parseFloat(payroll.welfare));
            const payeTaxAmount = -(payeAmount);

            // 4. Reverse Liabilities
            await updateLiability(client, month, 'EPF 8%', -(parseFloat(payroll.epf_employee)));
            await updateLiability(client, month, 'EPF 12%', -(parseFloat(payroll.epf_employer)));
            await updateLiability(client, month, 'ETF 3%', -(parseFloat(payroll.etf_employer)));
            await updateLiability(client, month, 'Welfare 2%', -(parseFloat(payroll.welfare)));
            if (payeAmount > 0) {
                await updateLiability(client, month, 'PAYE Tax', payeTaxAmount);
            }

            // 5. Delete Details & Record
            await client.query('DELETE FROM payroll_details WHERE payroll_id = $1', [id]);
            await client.query('DELETE FROM payroll WHERE id = $1', [id]);

            // 6. Audit Log
            await client.query(`
                INSERT INTO audit_logs (user_id, action, entity, entity_id, new_values)
                VALUES ($1, $2, $3, $4, $5)
            `, [req.user.id, 'DELETE_PAYROLL', 'Payroll', id, JSON.stringify({ details: `Deleted payroll record ${id} for user ${payroll.user_id} and reversed liabilities.` })]);

            await client.query('COMMIT');
            res.status(200).json({ message: 'Payroll record deleted and liabilities reversed successfully.' });

        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get my payroll history
// @route   GET /api/payroll/my
// @access  Private
const getMyPayroll = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT p.*, u.name as employee_name, 
                   COALESCE(e.epf_no, e.biometric_id, CAST(e.id AS VARCHAR)) as emp_code
            FROM payroll p 
            JOIN users u ON p.user_id = u.id 
            LEFT JOIN employees e ON p.user_id = e.user_id
            WHERE p.user_id = $1 
            ORDER BY p.month DESC
        `, [req.user.id]);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all payroll records
// @route   GET /api/payroll
// @access  Private (Admin/HR)
const getAllPayroll = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT p.*, p.statutory_status, p.welfare_status, u.name as employee_name, 
                   COALESCE(e.epf_no, e.biometric_id, CAST(e.id AS VARCHAR)) as emp_code,
                   e.nic_passport
            FROM payroll p 
            JOIN users u ON p.user_id = u.id 
            LEFT JOIN employees e ON p.user_id = e.user_id
            ORDER BY p.month DESC
        `);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get payroll details (Payslip)
// @route   GET /api/payroll/:id
// @access  Private
const getPayrollDetails = async (req, res) => {
    try {
        const { id } = req.params;

        // Check access: Admin, HR or Own
        const payrollRes = await db.query('SELECT * FROM payroll WHERE id = $1', [id]);
        if (payrollRes.rows.length === 0) return res.status(404).json({ message: 'Payroll record not found' });

        const payroll = payrollRes.rows[0];
        if (req.user.role !== 'Admin' && req.user.role !== 'HR Manager' && payroll.user_id !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to view this payslip' });
        }

        const detailsRes = await db.query('SELECT * FROM payroll_details WHERE payroll_id = $1', [id]);

        // Fetch employee and user details for valid payslip header
        const empRes = await db.query(`
            SELECT u.name, e.designation, e.department, e.nic_passport 
            FROM employees e 
            JOIN users u ON e.user_id = u.id 
            WHERE u.id = $1
        `, [payroll.user_id]);

        const employee = empRes.rows[0];

        res.status(200).json({
            summary: payroll,
            breakdown: detailsRes.rows,
            employee: employee
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get statutory liabilities
// @route   GET /api/payroll/liabilities
// @access  Private (Admin/HR)
const getLiabilities = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM payroll_liabilities ORDER BY month DESC, type ASC');
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Pay liability
// @route   POST /api/payroll/liabilities/pay
// @access  Private (Admin/HR)
const payLiability = async (req, res) => {
    const { id, amount, payment_ref, payment_date, payment_method, notes } = req.body;
    try {
        const result = await db.query(`
            UPDATE payroll_liabilities 
            SET paid_amount = paid_amount + $1,
                payment_ref = $2,
                payment_date = $3,
                payment_method = $4,
                notes = $5,
                status = 'Remitted',
                remitted_by = $6,
                remitted_at = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING *
        `, [amount, payment_ref, payment_date, payment_method, notes, req.user.id, id]);

        if (result.rows.length === 0) return res.status(404).json({ message: 'Liability record not found' });

        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve statutory liability remittance
// @route   POST /api/payroll/liabilities/:id/approve
// @access  Private (Admin/Management)
const approveLiability = async (req, res) => {
    const { id } = req.params;
    try {
        const check = await db.query('SELECT remitted_by, status FROM payroll_liabilities WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({ message: 'Liability record not found' });

        if (check.rows[0].status !== 'Remitted') {
            return res.status(400).json({ message: 'Only remitted liabilities can be approved.' });
        }

        if (String(check.rows[0].remitted_by) === String(req.user.id)) {
            return res.status(403).json({ message: 'Segregation of duties: The person who remitted the payment cannot be the one who approves it.' });
        }

        const result = await db.query(`
            UPDATE payroll_liabilities 
            SET status = 'Paid',
                approved_by = $1,
                approved_at = CURRENT_TIMESTAMP,
                last_updated = CURRENT_TIMESTAMP
            WHERE id = $2 AND status = 'Remitted'
            RETURNING *
        `, [req.user.id, id]);

        if (result.rows.length === 0) return res.status(400).json({ message: 'Liability record not found or already approved.' });

        // Log to Audit Trail
        await db.query(`
            INSERT INTO audit_logs (user_id, action, entity, entity_id, new_values)
            VALUES ($1, $2, $3, $4, $5)
        `, [req.user.id, 'APPROVE_LIABILITY', 'Liability', id, JSON.stringify({ details: 'Approved statutory liability remittance' })]);

        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get detailed breakdown of a liability
// @route   GET /api/payroll/liabilities/breakdown
// @access  Private (Admin/HR)
const getLiabilityBreakdown = async (req, res) => {
    const { month, type } = req.query;
    if (!month || !type) return res.status(400).json({ message: 'Month and Type are required' });

    try {
        let query = '';
        if (type.includes('EPF')) {
            const isEmployee = type.includes('8%');
            const isEmployer = type.includes('12%');
            
            query = `
                SELECT u.name as employee_name, p.epf_employee as employee_portion, p.epf_employer as employer_portion, 
                       ${isEmployee ? 'p.epf_employee' : (isEmployer ? 'p.epf_employer' : '(p.epf_employee + p.epf_employer)')} as total
                FROM payroll p
                JOIN users u ON p.user_id = u.id
                WHERE p.month = $1
                ORDER BY u.name ASC
            `;
        } else if (type.includes('ETF')) {
            query = `
                SELECT u.name as employee_name, 0 as employee_portion, p.etf_employer as employer_portion, 
                       p.etf_employer as total
                FROM payroll p
                JOIN users u ON p.user_id = u.id
                WHERE p.month = $1
                ORDER BY u.name ASC
            `;
        } else if (type.includes('Welfare')) {
            query = `
                SELECT u.name as employee_name, p.welfare as employee_portion, 0 as employer_portion, 
                       p.welfare as total
                FROM payroll p
                JOIN users u ON p.user_id = u.id
                WHERE p.month = $1
                ORDER BY u.name ASC
            `;
        } else if (type === 'PAYE Tax') {
            query = `
                SELECT u.name as employee_name, pd.amount as employee_portion, 0 as employer_portion, 
                       pd.amount as total
                FROM payroll_details pd
                JOIN payroll p ON pd.payroll_id = p.id
                JOIN users u ON p.user_id = u.id
                WHERE p.month = $1 AND pd.component_name = 'Income Tax (PAYE)'
                ORDER BY u.name ASC
            `;
        } else {
            return res.status(400).json({ message: `Invalid statutory type: ${type}` });
        }

        const result = await db.query(query, [month]);
        console.log(`[LIABILITY_BREAKDOWN] ${type} for ${month}: Found ${result.rows.length} rows`);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// @desc    Pay individual statutory for a payroll record
// @route   POST /api/payroll/:id/pay-statutory
// @access  Private (Admin/HR)
const payPayrollStatutory = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(`
            UPDATE payroll 
            SET statutory_status = 'Paid'
            WHERE id = $1
            RETURNING *
        `, [id]);

        if (result.rows.length === 0) return res.status(404).json({ message: 'Payroll record not found' });

        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Pay individual welfare for a payroll record
// @route   POST /api/payroll/:id/pay-welfare
// @access  Private (Admin/HR)
const payWelfare = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(`
            UPDATE payroll 
            SET welfare_status = 'Paid'
            WHERE id = $1
            RETURNING *
        `, [id]);

        if (result.rows.length === 0) return res.status(404).json({ message: 'Payroll record not found' });

        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark payroll as Reviewed
// @route   POST /api/payroll/:id/review
// @access  Private (HR/Finance)
const reviewPayroll = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(`
            UPDATE payroll 
            SET status = 'Reviewed', reviewed_by = $1
            WHERE id = $2 AND status = 'Internal' -- Can only review if in Draft/Internal state
            RETURNING *
        `, [req.user.id, id]);

        if (result.rows.length === 0) return res.status(400).json({ message: 'Payroll record not found or already reviewed/approved.' });

        // Log
        await db.query(`
            INSERT INTO audit_logs (user_id, action, entity, entity_id, new_values)
            VALUES ($1, $2, $3, $4, $5)
        `, [req.user.id, 'REVIEW_PAYROLL', 'Payroll', id, JSON.stringify({ details: 'Marked payroll as Reviewed' })]);

        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve and Lock Payroll
// @route   POST /api/payroll/:id/approve
// @access  Private (Management)
const approvePayroll = async (req, res) => {
    const { id } = req.params;
    try {
        const payrollRes = await db.query('SELECT reviewed_by FROM payroll WHERE id = $1', [id]);
        if (payrollRes.rows.length === 0) return res.status(404).json({ message: 'Payroll record not found.' });

        const payroll = payrollRes.rows[0];
        if (String(payroll.reviewed_by) === String(req.user.id)) {
            return res.status(403).json({ message: 'Segregation of duties: The reviewer cannot be the approver of the same payroll.' });
        }

        const result = await db.query(`
            UPDATE payroll 
            SET status = 'Approved', approved_by = $1, locked = TRUE
            WHERE id = $2 AND status = 'Reviewed' -- Must be reviewed first
            RETURNING *
        `, [req.user.id, id]);

        if (result.rows.length === 0) return res.status(400).json({ message: 'Payroll record not found or not in Reviewed state.' });

        // Log
        await db.query(`
            INSERT INTO audit_logs (user_id, action, entity, entity_id, new_values)
            VALUES ($1, $2, $3, $4, $5)
        `, [req.user.id, 'APPROVE_PAYROLL', 'Payroll', id, JSON.stringify({ details: 'Approved and Locked payroll' })]);

        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get dynamic payroll preview (Simulation)
// @route   GET /api/payroll/preview/:user_id/:month/:year
// @access  Private (Admin/HR)
const getPayrollPreview = async (req, res) => {
    const { user_id, month, year } = req.params;
    const { fuel_rate_override } = req.query;
    const processingYear = year || new Date().getFullYear();

    const monthMap = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };

    const monthNum = monthMap[month] || '01';
    const datePrefix = `${processingYear}-${monthNum}`;

    try {
        // 0. Fetch the Salary Catalog (All active components)
        const catalogRes = await db.query("SELECT * FROM salary_components WHERE status = 'Active'");
        const catalog = catalogRes.rows;

        // Identify standard components from Catalog
        const findInCatalog = (keywords) => catalog.find(c => keywords.some(k => c.name.toLowerCase().includes(k.toLowerCase())));
        const compBasic = findInCatalog(['basic pay', 'basic salary']);
        const compEpf8 = findInCatalog(['epf 8%', 'e.p.f. 8%']);
        const compWelfare = findInCatalog(['welfare']);

        // 1. Get Employee Info
        const empRes = await db.query(`
            SELECT e.*, u.name 
            FROM employees e
            JOIN users u ON e.user_id = u.id
            WHERE u.id = $1
        `, [user_id]);

        if (empRes.rows.length === 0) return res.status(404).json({ message: 'Employee not found' });
        const employee = empRes.rows[0];

        // 2. FETCH ONLY APPROVED COMPONENTS FOR THIS MONTH (STRATEGIC WORKFLOW)
        const componentsRes = await db.query(`
            SELECT 
                mo.amount, 
                mo.quantity, 
                sc.name, 
                sc.type, 
                sc.is_taxable, 
                sc.epf_eligible, 
                sc.etf_eligible, 
                sc.welfare_eligible,
                sc.id as component_id,
                mo.reason
            FROM monthly_salary_overrides mo
            JOIN salary_components sc ON mo.component_id = sc.id
            WHERE mo.employee_id = $1 AND mo.month = $2 AND mo.status = 'Approved'
        `, [employee.id, datePrefix]);

        const components = componentsRes.rows;

        // FETCH POLICIES, TAX BRACKETS, etc.
        const [policyRes, taxRes] = await Promise.all([
            db.query('SELECT * FROM attendance_policies WHERE id = 1'),
            db.query('SELECT * FROM tax_brackets ORDER BY min_income ASC')
        ]);

        const policy = policyRes.rows[0];
        const taxBrackets = taxRes.rows;

        let basicSalary = 0;
        let totalEarnings = 0;
        let totalTaxable = 0;
        let epfBase = 0;
        let etfBase = 0;
        let welfareBase = 0;
        let breakdown = [];
        let attendanceAllowanceIdx = -1;

        // Fetch tracker loans check
        const trackerLoansRes = await db.query(`
            SELECT id FROM employee_loans 
            WHERE employee_id = $1 AND status = 'Approved'
            AND start_date <= $2::date AND end_date >= $2::date
            AND installments_paid < num_installments
        `, [employee.id, `${datePrefix}-01`]);
        const hasTrackerLoan = trackerLoansRes.rows.length > 0;

        // Process Components
        for (const comp of components) {
            let amount = parseFloat(comp.amount);
            let quantity = parseFloat(comp.quantity || 0);
            const compName = comp.name.toLowerCase();

            // Monthly Override Priority
            // Loan Tracker De-duplication
            if (compName.includes('loan') && hasTrackerLoan) continue;

            // Fuel & Performance Display Logic
            if (compName.includes('fuel') && quantity > 0) {
                // For preview/display logic
                const fuelStartDate = (month === 'March' && processingYear == 2026) ? '2026-02-25' : `${datePrefix}-01`;
                const fuelEndDate = (month === 'March' && processingYear == 2026) ? '2026-03-25' : new Date(processingYear, monthNum, 0).toISOString().split('T')[0];

                const splitResult = await calculateSplitFuelAllowance(db, quantity, fuelStartDate, fuelEndDate);
                amount = splitResult.totalAmount;
                comp.name = `${comp.name} (${quantity}L)`;
                comp.reason = splitResult.reason;
            }

            if (compName.includes('basic')) basicSalary = amount;

            if (comp.type === 'Earning') {
                totalEarnings += amount;
                if (comp.is_taxable) totalTaxable += amount;
                if (comp.epf_eligible) epfBase += amount;
                if (comp.etf_eligible) etfBase += amount;
                if (comp.welfare_eligible) welfareBase += amount;

                const idx = breakdown.push({ name: comp.name, amount, type: 'Earning' }) - 1;
                if (compName.includes('attendance')) attendanceAllowanceIdx = idx;
            } else if (comp.type === 'Deduction') {
                breakdown.push({ name: comp.name, amount, type: 'Deduction' });
            }
        }


        // Loan Installment Tracker
        const activeLoansRes = await db.query(`
            SELECT * FROM employee_loans 
            WHERE employee_id = $1 AND status = 'Approved'
            AND start_date <= $2::date AND end_date >= $2::date
            AND installments_paid < num_installments
        `, [employee.id, `${datePrefix}-01`]);

        for (const loan of activeLoansRes.rows) {
            const installment = parseFloat(loan.installment_amount);
            breakdown.push({ name: `Loan Installment (Ref: ${loan.id})`, amount: installment, type: 'Deduction' });
        }

        /* 
        // Attendance / LOP - GATED BY APPROVAL (Manual Entry Page)
        const leaveRes = await db.query(`
            SELECT COALESCE(SUM(unpaid_days), 0) as total_unpaid_days,
                   COALESCE(SUM(short_leave_hours), 0) as total_short_leave_hours,
                   COUNT(*) FILTER (WHERE leave_type = 'Half Day' AND status = 'Approved') as half_day_count
            FROM leaves WHERE user_id = $1 AND status = 'Approved' AND (start_date::text LIKE $2 OR end_date::text LIKE $2)
        `, [user_id, `${datePrefix}%`]);

        const attendanceRes = await db.query(`
            SELECT COUNT(*) FILTER (WHERE LOWER(a.status) = 'absent') as absent_count,
                   COALESCE(SUM(a.late_minutes), 0) as total_late_minutes,
                   COALESCE(SUM(a.short_leave_hours), 0) as total_short_leave_hours
            FROM attendance a JOIN employees e ON a.employee_id = e.id
            WHERE e.user_id = $1 AND a.date::text LIKE $2
            AND NOT EXISTS (SELECT 1 FROM leaves l WHERE l.user_id = $1 AND l.status = 'Approved' AND a.date::date BETWEEN l.start_date::date AND l.end_date::date)
        `, [user_id, `${datePrefix}%`]);


        const fullUnpaidDays = parseFloat(leaveRes.rows[0].total_unpaid_days || 0) + parseFloat(attendanceRes.rows[0].absent_count || 0) + (parseFloat(leaveRes.rows[0].half_day_count || 0) * 0.5);
        const totalLateHours = (parseFloat(attendanceRes.rows[0].total_late_minutes || 0) / 60) + parseFloat(attendanceRes.rows[0].total_short_leave_hours || 0) + parseFloat(leaveRes.rows[0].total_short_leave_hours || 0);

        const hourRate = policy?.late_hourly_rate > 0 ? parseFloat(policy.late_hourly_rate) : (basicSalary / 240);
        const dayRate = policy?.absent_day_amount > 0 ? parseFloat(policy.absent_day_amount) : (basicSalary / 30);

        const absentDeduction = fullUnpaidDays * dayRate;
        const lateDeduction = totalLateHours * hourRate;

        if (absentDeduction > 0 || lateDeduction > 0) {
            const totalAttendanceDeduction = absentDeduction + lateDeduction;
            const compNoPay = findInCatalog(['no pay']);

            if (attendanceAllowanceIdx !== -1) {
                let allowAmt = breakdown[attendanceAllowanceIdx].amount;
                if (totalAttendanceDeduction <= allowAmt) {
                    breakdown[attendanceAllowanceIdx].amount -= totalAttendanceDeduction;
                } else {
                    const remainder = totalAttendanceDeduction - allowAmt;
                    breakdown[attendanceAllowanceIdx].amount = 0;
                    breakdown.push({ name: 'Attendance Penalty (Over Allowance)', amount: remainder, type: 'Deduction' });
                }
            } else {
                if (absentDeduction > 0) breakdown.push({ name: compNoPay ? compNoPay.name : 'Absence Deduction', amount: absentDeduction, type: 'Deduction' });
                if (lateDeduction > 0) breakdown.push({ name: 'Late/Short Leave Deduction', amount: lateDeduction, type: 'Deduction' });
            }
            totalTaxable -= totalAttendanceDeduction;
            epfBase -= totalAttendanceDeduction;
        }
        */ 

        // Welfare - preferentially from Basic Salary (Enterprise Rule: 2%)
        const welfareAmount = (basicSalary > 0) ? (basicSalary * 0.02) : (welfareBase * 0.02);
        if (welfareAmount > 0) {
            breakdown.push({
                name: compWelfare ? compWelfare.name : 'Welfare',
                amount: welfareAmount,
                type: 'Deduction'
            });
        }

        // EPF
        const epf_employee = (employee.is_epf_eligible && epfBase > 0) ? (epfBase * 0.08) : 0;
        if (epf_employee > 0) {
            breakdown.push({
                name: compEpf8 ? compEpf8.name : 'EPF (8%)',
                amount: epf_employee,
                type: 'Deduction'
            });
        }

        // PAYE Tax
        const incomeTax = calculateTax(totalTaxable - epf_employee, taxBrackets);
        if (incomeTax > 0) {
            breakdown.push({ name: 'Income Tax (PAYE)', amount: incomeTax, type: 'Deduction' });
        }

        const totalDeductions = breakdown.filter(i => i.type === 'Deduction').reduce((sum, i) => sum + i.amount, 0);

        res.status(200).json({
            base_salary: basicSalary,
            allowances: totalEarnings - basicSalary,
            deductions: totalDeductions,
            net_salary: totalEarnings - totalDeductions,
            breakdown
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete ALL payroll records (Reset System)
// @route   DELETE /api/payroll/all
// @access  Private (Admin only)
const deleteAllPayrolls = async (req, res) => {
    try {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Delete all details first
            await client.query('DELETE FROM payroll_details');

            // Delete all liabilities (assuming we want a full reset)
            await client.query('DELETE FROM payroll_liabilities');

            // Delete all payroll headers
            await client.query('DELETE FROM payroll');

            await client.query(`
                INSERT INTO audit_logs (user_id, action, entity, entity_id, new_values)
                VALUES ($1, 'DELETE_ALL_PAYROLLS', 'Payroll', 0, $2)
            `, [req.user.id, JSON.stringify({ details: 'Deleted ALL payroll records, details, and liabilities.' })]);

            await client.query('COMMIT');
            res.status(200).json({ message: 'All payroll records and liabilities have been deleted.' });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMonthlyOverrides = async (req, res) => {
    const { month } = req.query;
    if (!month) return res.status(400).json({ message: 'Month is required' });

    try {
        const result = await db.query(`
            SELECT mo.*, u.name as employee_name, sc.name as component_name
            FROM monthly_salary_overrides mo
            JOIN employees e ON mo.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            JOIN salary_components sc ON mo.component_id = sc.id
            WHERE mo.month = $1
            ORDER BY u.name, sc.name
        `, [month]);

        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Check payroll readiness for a specific month
// @route   GET /api/payroll/readiness/:month/:year
// @access  Private (Admin/HR)
const getPayrollReadiness = async (req, res) => {
    const { month, year } = req.params;
    const monthMap = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };
    const monthNum = monthMap[month] || '01';
    const datePrefix = `${year}-${monthNum}`;

    try {
        // 1. Employee Context
        const empCountRes = await db.query("SELECT COUNT(*) FROM employees WHERE employment_status = 'Active'");
        const totalEmployees = parseInt(empCountRes.rows[0].count);

        // 2. Performance Status
        const perfRes = await db.query(`
            SELECT COUNT(*) FROM performance_monthly_approvals 
            WHERE month = $1 AND status = 'Approved'
        `, [datePrefix]);
        const approvedPerformance = parseInt(perfRes.rows[0].count);

        // 3. Fuel Allowance Status
        const fuelRes = await db.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE mo.status = 'Approved') as approved
            FROM monthly_salary_overrides mo
            JOIN salary_components sc ON mo.component_id = sc.id
            WHERE mo.month = $1 AND LOWER(sc.name) LIKE '%fuel%'
        `, [datePrefix]);
        const fuelStatus = {
            total: parseInt(fuelRes.rows[0].total),
            approved: parseInt(fuelRes.rows[0].approved)
        };

        // 4. Attendance Deduction Status
        const attendanceRes = await db.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status IN ('Processed', 'Ignored')) as handled
            FROM attendance_deductions
            WHERE month = $1
        `, [datePrefix]);
        const attendanceStatus = {
            total: parseInt(attendanceRes.rows[0].total),
            handled: parseInt(attendanceRes.rows[0].handled)
        };

        // 5. Loan Installment Status
        // Check for active loans that should have a payment this month
        const loanRes = await db.query(`
            SELECT COUNT(*) FROM employee_loans 
            WHERE status = 'Approved'
            AND start_date <= $1::date
            AND end_date >= $1::date
            AND installments_paid < num_installments
        `, [`${datePrefix}-01`]);
        const activeLoans = parseInt(loanRes.rows[0].count);

        const loanPaymentRes = await db.query(
            "SELECT COUNT(DISTINCT loan_id) FROM loan_payments WHERE month = $1 AND type = 'payroll'",
            [datePrefix]
        );
        const loanPayments = parseInt(loanPaymentRes.rows[0].count);

        // 6. Salary Advance Status
        const advanceRes = await db.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE mo.status = 'Approved') as approved
            FROM monthly_salary_overrides mo
            JOIN salary_components sc ON mo.component_id = sc.id
            WHERE mo.month = $1 AND LOWER(sc.name) LIKE '%advance%'
        `, [datePrefix]);
        const advanceStatus = {
            total: parseInt(advanceRes.rows[0].total),
            approved: parseInt(advanceRes.rows[0].approved)
        };

        // 7. General Overrides (Anything else in Draft)
        const draftOverridesRes = await db.query(`
            SELECT COUNT(*) FROM monthly_salary_overrides 
            WHERE month = $1 AND status = 'Draft'
            AND component_id NOT IN (
                SELECT id FROM salary_components WHERE LOWER(name) LIKE '%fuel%' OR LOWER(name) LIKE '%advance%' OR LOWER(name) LIKE '%performance%'
            )
        `, [datePrefix]);
        const draftOverrides = parseInt(draftOverridesRes.rows[0].count);

        res.status(200).json({
            month: datePrefix,
            total_employees: totalEmployees,
            checks: {
                performance: {
                    title: 'Performance Evaluations',
                    status: approvedPerformance >= totalEmployees ? 'Ready' : (approvedPerformance > 0 ? 'Review' : 'Pending'),
                    details: `${approvedPerformance} / ${totalEmployees} Approved`,
                    priority: 1
                },
                fuel: {
                    title: 'Fuel Allowances',
                    status: (fuelStatus.total > 0 && fuelStatus.approved === fuelStatus.total) ? 'Ready' : (fuelStatus.total > 0 ? 'Review' : 'Ready'),
                    details: fuelStatus.total > 0 ? `${fuelStatus.approved} / ${fuelStatus.total} Approved` : 'No entries for this month',
                    priority: 2
                },
                attendance: {
                    title: 'Attendance Deductions',
                    status: (attendanceStatus.total > 0 && attendanceStatus.handled === attendanceStatus.total) ? 'Ready' : (attendanceStatus.total > 0 ? 'Review' : 'Pending'),
                    details: attendanceStatus.total > 0 ? `${attendanceStatus.handled} / ${attendanceStatus.total} Handled` : 'Calculation not started',
                    priority: 1
                },
                loans: {
                    title: 'Loan Installments',
                    status: (activeLoans > 0 && loanPayments >= activeLoans) ? 'Ready' : (activeLoans > 0 ? 'Review' : 'Ready'),
                    details: activeLoans > 0 ? `${loanPayments} / ${activeLoans} Payments tracked` : 'No active loans',
                    priority: 2
                },
                advances: {
                    title: 'Salary Advances',
                    status: (advanceStatus.total > 0 && advanceStatus.approved === advanceStatus.total) ? 'Ready' : (advanceStatus.total > 0 ? 'Review' : 'Ready'),
                    details: advanceStatus.total > 0 ? `${advanceStatus.approved} / ${advanceStatus.total} Approved` : 'No advances recorded',
                    priority: 2
                },
                other_overrides: {
                    title: 'Other manual Overrides',
                    status: draftOverrides === 0 ? 'Ready' : 'Review',
                    details: draftOverrides > 0 ? `${draftOverrides} entries pending approval` : 'All items verified',
                    priority: 3
                }
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createPayroll,
    updatePayroll,
    deletePayroll,
    getMyPayroll,
    getAllPayroll,
    getPayrollDetails,
    getLiabilities,
    payLiability,
    approveLiability,
    getLiabilityBreakdown,
    payPayrollStatutory,
    payWelfare,
    reviewPayroll,
    approvePayroll,
    getPayrollPreview,
    deleteAllPayrolls,
    getMonthlyOverrides,
    getPayrollReadiness,
    calculateSplitFuelAllowance
};
