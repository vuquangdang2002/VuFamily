import { useState, useEffect } from 'react';
import { ConfigAPI } from '../../config.js';

/**
 * Hook tùy chỉnh theo chuẩn Remote Config mới.
 * Sử dụng ConfigAPI để lấy và ép kiểu an toàn.
 * Tự động re-render khi firebase sync thành công.
 * 
 * @param {string} key - Tên cấu hình
 * @param {string} type - 'string', 'number', 'boolean', 'json'
 * @param {any} fallback - Giá trị mặc định (Tùy chọn)
 * @returns Giá trị cấu hình đã ép kiểu
 */
export function useRemoteConfig(key, type = 'string', fallback) {
    const getValue = () => {
        if (type === 'number') return ConfigAPI.getNumber(key, fallback);
        if (type === 'boolean') return ConfigAPI.getBoolean(key, fallback);
        if (type === 'json') return ConfigAPI.getJSON(key, fallback);
        return ConfigAPI.getString(key, fallback);
    };

    const [value, setValue] = useState(getValue);

    useEffect(() => {
        const handleUpdate = () => {
            setValue(getValue());
        };
        // Lắng nghe sự kiện toàn cục từ firebase.js
        window.addEventListener('remoteConfigUpdated', handleUpdate);
        return () => window.removeEventListener('remoteConfigUpdated', handleUpdate);
    }, [key, type]);

    return value;
}
