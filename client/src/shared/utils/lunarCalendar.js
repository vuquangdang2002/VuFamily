/**
 * Vietnamese Lunar Calendar Utility
 * Based on Hồ Ngọc Đức's algorithm for Vietnamese lunar calendar conversion.
 * Converts solar (dương lịch) dates to Vietnamese lunar (âm lịch) dates.
 */

const CAN = ['Canh', 'Tân', 'Nhâm', 'Quý', 'Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ'];
const CHI = ['Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi'];

const PI = Math.PI;

function jdFromDate(dd, mm, yy) {
    const a = Math.floor((14 - mm) / 12);
    const y = yy + 4800 - a;
    const m = mm + 12 * a - 3;
    let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    if (jd < 2299161) {
        jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
    }
    return jd;
}

function jdToDate(jd) {
    let a, b, c;
    if (jd > 2299160) {
        a = jd + 32044;
        b = Math.floor((4 * a + 3) / 146097);
        c = a - Math.floor((b * 146097) / 4);
    } else {
        b = 0;
        c = jd + 32082;
    }
    const d = Math.floor((4 * c + 3) / 1461);
    const e = c - Math.floor((1461 * d) / 4);
    const m = Math.floor((5 * e + 2) / 153);
    const day = e - Math.floor((153 * m + 2) / 5) + 1;
    const month = m + 3 - 12 * Math.floor(m / 10);
    const year = b * 100 + d - 4800 + Math.floor(m / 10);
    return [day, month, year];
}

function newMoon(k) {
    const T = k / 1236.85;
    const T2 = T * T;
    const T3 = T2 * T;
    const dr = PI / 180;
    let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    Jd1 = Jd1 + 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
    C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
    C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
    C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
    C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
    C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
    C1 = C1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
    let deltat;
    if (T < -11) {
        deltat = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
    } else {
        deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
    }
    return Jd1 + C1 - deltat;
}

function sunLongitude(jdn) {
    const T = (jdn - 2451545.0) / 36525;
    const T2 = T * T;
    const dr = PI / 180;
    const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    let DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
    DL = DL + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
    let L = L0 + DL;
    L = L * dr;
    L = L - PI * 2 * (Math.floor(L / (PI * 2)));
    return Math.floor(L / PI * 6);
}

function getLunarMonth11(yy) {
    const off = jdFromDate(31, 12, yy) - 2415021;
    const k = Math.floor(off / 29.530588853);
    let nm = newMoon(k);
    const sunLong = sunLongitude(nm);
    if (sunLong >= 9) {
        nm = newMoon(k - 1);
    }
    return Math.floor(nm + 0.5);
}

function getLeapMonthOffset(a11) {
    const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
    let last = 0;
    let i = 1;
    let arc = sunLongitude(newMoon(k + i));
    do {
        last = arc;
        i++;
        arc = sunLongitude(newMoon(k + i));
    } while (arc !== last && i < 14);
    return i - 1;
}

/**
 * Convert solar date to Vietnamese lunar date
 * @param {number} dd - Day
 * @param {number} mm - Month
 * @param {number} yy - Year
 * @returns {{ day: number, month: number, year: number, leap: boolean, canChi: string }}
 */
export function solarToLunar(dd, mm, yy) {
    const k = Math.floor((jdFromDate(dd, mm, yy) - 2415021.076998695) / 29.530588853);
    let monthStart = newMoon(k + 1);
    if (Math.floor(monthStart + 0.5) > jdFromDate(dd, mm, yy)) {
        monthStart = newMoon(k);
    }
    let a11 = getLunarMonth11(yy);
    let b11 = a11;
    let lunarYear;
    if (a11 >= Math.floor(monthStart + 0.5)) {
        lunarYear = yy;
        a11 = getLunarMonth11(yy - 1);
    } else {
        lunarYear = yy + 1;
        b11 = getLunarMonth11(yy + 1);
    }
    const lunarDay = jdFromDate(dd, mm, yy) - Math.floor(monthStart + 0.5) + 1;
    const diff = Math.floor((Math.floor(monthStart + 0.5) - a11) / 29);
    let lunarLeap = false;
    let lunarMonth = diff + 11;
    if (b11 - a11 > 365) {
        const leapMonthDiff = getLeapMonthOffset(a11);
        if (diff >= leapMonthDiff) {
            lunarMonth = diff + 10;
            if (diff === leapMonthDiff) {
                lunarLeap = true;
            }
        }
    }
    if (lunarMonth > 12) {
        lunarMonth = lunarMonth - 12;
    }
    if (lunarMonth >= 11 && diff < 4) {
        lunarYear -= 1;
    }

    const canChi = CAN[lunarYear % 10] + ' ' + CHI[lunarYear % 12];

    return {
        day: lunarDay,
        month: lunarMonth,
        year: lunarYear,
        leap: lunarLeap,
        canChi,
    };
}

