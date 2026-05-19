import { myLog } from '../utils/logger';
import { ConfigAPI } from '../../config.js';

// Hệ thống Dịch thuật (i18n) tự xây dựng
// Định dạng: Key -> Translation
export const translations = {
    vi: {
        // Navigation
        "nav.tree": "Phả đồ",
        "nav.newsfeed": "Bản tin",
        "nav.calendar": "Lịch sự kiện",
        "nav.chat": "Trò chuyện",
        "nav.history": "Lịch sử",
        "nav.admin": "Quản trị",
        "nav.requests": "Yêu cầu chỉnh sửa",
        "nav.system": "Hệ thống quản trị",
        
        // Header / Settings
        "app.language": "Ngôn ngữ",
        "app.logout": "Đăng xuất",
        "app.settings": "Cài đặt",
        "app.theme": "Giao diện",
        
        // Actions
        "action.save": "Lưu",
        "action.cancel": "Hủy",
        "action.delete": "Xóa",
        "action.edit": "Sửa",
        "action.close": "Đóng",

        // Roles
        "role.admin": "Quản trị viên",
        "role.editor": "Biên tập viên",
        "role.member": "Thành viên",

        // Themes
        "theme.light": "Sáng",
        "theme.dark": "Tối",

        // Sidebar
        "sidebar.logo_title": "Gia Phả",
        "sidebar.logo_sub": "Dòng Họ Vũ",
        "sidebar.open_menu": "Mở menu",
        "sidebar.collapse": "Thu gọn",
        "sidebar.admin_section": "Khu vực Quản trị",
        "sidebar.profile_password": "Hồ sơ & Mật khẩu",
        "sidebar.user_guide": "Hướng dẫn sử dụng",

        // Login / Register
        "login.title": "Gia Phả",
        "login.sub": "Dòng Họ Vũ",
        "login.create_account": "Tạo tài khoản",
        "login.register_member": "Đăng ký thành viên",
        "login.username": "Tên đăng nhập",
        "login.password": "Mật khẩu",
        "login.fullname": "Họ tên",
        "login.email_hint": "Link xác nhận sẽ được gửi đến email này.",
        "login.optional": "(Tùy chọn)",
        "login.phone": "Số điện thoại",
        "login.facebook": "Link Facebook",
        "login.password_hint": "Tối thiểu 8 ký tự, gồm chữ hoa, thường, số và ký tự đặc biệt.",
        "login.forgot_password": "Quên mật khẩu?",
        "login.sign_in": "Đăng nhập",
        "login.signing_in": "Đang đăng nhập...",
        "login.sign_up": "Đăng ký",
        "login.signing_up": "Đang đăng ký...",
        "login.or": "HOẶC",
        "login.create_new_account": "Tạo tài khoản mới",
        "login.about_us": "Về chúng tôi",
        "login.contact": "Liên hệ",
        "login.guide": "Hướng dẫn",
        "login.error_missing": "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu",
        "login.error_connection": "Lỗi kết nối server",
        "login.forgot_hint": "Nhập tên đăng nhập để quản trị viên gửi mật khẩu mới qua email.",
        "login.forgot_placeholder": "Tên đăng nhập...",
        "login.forgot_submit": "📧 Gửi yêu cầu",
        "login.forgot_sending": "Đang gửi...",

        // Profile Modal
        "profile.title": "Hồ sơ của tôi",
        "profile.avatar_title": "Nhấp để thay đổi ảnh đại diện",
        "profile.avatar_new": "Ảnh mới: ",
        "profile.tab_info": "👤 Thông tin",
        "profile.tab_password": "🔑 Mật khẩu",
        "profile.username": "Tên đăng nhập",
        "profile.username_immutable": "Tên đăng nhập không thể thay đổi",
        "profile.display_name": "✏️ Tên hiển thị *",
        "profile.email": "📧 Email",
        "profile.phone": "📞 Số điện thoại",
        "profile.avatar_uploading": "☁️ Đang upload ảnh...",
        "profile.saving": "⏳ Đang lưu...",
        "profile.save_changes": "💾 Lưu thay đổi",
        "profile.avatar_choose": "Thay đổi ảnh đại diện",
        "profile.avatar_choose_hint": "Nhấp để chọn ảnh từ máy tính (JPG, PNG, WebP — tối đa 5MB)",
        "profile.current_password": "Mật khẩu hiện tại",
        "profile.new_password": "Mật khẩu mới",
        "profile.new_password_placeholder": "Mật khẩu mới (≥8 ký tự)...",
        "profile.confirm_password": "Nhập lại mật khẩu mới",
        "profile.show_passwords": "Hiện mật khẩu",
        "profile.password_strength_warning": "⚠️ Yêu cầu: ít nhất 8 ký tự, gồm chữ Hoa, chữ thường, số và ký tự đặc biệt (!@#$...)",
        "profile.changing_password": "⏳ Đang đổi...",
        "profile.change_password_btn": "🔑 Đổi mật khẩu",
        "profile.toast_empty_display": "Tên hiển thị không được để trống",
        "profile.toast_invalid_file": "Vui lòng chọn file ảnh (JPG, PNG, WebP...)",
        "profile.toast_file_too_large": "Ảnh quá lớn. Giới hạn 5MB.",
        "profile.toast_update_success": "Cập nhật thông tin thành công!",
        "profile.toast_update_fail": "Cập nhật thất bại",
        "profile.toast_conn_error": "Lỗi kết nối khi cập nhật",
        "profile.toast_pwd_empty": "Vui lòng điền đầy đủ các trường mật khẩu",
        "profile.toast_pwd_weak": "Mật khẩu yếu. Yêu cầu: ≥8 ký tự, chữ Hoa, chữ thường, số, ký tự đặc biệt (!@#$).",
        "profile.toast_pwd_mismatch": "Mật khẩu mới không khớp",
        "profile.toast_pwd_success": "Đổi mật khẩu thành công!",
        "profile.toast_pwd_fail": "Đổi mật khẩu thất bại",
        "profile.toast_pwd_conn_error": "Lỗi kết nối khi đổi mật khẩu"
    },
    en: {
        // Navigation
        "nav.tree": "Family Tree",
        "nav.newsfeed": "Newsfeed",
        "nav.calendar": "Calendar",
        "nav.chat": "Chat",
        "nav.history": "History",
        "nav.admin": "Admin",
        "nav.requests": "Edit Requests",
        "nav.system": "Administration",
        
        // Header / Settings
        "app.language": "Language",
        "app.logout": "Logout",
        "app.settings": "Settings",
        "app.theme": "Theme",
        
        // Actions
        "action.save": "Save",
        "action.cancel": "Cancel",
        "action.delete": "Delete",
        "action.edit": "Edit",
        "action.close": "Close",

        // Roles
        "role.admin": "Administrator",
        "role.editor": "Editor",
        "role.member": "Member",

        // Themes
        "theme.light": "Light",
        "theme.dark": "Dark",

        // Sidebar
        "sidebar.logo_title": "Family Tree",
        "sidebar.logo_sub": "Vu Family",
        "sidebar.open_menu": "Open Menu",
        "sidebar.collapse": "Collapse",
        "sidebar.admin_section": "Admin Area",
        "sidebar.profile_password": "Profile & Password",
        "sidebar.user_guide": "User Guide",

        // Login / Register
        "login.title": "Family Tree",
        "login.sub": "Vu Family",
        "login.create_account": "Create Account",
        "login.register_member": "Register Member",
        "login.username": "Username",
        "login.password": "Password",
        "login.fullname": "Full Name",
        "login.email_hint": "A confirmation link will be sent to this email.",
        "login.optional": "(Optional)",
        "login.phone": "Phone Number",
        "login.facebook": "Facebook Link",
        "login.password_hint": "Min 8 chars, including uppercase, lowercase, numbers, and symbols.",
        "login.forgot_password": "Forgot Password?",
        "login.sign_in": "Sign In",
        "login.signing_in": "Signing In...",
        "login.sign_up": "Sign Up",
        "login.signing_up": "Registering...",
        "login.or": "OR",
        "login.create_new_account": "Create New Account",
        "login.about_us": "About Us",
        "login.contact": "Contact Us",
        "login.guide": "User Guide",
        "login.error_missing": "Please enter username and password",
        "login.error_connection": "Server connection error",
        "login.forgot_hint": "Enter your username so the admin can send a new password to your email.",
        "login.forgot_placeholder": "Username...",
        "login.forgot_submit": "📧 Send Request",
        "login.forgot_sending": "Sending...",

        // Profile Modal
        "profile.title": "My Profile",
        "profile.avatar_title": "Click to change avatar",
        "profile.avatar_new": "New Avatar: ",
        "profile.tab_info": "👤 Info",
        "profile.tab_password": "🔑 Password",
        "profile.username": "Username",
        "profile.username_immutable": "Username cannot be changed",
        "profile.display_name": "✏️ Display Name *",
        "profile.email": "📧 Email",
        "profile.phone": "📞 Phone Number",
        "profile.avatar_uploading": "☁️ Uploading avatar...",
        "profile.saving": "⏳ Saving...",
        "profile.save_changes": "💾 Save Changes",
        "profile.avatar_choose": "Change avatar",
        "profile.avatar_choose_hint": "Click to choose photo from computer (JPG, PNG, WebP — max 5MB)",
        "profile.current_password": "Current Password",
        "profile.new_password": "New Password",
        "profile.new_password_placeholder": "New Password (≥8 chars)...",
        "profile.confirm_password": "Confirm New Password",
        "profile.show_passwords": "Show Passwords",
        "profile.password_strength_warning": "⚠️ Requirement: at least 8 characters, including uppercase, lowercase, numbers, and special characters (!@#$...)",
        "profile.changing_password": "⏳ Changing...",
        "profile.change_password_btn": "🔑 Change Password",
        "profile.toast_empty_display": "Display name cannot be blank",
        "profile.toast_invalid_file": "Please select an image file (JPG, PNG, WebP...)",
        "profile.toast_file_too_large": "Image too large. Limit is 5MB.",
        "profile.toast_update_success": "Profile updated successfully!",
        "profile.toast_update_fail": "Profile update failed",
        "profile.toast_conn_error": "Connection error during update",
        "profile.toast_pwd_empty": "Please fill in all password fields",
        "profile.toast_pwd_weak": "Weak password. Requirement: ≥8 characters, uppercase, lowercase, numbers, and special symbols.",
        "profile.toast_pwd_mismatch": "New passwords do not match",
        "profile.toast_pwd_success": "Password changed successfully!",
        "profile.toast_pwd_fail": "Password change failed",
        "profile.toast_pwd_conn_error": "Connection error during password change"
    }
};

const I18N_KEY = 'vuFamilyLanguage';

export const I18nHelper = {
    getLanguage: () => {
        // Nếu tính năng đa ngôn ngữ bị tắt từ Remote Config, bắt buộc dùng tiếng Việt làm mặc định
        if (!ConfigAPI.getBoolean('feature_localize_enabled', true)) {
            return 'vi';
        }
        return localStorage.getItem(I18N_KEY) || 'vi';
    },
    
    setLanguage: (lang) => {
        if (!translations[lang]) return;
        localStorage.setItem(I18N_KEY, lang);
        myLog('I18N', 'Language changed to:', lang);
        // Kích hoạt event để các component React cập nhật
        window.dispatchEvent(new Event('languageChange'));
    },
    
    t: (key) => {
        const lang = I18nHelper.getLanguage();
        // Fallback: Nếu không có bản dịch cho ngôn ngữ hiện tại, dùng tiếng Việt, nếu không có nữa thì trả về key.
        return translations[lang]?.[key] || translations['vi']?.[key] || key;
    }
};
