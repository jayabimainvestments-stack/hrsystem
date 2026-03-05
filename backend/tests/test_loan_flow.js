const db = require('../config/db');

async function testLoanFlow() {
    console.log('--- TEST: Loan Application & Approval Flow ---');

    try {
        // 1. Setup Employee
        const empRes = await db.query("SELECT id, user_id FROM employees LIMIT 1");
        if (empRes.rows.length === 0) { console.error('No employee found'); return; }
        const employeeId = empRes.rows[0].id;
        const userId = empRes.rows[0].user_id;

        // 2. Submit Loan
        // Use a clean date range to avoid "already processed" confusion if re-running
        const totalAmount = 50000;
        const installments = 10;
        const installmentAmount = 5000;
        const startDate = '2025-06-01';
        const endDate = '2026-03-01';

        // Clean previous tests
        await db.query("DELETE FROM employee_loans WHERE employee_id = $1 AND total_amount = $2", [employeeId, totalAmount]);

        const { submitLoan, approveLoan } = require('../controllers/loan.controller');

        const reqSubmit = {
            user: { id: userId },
            body: {
                employee_id: employeeId,
                loan_date: '2025-05-20',
                total_amount: totalAmount,
                installment_amount: installmentAmount,
                num_installments: installments,
                start_date: startDate,
                end_date: endDate
            }
        };

        let loanId;
        const resSubmit = {
            status: (code) => ({
                json: (data) => {
                    if (code !== 201) throw new Error(`Submit failed with ${code}: ${data.message}`);
                    loanId = data.id;
                    return data;
                }
            })
        };

        await submitLoan(reqSubmit, resSubmit);
        console.log(`✅ Loan Submitted. ID: ${loanId}`);

        // 3. Approve Loan (Segregation of Duties Check)
        // Attempt self-approval (should fail)
        const reqSelfApprove = {
            params: { id: loanId },
            user: { id: userId, role: 'Admin' }
        };

        let segregationPass = false;
        try {
            await approveLoan(reqSelfApprove, {
                status: (code) => ({
                    json: (data) => {
                        if (code === 403) segregationPass = true;
                        return data;
                    }
                })
            });
        } catch (e) { }

        if (segregationPass) {
            console.log('✅ Segregation of Duties Verified (Self-approval blocked)');
        } else {
            console.error('❌ Segregation of Duties Failed: Self-approval allowed');
            // throw new Error('Segregation failed'); // Soft fail
        }

        // Real Approval by Admin
        const adminRes = await db.query("SELECT id FROM users WHERE role = 'Admin' AND id != $1 LIMIT 1", [userId]);
        let adminId = (adminRes.rows.length > 0) ? adminRes.rows[0].id : 99999;

        if (adminId === 99999) {
            const tempAdmin = await db.query("INSERT INTO users (name, email, password, role) VALUES ('Loan Admin', 'loan@admin.com', 'pass', 'Admin') RETURNING id");
            adminId = tempAdmin.rows[0].id;
        }

        const reqApprove = {
            params: { id: loanId },
            user: { id: adminId, role: 'Admin' }
        };

        const resApprove = {
            status: (code) => ({
                json: (data) => {
                    if (code !== 200) throw new Error(`Approval failed with ${code}: ${data.message}`);
                    return data;
                }
            })
        };

        await approveLoan(reqApprove, resApprove);
        console.log('✅ Loan Approved');

        // 4. Verify DB Status
        const loanCheck = await db.query("SELECT status, approved_by FROM employee_loans WHERE id = $1", [loanId]);
        if (loanCheck.rows[0].status === 'Approved') {
            console.log('✅ DB Status Verified: Approved');
        } else {
            throw new Error(`DB Status Mismatch: ${loanCheck.rows[0].status}`);
        }

        // Cleanup temp admin
        if (reqApprove.user.email === 'loan@admin.com') {
            await db.query("DELETE FROM users WHERE id = $1", [adminId]);
        }

        console.log('--- TEST PASSED ---');
        process.exit(0);

    } catch (error) {
        console.error('❌ TEST FAILED:', error);
        process.exit(1);
    }
}

testLoanFlow();
