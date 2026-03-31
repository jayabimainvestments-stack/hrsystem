const db = require('../config/db');
const { reconcileLeaveBalance, reverseReclaimedBalance } = require('../services/attendance.service');

// @desc    Get all pending approval requests
// @route   GET /api/governance/pending
// @access  Private (Admin/HR Manager)
const getPendingChanges = async (req, res) => {
    try {
        console.log('--- getPendingChanges CALLED ---');

        const genericChanges = await db.query(`
            SELECT p.*, u.name as requester_name, 
                   CASE 
                     WHEN p.entity = 'attendance' THEN 'ATTENDANCE' 
                     WHEN p.entity = 'employees' OR p.entity = 'users' THEN 'PROFILE'
                     WHEN p.entity = 'employee_bank_details' THEN 'BANK'
                     ELSE 'SALARY' 
                   END as type,
                   COALESCE(tu.name, bank_u.name, att_u.name, fallback_u.name) as target_name
            FROM pending_changes p
            LEFT JOIN users u ON p.requested_by = u.id
            
            -- 1. Link to target employee (Salary/General/Structure) - entity_id is employee_id OR user_id
            LEFT JOIN employees te ON (p.entity IN ('employee_salary_structure', 'salary_structures', 'employees', 'financial_requests')) 
                                   AND te.id::text = p.entity_id
            LEFT JOIN users tu ON te.user_id = tu.id
            
            -- 2. Link to target user directly (Bank Details / User records) - entity_id is user_id
            LEFT JOIN users bank_u ON (p.entity = 'employee_bank_details' OR p.entity = 'users') 
                                   AND bank_u.id::text = p.entity_id
            
            -- 3. Link to attendance -> employee -> user - entity_id is attendance_id (UUID)
            LEFT JOIN attendance att ON p.entity = 'attendance' AND att.id::text = p.entity_id
            LEFT JOIN employees att_e ON att.employee_id = att_e.id
            LEFT JOIN users att_u ON att_e.user_id = att_u.id
            
            -- 4. Fallback: if it's a numeric ID but not caught above
            LEFT JOIN users fallback_u ON (tu.id IS NULL AND bank_u.id IS NULL AND att_u.id IS NULL)
                                      AND p.entity_id ~ '^[0-9]+$'
                                      AND fallback_u.id::text = p.entity_id
            
            WHERE p.status = 'Pending'
        `);

        // 2. Leave Requests
        const leaveRequests = await db.query(`
            SELECT 
                l.id, 'LEAVE' as type, l.user_id as entity_id, l.leave_type as field_name,
                NULL as old_value,
                json_build_object('start_date', l.start_date, 'end_date', l.end_date, 'no_of_days', l.no_of_days, 'reason', l.reason, 'is_unpaid', l.is_unpaid) as new_value,
                l.user_id as requested_by, l.reason, l.status,
                u.name as requester_name, u.name as target_name, l.created_at as updated_at
            FROM leaves l
            LEFT JOIN users u ON l.user_id = u.id
            WHERE l.status = 'Pending'
        `);

        // 3. Loan Requests
        const loanRequests = await db.query(`
            SELECT 
                l.id, 'LOAN' as type, l.employee_id as entity_id, 'LOAN_APPLICATION' as field_name,
                NULL as old_value,
                json_build_object('total_amount', l.total_amount, 'num_installments', l.num_installments, 'installment_amount', l.installment_amount) as new_value,
                l.requested_by, NULL as reason, l.status,
                ru.name as requester_name, tu.name as target_name, l.created_at as updated_at
            FROM employee_loans l
            JOIN employees e ON l.employee_id = e.id
            JOIN users tu ON e.user_id = tu.id
            LEFT JOIN users ru ON l.requested_by = ru.id
            WHERE l.status = 'Pending'
        `);

        // 4. Financial Requests — include target employee name from data JSON
        const financialRequests = await db.query(`
            SELECT 
                f.id, 'FINANCIAL' as type, f.data as new_value, f.requested_by, f.created_at as updated_at,
                u.name as requester_name, f.status, f.type as field_name, f.month,
                (
                    SELECT eu.name 
                    FROM employees ee 
                    JOIN users eu ON ee.user_id = eu.id 
                    WHERE ee.id = (f.data->0->>'employee_id')::int
                    LIMIT 1
                ) as target_name
            FROM financial_requests f
            LEFT JOIN users u ON f.requested_by = u.id
            WHERE f.status = 'Pending'
        `);

        // 5. Resignations
        const resignationRequests = await db.query(`
            SELECT 
                r.id, 'RESIGNATION' as type, r.employee_id as entity_id, 'RESIGNATION_NOTICE' as field_name,
                NULL as old_value,
                json_build_object('reason', r.reason, 'notice_date', r.submitted_date, 'last_working_day', r.desired_last_day) as new_value,
                u.id as requested_by, r.reason, r.status,
                u.name as requester_name, u.name as target_name, r.created_at as updated_at
            FROM resignations r
            JOIN employees e ON r.employee_id = e.id
            LEFT JOIN users u ON e.user_id = u.id
            WHERE r.status = 'Pending'
        `);

        // 6. Performance Overrides (Draft status)
        const performanceOverrides = await db.query(`
            SELECT 
                mo.id, 'PERFORMANCE' as type, mo.employee_id as entity_id, 'Monthly Performance Marks' as field_name,
                NULL as old_value,
                json_build_object('amount', mo.amount, 'reason', mo.reason, 'month', mo.month) as new_value,
                NULL as requested_by, -- System generated or bulk action
                mo.reason, 'Pending' as status,
                'System' as requester_name, tu.name as target_name, mo.created_at as updated_at
            FROM monthly_salary_overrides mo
            JOIN employees e ON mo.employee_id = e.id
            JOIN users tu ON e.user_id = tu.id
            WHERE mo.status = 'Draft' AND (mo.reason ILIKE '%performance%' OR mo.component_id IN (SELECT id FROM salary_components WHERE name ILIKE '%performance%'))
        `);

        // 7. Manual Loan Payments (Pending approval)
        const loanPaymentRequests = await db.query(`
            SELECT
                lp.id, 'LOAN_PAYMENT' as type, lp.loan_id as entity_id, 'MANUAL_LOAN_PAYMENT' as field_name,
                NULL as old_value,
                json_build_object(
                    'amount', lp.amount,
                    'payment_date', lp.payment_date,
                    'note', lp.note,
                    'loan_id', lp.loan_id,
                    'total_loan', el.total_amount,
                    'installment_amount', el.installment_amount,
                    'installments_paid', el.installments_paid,
                    'num_installments', el.num_installments
                ) as new_value,
                lp.created_by as requested_by, lp.note as reason, lp.status,
                cu.name as requester_name, eu.name as target_name, lp.created_at as updated_at
            FROM loan_payments lp
            JOIN employee_loans el ON lp.loan_id = el.id
            JOIN employees emp ON el.employee_id = emp.id
            JOIN users eu ON emp.user_id = eu.id
            LEFT JOIN users cu ON lp.created_by = cu.id
            WHERE lp.status = 'Pending' AND lp.type = 'manual'
        `);

        const allChanges = [
            ...(genericChanges.rows || []),
            ...(leaveRequests.rows || []),
            ...(loanRequests.rows || []),
            ...(financialRequests.rows || []),
            ...(resignationRequests.rows || []),
            ...(performanceOverrides.rows || []),
            ...(loanPaymentRequests.rows || [])
        ].sort((a, b) => {
            const dateA = a.updated_at ? new Date(a.updated_at) : 0;
            const dateB = b.updated_at ? new Date(b.updated_at) : 0;
            return dateB - dateA;
        });

        res.status(200).json(allChanges);
    } catch (error) {
        console.error('ERROR in getPendingChanges:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve or Reject a request
// @route   POST /api/governance/act
// @access  Private (Admin/HR Manager)
const actOnPendingChange = async (req, res) => { // Renamed to match export
    const { id, action, approval_reason, type } = req.body; // action: 'Approve' | 'Reject'
    const status = action === 'Approve' ? 'Approved' : 'Rejected';

    // Transaction Management: Must use a dedicated client from the pool
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // 0. Governance Check: Segregation of Duties for internal requests
        // Admin role can override segregation — needed for small teams where Admin is also HR
        const isAdmin = req.user.role === 'Admin';
        const isRequestFromSelf = async (id, type) => {
            if (isAdmin) return false; // Admin can approve any request
            if (type === 'SALARY' || type === 'ATTENDANCE') {
                const res = await client.query('SELECT requested_by FROM pending_changes WHERE id = $1', [id]);
                return res.rows.length > 0 && String(res.rows[0].requested_by) === String(req.user.id);
            } else if (type === 'FINANCIAL') {
                const res = await client.query('SELECT requested_by FROM financial_requests WHERE id = $1', [id]);
                return res.rows.length > 0 && String(res.rows[0].requested_by) === String(req.user.id);
            }
            else if (type === 'PERFORMANCE') {
                const res = await client.query('SELECT status FROM monthly_salary_overrides WHERE id = $1', [id]);
                // No specific requested_by for performance overrides, so we rely on Admin/HR roles which are already checked
                return false;
            }
            // For Leaves/Loans/Resignations, the 'requested_by' is usually the employee themselves, 
            // so HR/Admin approving them is naturally segregated.
            return false;
        };

        if (await isRequestFromSelf(id, type)) {
            throw new Error('Segregation of duties: You cannot approve/reject your own request.');
        }

        if (type === 'SALARY' || type === 'PROFILE' || type === 'BANK') {
            const changeRes = await client.query('SELECT * FROM pending_changes WHERE id = $1', [id]);
            if (changeRes.rows.length === 0) throw new Error('Request not found');
            const change = changeRes.rows[0];

            if (action === 'Approve') {
                if (change.field_name === 'MULTIPLE_COMPONENTS') {
                    const updates = JSON.parse(change.new_value);
                    for (const update of updates) {
                        const check = await client.query(
                            'SELECT id FROM employee_salary_structure WHERE employee_id = $1 AND component_id = $2',
                            [change.entity_id, update.component_id]
                        );

                        if (check.rows.length > 0) {
                            await client.query(
                                'UPDATE employee_salary_structure SET amount = $1, quantity = $2, installments_remaining = $3 WHERE employee_id = $4 AND component_id = $5',
                                [update.amount, update.quantity, update.installments_remaining, change.entity_id, update.component_id]
                            );
                        } else {
                            await client.query(
                                'INSERT INTO employee_salary_structure (employee_id, component_id, amount, quantity, installments_remaining) VALUES ($1, $2, $3, $4, $5)',
                                [change.entity_id, update.component_id, update.amount, update.quantity, update.installments_remaining]
                            );
                        }
                    }
                } else if (change.field_name.startsWith('COMPONENT_')) {
                    // Handle individual component update
                    const componentId = change.field_name.replace('COMPONENT_', '');
                    const amount = parseFloat(change.new_value);

                    const check = await client.query(
                        'SELECT 1 FROM employee_salary_structure WHERE employee_id = $1 AND component_id = $2',
                        [change.entity_id, componentId]
                    );

                    if (check.rows.length > 0) {
                        await client.query(
                            'UPDATE employee_salary_structure SET amount = $1 WHERE employee_id = $2 AND component_id = $3',
                            [amount, change.entity_id, componentId]
                        );
                    } else {
                        await client.query(
                            'INSERT INTO employee_salary_structure (employee_id, component_id, amount) VALUES ($1, $2, $3)',
                            [change.entity_id, componentId, amount]
                        );
                    }
                } else if (change.entity === 'salary_structures' || change.entity === 'employee_salary_structure') {
                    // Salary structure update
                    await client.query(
                        `UPDATE employee_salary_structure SET ${change.field_name} = $1 WHERE employee_id = $2`,
                        [change.new_value, change.entity_id]
                    );
                } else if (change.entity === 'employees') {
                    // Sensitive employee data update
                    await client.query(
                        `UPDATE employees SET ${change.field_name} = $1 WHERE id = $2`,
                        [change.new_value, change.entity_id]
                    );
                } else if (change.entity === 'users') {
                    // User record update (e.g. name, email)
                    await client.query(
                        `UPDATE users SET ${change.field_name} = $1 WHERE id = $2`,
                        [change.new_value, change.entity_id]
                    );
                } else if (change.entity === 'employee_bank_details') {
                    // Bank details update
                    await client.query(
                        `UPDATE employee_bank_details SET ${change.field_name} = $1 WHERE user_id = $2`,
                        [change.new_value, change.entity_id]
                    );
                }
            }

            await client.query(
                'UPDATE pending_changes SET status = $1, approved_by = $2, rejection_reason = $3, updated_at = NOW() WHERE id = $4',
                [status, req.user.id, action === 'Reject' ? approval_reason : null, id]
            );
        }
        else if (type === 'ATTENDANCE') {
            const changeRes = await client.query('SELECT * FROM pending_changes WHERE id = $1', [id]);
            if (changeRes.rows.length === 0) throw new Error('Request not found');
            const change = changeRes.rows[0];

            if (action === 'Approve') {
                const val = typeof change.new_value === 'string' ? JSON.parse(change.new_value) : change.new_value;
                
                // Ensure empty strings are handled as NULL for DB consistency
                if (val.clock_in === '') val.clock_in = null;
                if (val.clock_out === '') val.clock_out = null;

                // Get existing to check reconciliation
                const existingRes = await client.query('SELECT * FROM attendance WHERE id = $1', [change.entity_id]);
                if (existingRes.rows.length === 0) throw new Error('Original attendance record missing');
                const existing = existingRes.rows[0];

                const isWorkingStatus = val.status === 'Present' || val.status === 'Incomplete';
                let reclaimed = existing.leave_reclaimed;

                // Leave Reconciliation Logic
                if (isWorkingStatus && !existing.leave_reclaimed) {
                    reclaimed = await reconcileLeaveBalance(client, existing.employee_id, existing.date, val.status);
                } else if (!isWorkingStatus && existing.leave_reclaimed) {
                    await reverseReclaimedBalance(client, existing.id);
                    reclaimed = false;
                }

                await client.query(
                    `UPDATE attendance 
                     SET clock_in = $1, clock_out = $2, status = $3, late_minutes = $4, 
                         short_leave_hours = $5, leave_reclaimed = $6, source = 'Manual', updated_at = NOW()
                     WHERE id = $7`,
                    [val.clock_in, val.clock_out, val.status, val.late_minutes, val.short_leave_hours || 0, reclaimed, change.entity_id]
                );
            }

            await client.query(
                'UPDATE pending_changes SET status = $1, approved_by = $2, rejection_reason = $3, updated_at = NOW() WHERE id = $4',
                [status, req.user.id, action === 'Reject' ? approval_reason : null, id]
            );
        }
        else if (type === 'LEAVE') {
            if (action === 'Approve') {
                // Fetch leave details to sync balance and attendance
                const leaveRes = await client.query('SELECT * FROM leaves WHERE id = $1', [id]);
                if (leaveRes.rows.length === 0) throw new Error('Leave record not found');
                const leave = leaveRes.rows[0];

                if (leave.status === 'Approved') throw new Error('Leave already approved');

                const year = new Date(leave.start_date).getFullYear();

                // 1. Deduct from balance if it was a paid leave
                if (parseFloat(leave.paid_days) > 0) {
                    const balanceUpdate = await client.query(`
                        UPDATE leave_balances 
                        SET used_days = COALESCE(used_days, 0) + $1
                        WHERE user_id = $2 AND leave_type_id = $3 AND year = $4
                        RETURNING *
                    `, [leave.paid_days, leave.user_id, leave.leave_type_id, year]);

                    if (balanceUpdate.rowCount === 0) {
                        console.warn(`[GOVERNANCE] No leave balance record found for User: ${leave.user_id}, Type: ${leave.leave_type_id}, Year: ${year}. Approving anyway.`);
                    }
                }

                // 2. Clear any 'Absent' records for these dates
                const empRes = await client.query('SELECT id FROM employees WHERE user_id = $1', [leave.user_id]);
                if (empRes.rows.length > 0) {
                    const employeeId = empRes.rows[0].id;
                    await client.query(`
                        DELETE FROM attendance 
                        WHERE employee_id = $1 
                        AND date >= $2::date AND date <= $3::date 
                        AND status = 'Absent'
                    `, [employeeId, leave.start_date, leave.end_date]);
                }
            }

            await client.query(
                'UPDATE leaves SET status = $1, approved_by = $2, rejection_reason = $3, updated_at = NOW() WHERE id = $4',
                [status, req.user.id, action === 'Reject' ? approval_reason : null, id]
            );
        }
        else if (type === 'LOAN') {
            if (action === 'Approve') {
                const loanRes = await client.query('SELECT * FROM employee_loans WHERE id = $1', [id]);
                if (loanRes.rows.length === 0) throw new Error('Loan record not found');
                const loan = loanRes.rows[0];

                // Dynamic lookup for 'Staff Loan Installment' component (Case-insensitive)
                const componentRes = await client.query('SELECT id FROM salary_components WHERE name ILIKE $1', ['STAFF LOAN INSTALLMENT']);
                if (componentRes.rows.length === 0) throw new Error('Salary component "STAFF LOAN INSTALLMENT" not found in settings.');
                const loanComponentId = componentRes.rows[0].id;

                // UPSERT into employee_salary_structure
                const checkStruct = await client.query(
                    'SELECT 1 FROM employee_salary_structure WHERE employee_id = $1 AND component_id = $2',
                    [loan.employee_id, loanComponentId]
                );

                if (checkStruct.rows.length > 0) {
                    await client.query(`
                        UPDATE employee_salary_structure 
                        SET amount = $1, installments_remaining = $2, is_locked = true, lock_reason = $3
                        WHERE employee_id = $4 AND component_id = $5
                    `, [loan.installment_amount, loan.num_installments, `Approved Loan - Ref: ${loan.id}`, loan.employee_id, loanComponentId]);
                } else {
                    await client.query(`
                        INSERT INTO employee_salary_structure (employee_id, component_id, amount, installments_remaining, is_locked, lock_reason)
                        VALUES ($1, $2, $3, $4, true, $5)
                    `, [loan.employee_id, loanComponentId, loan.installment_amount, loan.num_installments, `Approved Loan - Ref: ${loan.id}`]);
                }
            }

            await client.query(
                'UPDATE employee_loans SET status = $1, approved_by = $2, rejection_reason = $3, updated_at = NOW() WHERE id = $4',
                [status, req.user.id, action === 'Reject' ? approval_reason : null, id]
            );
        }
        else if (type === 'FINANCIAL') {
            const financialRes = await client.query('SELECT * FROM financial_requests WHERE id = $1', [id]);
            if (financialRes.rows.length > 0) {
                const request = financialRes.rows[0];
                if (action === 'Approve') {
                    // Ensure data is parsed if stored as string
                    if (typeof request.data === 'string') {
                        request.data = JSON.parse(request.data);
                    }
                    const { processApprovedRequest } = require('../services/financial.service');
                    await processApprovedRequest(client, request);
                }

                await client.query(
                    'UPDATE financial_requests SET status = $1, approved_by = $2, rejection_reason = $3, updated_at = NOW() WHERE id = $4',
                    [status, req.user.id, action === 'Reject' ? approval_reason : null, id]
                );
            }
        }
        else if (type === 'PERFORMANCE') {
            // monthly_salary_overrides has no approved_by / rejection_reason columns.
            // Safe update: status + updated_at only.
            await client.query(
                'UPDATE monthly_salary_overrides SET status = $1, updated_at = NOW() WHERE id = $2',
                [status, id]
            );
        }
        else if (type === 'RESIGNATION') {
            await client.query(
                'UPDATE resignations SET status = $1, approved_by = $2, rejection_reason = $3, updated_at = NOW() WHERE id = $4',
                [status, req.user.id, action === 'Reject' ? approval_reason : null, id]
            );
        }
        else if (type === 'LOAN_PAYMENT') {
            // id here is the loan_payments.id (the pending manual payment)
            const lpRes = await client.query('SELECT * FROM loan_payments WHERE id = $1', [id]);
            if (lpRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ message: 'Loan payment record not found.' });
            }
            const lp = lpRes.rows[0];

            // Update the loan_payment record status
            await client.query(
                'UPDATE loan_payments SET status = $1 WHERE id = $2',
                [status, id]
            );

            if (action === 'Approve') {
                // Get the parent loan
                const loanRes = await client.query('SELECT * FROM employee_loans WHERE id = $1', [lp.loan_id]);
                if (loanRes.rows.length > 0) {
                    const loan = loanRes.rows[0];
                    const installmentsCovered = Math.min(
                        Math.floor(parseFloat(lp.amount) / parseFloat(loan.installment_amount)),
                        loan.num_installments - loan.installments_paid
                    );
                    const newPaid = loan.installments_paid + installmentsCovered;
                    const isComplete = newPaid >= loan.num_installments;

                    await client.query(`
                        UPDATE employee_loans
                        SET installments_paid = $1,
                            status = CASE WHEN $2 THEN 'Completed' ELSE status END,
                            updated_at = NOW()
                        WHERE id = $3
                    `, [newPaid, isComplete, loan.id]);
                }
            }
        }

        await client.query('COMMIT');
        res.status(200).json({ message: `Request ${status} successfully` });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
};

module.exports = { getPendingChanges, actOnPendingChange };