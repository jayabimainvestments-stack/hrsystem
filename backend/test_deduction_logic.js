const basicSalary = 60000;
const fullUnpaidDays = 1;
const totalLateHours = 2;

// Mock Policy with fixed amounts
const policy = {
    absent_day_amount: 2500, // Fixed 2500 per day
    late_hourly_rate: 1500,  // Fixed 1500 per hour
    absent_deduction_rate: 1.0
};

// Current logic in payroll.controller.js
const dayRate = basicSalary / 30; // 2000
const hourlyRate = policy.late_hourly_rate > 0 ? parseFloat(policy.late_hourly_rate) : (basicSalary / 240);

const absentDeduction = policy.absent_day_amount > 0
    ? (fullUnpaidDays * parseFloat(policy.absent_day_amount))
    : (fullUnpaidDays * dayRate * (policy.absent_deduction_rate || 1.0));

const lateDeduction = totalLateHours * hourlyRate;

console.log('--- DEDUCTION VERIFICATION ---');
console.log('Fixed Absent Amount:', policy.absent_day_amount);
console.log('Fixed Late Rate:', policy.late_hourly_rate);
console.log('Days Absent:', fullUnpaidDays);
console.log('Hours Late:', totalLateHours);
console.log('------------------------------');
console.log('Calculated Absent Deduction:', absentDeduction, '(Expected: 2500)');
console.log('Calculated Late Deduction:', lateDeduction, '(Expected: 3000)');

if (absentDeduction === 2500 && lateDeduction === 3000) {
    console.log('\nVERIFICATION SUCCESSFUL');
} else {
    console.log('\nVERIFICATION FAILED');
    process.exit(1);
}
