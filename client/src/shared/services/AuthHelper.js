// AuthHelper.js - Trạm trung chuyển chuẩn hóa về quản lý phiên đăng nhập (Session/Token)
const AUTH_KEY = 'vuFamilyAuth';

export const AuthHelper = {
    getAuthData: () => {
        try {
            return JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
        } catch {
            return {};
        }
    },
    
    getToken: () => {
        return AuthHelper.getAuthData().token || '';
    },
    
    getUser: () => {
        return AuthHelper.getAuthData(); // Thường lưu nguyên object User + token
    },
    
    saveAuthData: (data) => {
        localStorage.setItem(AUTH_KEY, JSON.stringify(data));
    },
    
    clearAuthData: () => {
        localStorage.removeItem(AUTH_KEY);
    }
};
