import { useState, useEffect, useCallback } from 'react';
import { I18nHelper } from '../services/i18n';

/**
 * React Hook dùng để gọi API Dịch thuật (i18n) vào trong các Component.
 * Hook này sẽ tự động lắng nghe sự thay đổi ngôn ngữ (Event) và re-render giao diện.
 */
export function useTranslation() {
    const [lang, setLang] = useState(I18nHelper.getLanguage());

    useEffect(() => {
        const handleLangChange = () => setLang(I18nHelper.getLanguage());
        // Lắng nghe sự kiện đổi ngôn ngữ toàn cục
        window.addEventListener('languageChange', handleLangChange);
        return () => window.removeEventListener('languageChange', handleLangChange);
    }, []);

    // Hàm gọi lấy bản dịch
    const t = useCallback((key) => {
        return I18nHelper.t(key);
    }, [lang]); // Dependency là `lang` để ép component re-render khi `lang` đổi

    // API đổi ngôn ngữ
    const changeLanguage = (newLang) => {
        I18nHelper.setLanguage(newLang);
    };

    return { t, lang, changeLanguage };
}
