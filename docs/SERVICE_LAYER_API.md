# VuFamily — Service Layer API Reference

> Tài liệu kỹ thuật mô tả tất cả các Helper/Service trong lớp `shared/services/`.
> Đây là **API nội bộ** mà mọi Component/Feature phải sử dụng.

---

## 1. AuthHelper (`shared/services/AuthHelper.js`)

Quản lý tập trung phiên đăng nhập (Session/Token). Trừu tượng hóa localStorage.

| Method | Trả về | Mô tả |
|--------|--------|-------|
| `AuthHelper.getToken()` | `string` | Lấy JWT token hiện tại (trả `''` nếu chưa login) |
| `AuthHelper.getUser()` | `object` | Lấy toàn bộ thông tin user đang login |
| `AuthHelper.getAuthData()` | `object` | Alias của getUser — lấy raw auth data |
| `AuthHelper.saveAuthData(data)` | `void` | Lưu auth data vào localStorage |
| `AuthHelper.clearAuthData()` | `void` | Xóa phiên đăng nhập (dùng khi logout) |

**Cách dùng:**
```javascript
import { AuthHelper } from '../../shared/services/AuthHelper';

// Gửi request có xác thực
fetch(url, { headers: { 'x-auth-token': AuthHelper.getToken() } });
```

---

## 2. TrackingHelper (`shared/services/TrackingHelper.js`)

Facade Pattern — Phễu trung tâm cho mọi sự kiện analytics.

### Core Method
| Method | Mô tả |
|--------|-------|
| `TrackingHelper.TrackingEvent(eventName, params)` | **Hàm lõi** — Mọi hàm khác đều gọi qua đây |
| `TrackingHelper.identifyUser(userId, props)` | Gắn user ID vào phiên tracking |

### Semantic Events
| Method | Event Name | Khi nào dùng |
|--------|-----------|--------------|
| `trackAppOpen(platform)` | `app_open` | Khi app khởi động |
| `trackLoginSuccess(method)` | `login_success` | Đăng nhập thành công |
| `trackLogout()` | `logout` | Đăng xuất |
| `trackViewFamilyTree(totalNodes)` | `view_family_tree` | Xem phả đồ |
| `trackAddTreeMember(relationship)` | `add_tree_member` | Thêm thành viên |
| `trackSendChatMessage(roomType)` | `send_chat_message` | Gửi tin nhắn |
| `trackStartVoiceCall(callType)` | `start_voice_call` | Bắt đầu cuộc gọi |
| `trackEndVoiceCall(duration)` | `end_voice_call` | Kết thúc cuộc gọi |
| `trackCreatePost(hasImage)` | `create_post` | Đăng bài bảng tin |
| `trackReactPost(reactionType)` | `react_post` | Thả cảm xúc bài đăng |
| `trackViewCalendar()` | `view_calendar` | Mở trang lịch |
| `trackCreateAccount(targetRole)` | `create_account` | Admin tạo tài khoản |
| `trackBanAccount(targetUserId)` | `ban_account` | Admin khóa tài khoản |

### Thêm Provider Mới
Mở `TrackingHelper.TrackingEvent()` → thêm dòng gọi provider:
```javascript
TrackingEvent: (eventName, params = {}) => {
    const finalParams = { ...params, timestamp: new Date().toISOString() };
    TrackingFirebaseHelper.trackEvent(eventName, finalParams);  // Firebase
    // TrackingMixpanelHelper.trackEvent(eventName, finalParams); // Mixpanel
    // TrackingServerHelper.trackEvent(eventName, finalParams);   // Server Bucket
},
```

---

## 3. I18nHelper (`shared/services/i18n.js`)

Hệ thống đa ngôn ngữ (Localization) tự xây dựng theo mô hình Key-Value.

| Method | Trả về | Mô tả |
|--------|--------|-------|
| `I18nHelper.getLanguage()` | `'vi'` \| `'en'` | Lấy ngôn ngữ hiện tại |
| `I18nHelper.setLanguage(lang)` | `void` | Đổi ngôn ngữ + phát event toàn cục |
| `I18nHelper.t(key)` | `string` | Lấy bản dịch theo key |

### React Hook: `useTranslation()`
```javascript
import { useTranslation } from '../../shared/hooks/useTranslation';

function MyComponent() {
    const { t, lang, changeLanguage } = useTranslation();
    return <span>{t('nav.tree')}</span>; // "Phả đồ" hoặc "Family Tree"
}
```

### Cấu trúc Key theo Namespace
| Prefix | Dùng cho | Ví dụ |
|--------|----------|-------|
| `nav.*` | Menu điều hướng | `nav.tree`, `nav.chat` |
| `app.*` | Cài đặt chung | `app.logout`, `app.theme` |
| `action.*` | Nút hành động | `action.save`, `action.cancel` |
| `role.*` | Nhãn quyền | `role.admin`, `role.editor` |
| `theme.*` | Giao diện | `theme.light`, `theme.dark` |
| `sidebar.*` | Thanh bên | `sidebar.logo_title` |
| `login.*` | Trang đăng nhập | `login.username`, `login.sign_in` |
| `profile.*` | Hồ sơ cá nhân | `profile.save_changes` |

---

## 4. ConfigAPI (`config.js`)

Đọc cấu hình hệ thống an toàn (Static + Remote Config merged).

| Method | Trả về | Mô tả |
|--------|--------|-------|
| `ConfigAPI.getString(key, fallback)` | `string` | Lấy config dạng chuỗi |
| `ConfigAPI.getNumber(key, fallback)` | `number` | Lấy config dạng số |
| `ConfigAPI.getBoolean(key, fallback)` | `boolean` | Lấy config dạng boolean |
| `ConfigAPI.getJSON(key, fallback)` | `object` | Lấy config dạng JSON |

### Feature Flags Hiện Có
| Key | Default | Mô tả |
|-----|---------|-------|
| `feature_tree_enabled` | `true` | Bật/tắt tính năng Phả đồ |
| `feature_newsfeed_enabled` | `true` | Bật/tắt Bảng tin |
| `feature_calendar_enabled` | `true` | Bật/tắt Lịch sự kiện |
| `feature_chat_enabled` | `true` | Bật/tắt Chat |
| `feature_history_enabled` | `true` | Bật/tắt Lịch sử |
| `feature_requests_enabled` | `true` | Bật/tắt Yêu cầu chỉnh sửa |
| `feature_localize_enabled` | `true` | Bật/tắt Đa ngôn ngữ |
| `maintenance_mode` | `false` | Chế độ bảo trì |
| `enable_new_call_ui` | `true` | UI cuộc gọi mới |

---

## 5. Logger (`shared/utils/logger.js`)

Hệ thống logging có thể bật/tắt theo module.

| Function | Mô tả |
|----------|-------|
| `myLog(flag, ...args)` | Log thông thường (kiểm tra `LOG_FLAGS[flag]`) |
| `myWarning(flag, ...args)` | Log cảnh báo (luôn hiển thị) |
| `myError(flag, ...args)` | Log lỗi (luôn hiển thị) |

### Module Flags
`CHAT`, `CALL`, `WEBRTC`, `CACHE`, `HUB`, `NEWSFEED`, `REQUEST`, `HISTORY`, `CALENDAR`, `ACCOUNTS`, `APP`, `FIREBASE`, `CONFIG`, `ANALYTICS`

Tắt log module bằng cách đặt flag = `false` trong `LOG_FLAGS`.
