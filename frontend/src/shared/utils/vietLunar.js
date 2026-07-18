/**
 * Vietnamese Can Chi (Thiên Can - Địa Chi) mapping
 * Converts Chinese GanZhi characters from lunar-javascript to Vietnamese
 */

// Thiên Can mapping: Chinese → Vietnamese
const CAN_MAP = {
    '甲': 'Giáp', '乙': 'Ất', '丙': 'Bính', '丁': 'Đinh', '戊': 'Mậu',
    '己': 'Kỷ', '庚': 'Canh', '辛': 'Tân', '壬': 'Nhâm', '癸': 'Quý',
};

// Địa Chi mapping: Chinese → Vietnamese
const CHI_MAP = {
    '子': 'Tý', '丑': 'Sửu', '寅': 'Dần', '卯': 'Mão', '辰': 'Thìn', '巳': 'Tỵ',
    '午': 'Ngọ', '未': 'Mùi', '申': 'Thân', '酉': 'Dậu', '戌': 'Tuất', '亥': 'Hợi',
};

// Tháng âm lịch tiếng Việt
const LUNAR_MONTH_NAMES = [
    '', 'Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu',
    'Bảy', 'Tám', 'Chín', 'Mười', 'Mười Một', 'Chạp',
];

/**
 * Convert Chinese GanZhi string (e.g. "庚寅") to Vietnamese (e.g. "Canh Dần")
 */
export function ganZhiToViet(ganZhi) {
    if (!ganZhi || ganZhi.length < 2) return ganZhi;
    const gan = CAN_MAP[ganZhi[0]] || ganZhi[0];
    const zhi = CHI_MAP[ganZhi[1]] || ganZhi[1];
    return `${gan} ${zhi}`;
}

/**
 * Get Vietnamese lunar day name
 * Mùng 1, Mùng 2, ... Mùng 10, 11, 12, ... 20, 21, ... 30
 */
export function lunarDayName(day) {
    if (day <= 10) return `${day}`;
    return `${day}`;
}

/**
 * Get Vietnamese lunar month name
 */
export function lunarMonthName(month) {
    return LUNAR_MONTH_NAMES[Math.abs(month)] || `${month}`;
}

/**
 * Format lunar date for calendar cells: always "dd/mm" e.g. "21/01"
 */
export function lunarDayLabel(lunarDay, lunarMonth) {
    const d = String(lunarDay).padStart(2, '0');
    const m = String(Math.abs(lunarMonth)).padStart(2, '0');
    return `${d}/${m}`;
}