/**
 * Convert a lunar date to solar date for a given solar year
 * Note: This finds when a specific lunar month/day falls in the given solar year
 * by iterating through the months around that period
 * @param {number} lunarDay
 * @param {number} lunarMonth
 * @param {number} solarYear - the solar year to find the date in
 * @returns {{ day: number, month: number, year: number } | null}
 */
export function lunarToSolar(lunarDay, lunarMonth, solarYear) {
    // Search around the expected date
    // Lunar month X roughly corresponds to solar month X (with ~1 month offset)
    const startSearchMonth = Math.max(1, lunarMonth - 1);
    const startJd = jdFromDate(1, startSearchMonth, solarYear);

    for (let offset = -15; offset < 60; offset++) {
        const jd = startJd + offset;
        const [d, m, y] = jdToDate(jd);
        const lunar = solarToLunar(d, m, y);
        if (lunar.month === lunarMonth && lunar.day === lunarDay && !lunar.leap) {
            return { day: d, month: m, year: y };
        }
    }
    return null;
}

/**
 * Format a solar date string (YYYY-MM-DD) to Vietnamese lunar date string
 * @param {string} dateStr - Solar date in YYYY-MM-DD format
 * @returns {string} e.g. "13/07 Ất Mão" or "" if invalid
 */
export function solarDateToLunarStr(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return '';
    const yy = parseInt(parts[0], 10);
    const mm = parseInt(parts[1], 10);
    const dd = parseInt(parts[2], 10);
    if (isNaN(yy) || isNaN(mm) || isNaN(dd)) return '';

    const lunar = solarToLunar(dd, mm, yy);
    const dayStr = String(lunar.day).padStart(2, '0');
    const monthStr = String(lunar.month).padStart(2, '0');
    return `${dayStr}/${monthStr}/${lunar.canChi}${lunar.leap ? ' (nhuận)' : ''}`;
}

/**
 * Get the solar date of a lunar anniversary in a given year
 * Given a death date in solar, find the lunar equivalent, then find when
 * that lunar date falls in the target solar year.
 * @param {string} deathDateSolar - Death date in YYYY-MM-DD format
 * @param {number} targetYear - The solar year to find the anniversary in
 * @returns {{ solarDate: { day, month, year }, lunarStr: string } | null}
 */
export function getLunarAnniversaryInYear(deathDateSolar, targetYear) {
    if (!deathDateSolar) return null;
    const parts = deathDateSolar.split('-');
    if (parts.length < 3) return null;
    const yy = parseInt(parts[0], 10);
    const mm = parseInt(parts[1], 10);
    const dd = parseInt(parts[2], 10);
    if (isNaN(yy) || isNaN(mm) || isNaN(dd)) return null;

    // Convert death date to lunar
    const lunarDeath = solarToLunar(dd, mm, yy);
    const lunarStr = `${String(lunarDeath.day).padStart(2, '0')}/${String(lunarDeath.month).padStart(2, '0')}/${lunarDeath.canChi}`;

    // Find when this lunar date falls in the target year
    const solarDate = lunarToSolar(lunarDeath.day, lunarDeath.month, targetYear);

    return {
        solarDate,
        lunarDay: lunarDeath.day,
        lunarMonth: lunarDeath.month,
        lunarStr,
    };
}
