const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'controllers', 'attendance.controller.js');
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Find the line where the orphaned while loop starts
let orphanedLineIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('while (current <= end) {') && i > 500) {
        orphanedLineIndex = i;
        break;
    }
}

if (orphanedLineIndex !== -1) {
    // We want to keep lines up to lines[orphanedLineIndex - 2] (the last };)
    // and then the module.exports at the end.

    let newLines = lines.slice(0, orphanedLineIndex - 1);

    // Add the exports back
    newLines.push('\nmodule.exports = {');
    newLines.push('    logAttendance,');
    newLines.push('    getAttendance,');
    newLines.push('    updateAttendance,');
    newLines.push('    deleteAttendance,');
    newLines.push('    getMonthlySummary,');
    newLines.push('    bulkLogAttendance,');
    newLines.push('    getMyAttendance,');
    newLines.push('    syncAttendanceWithLeaves');
    newLines.push('};');

    fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
    console.log('Fixed orphaned code in attendance.controller.js');
} else {
    console.log('Orphaned while loop not found');
}
