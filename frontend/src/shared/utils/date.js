/**
 * Safely parse a date string or timestamp from SQLite D1 database.
 * Normalizes UTC CURRENT_TIMESTAMP strings (e.g. "2026-07-19 11:00:00") by appending "Z"
 * so that they are parsed in UTC and rendered correctly in the machine's local timezone.
 */
export function parseDateSafe(dateStr) {
    if (!dateStr) return new Date();
    if (!isNaN(dateStr)) return new Date(Number(dateStr));
    let normalized = dateStr;
    if (typeof dateStr === 'string') {
        if (!dateStr.includes('Z') && !dateStr.includes('+')) {
            // Replace space with T and append Z to mark it as UTC
            normalized = dateStr.replace(' ', 'T') + 'Z';
        }
    }
    const parsed = new Date(normalized);
    return isNaN(parsed.getTime()) ? new Date(dateStr) : parsed;
}
