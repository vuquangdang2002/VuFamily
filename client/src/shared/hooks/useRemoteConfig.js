import { useState, useEffect } from 'react';
import { getRemoteConfigValue } from '../../firebase.js';

/**
 * Hook tùy chỉnh theo chuẩn Remote Config mới.
 * Khởi tạo với giá trị Default nội bộ (hoặc từ cache nếu có).
 * Tự động re-render khi fetchAndActivate() phát sự kiện 'remoteConfigUpdated'.
 * 
 * @param {string} key - Tên cấu hình trên Firebase
 * @param {string} type - 'string', 'boolean', 'number'
 * @returns Giá trị cấu hình hiện tại
 */
export function useRemoteConfig(key, type = 'string') {
    const [value, setValue] = useState(() => getRemoteConfigValue(key, type));

    useEffect(() => {
        const handleUpdate = () => {
            setValue(getRemoteConfigValue(key, type));
        };
        // Lắng nghe sự kiện toàn cục từ firebase.js
        window.addEventListener('remoteConfigUpdated', handleUpdate);
        return () => window.removeEventListener('remoteConfigUpdated', handleUpdate);
    }, [key, type]);

    return value;
}
