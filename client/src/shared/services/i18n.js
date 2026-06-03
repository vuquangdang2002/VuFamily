// i18n.js — Hệ thống đa ngôn ngữ (Localization Service)
// Dữ liệu bản dịch nằm tách riêng trong thư mục locales/ (vi, en)
// Thêm ngôn ngữ mới: tạo thư mục locales/xx rồi import vào đây.
import { myLog } from '../utils/logger';
import { ConfigAPI } from '../../config.js';
import vi from '../locales/vi';
import en from '../locales/en';

// Registry ngôn ngữ — Thêm ngôn ngữ mới chỉ cần thêm 1 dòng ở đây
const translations = { vi, en };

const I18N_KEY = 'vuFamilyLanguage';

export const I18nHelper = {
    /** Lấy mã ngôn ngữ hiện tại ('vi' | 'en') */
    getLanguage: () => {
        // Nếu tính năng đa ngôn ngữ bị tắt từ Remote Config → bắt buộc tiếng Việt
        if (!ConfigAPI.getBoolean('feature_localize_enabled', true)) {
            return 'vi';
        }
        return localStorage.getItem(I18N_KEY) || 'vi';
    },

    /** Đổi ngôn ngữ + phát event toàn cục để React re-render */
    setLanguage: (lang) => {
        if (!translations[lang]) return;
        localStorage.setItem(I18N_KEY, lang);
        myLog('I18N', 'Language changed to:', lang);
        window.dispatchEvent(new Event('languageChange'));
    },

    /** Dịch key → chuỗi bản dịch. Fallback: en → vi → trả về key gốc */
    t: (key) => {
        const lang = I18nHelper.getLanguage();
        return translations[lang]?.[key] || translations['vi']?.[key] || key;
    },

    /** Lấy danh sách ngôn ngữ được hỗ trợ */
    getSupportedLanguages: () => Object.keys(translations)
};
