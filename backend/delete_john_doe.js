const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres.miikoefhdzkaoaukaftm:Jayabima%402026@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres',
});

async function deleteJohnDoe() {
    const userId = 62;
    const empId = 47;
    
    try {
        console.log('Starting deletion of John Doe...');
        
        // Deleting from child tables first (though previous checks were 0, this is for safety)
        await pool.query('DELETE FROM leaves WHERE user_id = $1', [userId]);
        await pool.query('DELETE FROM leave_balances WHERE user_id = $1', [userId]);
        await pool.query('DELETE FROM employee_bank_details WHERE user_id = $1', [userId]);
        await pool.query('DELETE FROM attendance WHERE employee_id = $1', [empId]);
        await pool.query('DELETE FROM employee_salary_structure WHERE employee_id = $1', [empId]);
        await pool.query('DELETE FROM employee_history WHERE employee_id = $1', [empId]);
        
        // Delete employee record
        const delEmp = await pool.query('DELETE FROM employees WHERE id = $1', [empId]);
        console.log(`Deleted ${delEmp.rowCount} employee record(s).`);
        
        // Delete user record
        const delUser = await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        console.log(`Deleted ${delUser.rowCount} user record(s).`);
        
        console.log('John Doe has been successfully removed.');
        process.exit(0);
    } catch (err) {
        console.error('Error during deletion:', err);
        process.exit(1);
    }
}
deleteJohnDoe();
