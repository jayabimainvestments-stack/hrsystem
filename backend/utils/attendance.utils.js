/**
 * Parses a time string (HH:mm or HH:mm:ss or military or AM/PM) into minutes from midnight.
 * @param {string} timeStr 
 * @returns {number|null} Minutes from midnight or null if invalid
 */
function timeToMinutes(timeStr) {
    if (!timeStr) return null;

    // Check for HH:mm:ss or HH:mm
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (!match) return null;

    let [_, hours, minutes, seconds, ampm] = match;
    hours = parseInt(hours);
    minutes = parseInt(minutes);

    if (ampm) {
        if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
    }

    return hours * 60 + minutes + (seconds ? parseInt(seconds) / 60 : 0);
}

/**
 * Calculates late minutes based on clock-in time and work start time policy.
 * @param {string} clockIn - Clock-in time
 * @param {string} workStartTime - Policy start time
 * @returns {number} - Late minutes (0 or greater)
 */
function calculateLateMinutes(clockIn, workStartTime) {
    const punch = timeToMinutes(clockIn);
    const policy = timeToMinutes(workStartTime);

    if (punch === null || policy === null) return 0;

    const diff = punch - policy;
    return diff > 0 ? Math.floor(diff) : 0;
}

/**
 * Calculates overtime hours based on clock-out time and work end time policy.
 * @param {string} clockOut - Clock-out time
 * @param {string} workEndTime - Policy end time
 * @returns {number} - Overtime hours (decimal)
 */
function calculateOvertimeHours(clockOut, workEndTime) {
    const punch = timeToMinutes(clockOut);
    const policy = timeToMinutes(workEndTime);

    if (punch === null || policy === null) return 0;

    const diff = punch - policy;
    const hours = diff / 60;
    return diff > 0 ? parseFloat(hours.toFixed(2)) : 0;
}

module.exports = {
    calculateLateMinutes,
    calculateOvertimeHours
};
