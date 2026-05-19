# VuFamily — Bộ Quy Tắc Lập Trình (Coding Rules & Standards)

> Tài liệu này là **luật thép** bắt buộc mọi lập trình viên (kể cả AI Assistant) phải tuân thủ khi phát triển dự án VuFamily.
> Mục tiêu: Code sạch, dễ bảo trì, dễ mở rộng, chuẩn Enterprise.

---

## 1. Kiến Trúc Facade — "Viết Helper 1 lần, Component chỉ việc gọi"

### 1.1. API Gateway (`shared/services/api.js`)
- **BẮT BUỘC**: Mọi HTTP request phải đi qua `api.js`. Tuyệt đối KHÔNG gọi `fetch()` trực tiếp trong Component.
- File `api.js` cung cấp các method có sẵn: `api.login()`, `api.getMembers()`, `api.createChat()`...
- Khi cần thêm endpoint mới, bổ sung vào `api.js` rồi gọi từ Component.

```javascript
// ❌ SAI — Gọi fetch trực tiếp trong Component
const res = await fetch('/api/users', { headers: { 'x-auth-token': token } });

// ✅ ĐÚNG — Gọi qua Service Layer
import { api } from '../../shared/services/api';
const users = await api.getUsers();
```

### 1.2. Authentication (`shared/services/AuthHelper.js`)
- **BẮT BUỘC**: Mọi thao tác với Token/Session phải đi qua `AuthHelper`.
- KHÔNG dùng `localStorage.getItem('vuFamilyAuth')` trực tiếp trong Component.
- Các hàm có sẵn: `AuthHelper.getToken()`, `AuthHelper.getUser()`, `AuthHelper.saveAuthData()`, `AuthHelper.clearAuthData()`.

```javascript
// ❌ SAI
const token = JSON.parse(localStorage.getItem('vuFamilyAuth')).token;

// ✅ ĐÚNG
import { AuthHelper } from '../../shared/services/AuthHelper';
const token = AuthHelper.getToken();
```

### 1.3. Analytics/Tracking (`shared/services/TrackingHelper.js`)
- **BẮT BUỘC**: Mọi sự kiện tracking phải đi qua phễu `TrackingHelper.TrackingEvent(eventName, params)`.
- Mọi hàm semantic (`trackAppOpen`, `trackLoginSuccess`...) bên trong TrackingHelper ĐỀU GỌI qua `TrackingEvent`.
- Khi thêm provider mới (Mixpanel, Server Bucket), chỉ cần sửa bên trong `TrackingEvent` — không sửa Component.

```javascript
// ❌ SAI — Gọi Firebase trực tiếp
import { logEvent } from 'firebase/analytics';
logEvent(analytics, 'login_success');

// ✅ ĐÚNG — Gọi qua Facade
TrackingHelper.trackLoginSuccess('token');
```

### 1.4. Localization/i18n (`shared/services/i18n.js`)
- **BẮT BUỘC**: Mọi chuỗi text hiển thị trên giao diện phải dùng key-value qua hàm `t('key')`.
- KHÔNG hard-code chuỗi tiếng Việt hoặc tiếng Anh trực tiếp trong JSX.
- Thêm bản dịch mới: mở `i18n.js` → thêm key vào cả 2 object `vi` và `en`.
- Tính năng đa ngôn ngữ được kiểm soát bởi `feature_localize_enabled` trong Remote Config.

```javascript
// ❌ SAI
<button>Đăng xuất</button>

// ✅ ĐÚNG
const { t } = useTranslation();
<button>{t('app.logout')}</button>
```

### 1.5. Cấu Hình Động (`config.js` + Remote Config)
- Cấu hình tĩnh đọc từ `.env` qua `import.meta.env`.
- Cấu hình động (Feature Flags, thời gian refresh...) lưu trong `AppConfig` và được ghi đè bởi Firebase Remote Config.
- Đọc config luôn qua `ConfigAPI.getString()`, `ConfigAPI.getBoolean()`, `ConfigAPI.getNumber()`, `ConfigAPI.getJSON()`.
- Bật/tắt tính năng qua `feature_xxx_enabled` trong Firebase Console mà KHÔNG cần deploy lại.

---

## 2. Quy Tắc Import — Tránh Runtime Crash

Khi sử dụng bất kỳ Helper/Service nào, **BẮT BUỘC** phải import đầu file:

```javascript
import { AuthHelper } from '../../shared/services/AuthHelper';
import { TrackingHelper } from '../../shared/services/TrackingHelper';
import { useTranslation } from '../../shared/hooks/useTranslation';
import { ConfigAPI } from '../../config.js';
import { myLog, myError } from '../../shared/utils/logger';
```

> ⚠️ **Lưu ý quan trọng**: Nếu dùng `AuthHelper.getToken()` mà quên import → **App sẽ crash** với `ReferenceError` trên Production. Luôn kiểm tra import trước khi commit.

---

## 3. Quy Tắc Giao Diện (UI/CSS)

### 3.1. Design Tokens
- Sử dụng biến CSS toàn cục từ `styles/theme-light.css`: `var(--primary)`, `var(--bg-card)`, `var(--text-muted)`...
- KHÔNG hard-code mã Hex (`#3B6FCF`) trực tiếp trong file `.css` hoặc inline style.

### 3.2. Responsive
- Mọi trang phải hiển thị đúng trên Mobile (≤768px), Tablet, Desktop.
- Sử dụng breakpoint đã định nghĩa trong `Responsive.css`.
- Kiểm tra trên Chrome DevTools (iPhone 12, iPad) trước khi commit.

---

## 4. Quy Tắc Logging

- **Client**: Sử dụng `myLog()`, `myError()`, `myWarning()` từ `logger.js`. KHÔNG dùng `console.log` trực tiếp.
- Logger có cơ chế bật/tắt theo module (`LOG_FLAGS`) để dễ debug từng phần.
- **Server**: Prefix log theo module: `[AUTH]`, `[CHAT]`, `[DB]`...

---

## 5. Quy Tắc API Response (Server)

Mọi API endpoint PHẢI trả về cấu trúc thống nhất:

```json
{
    "success": true,
    "data": { ... },
    "message": "Thành công",
    "error": null
}
```

---

## 6. Quy Tắc Đặt Tên

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| Biến / Hàm | camelCase | `getUserActiveRooms()`, `chatMessageList` |
| Component React | PascalCase | `ChatPage`, `ProfileModal` |
| File Component | PascalCase.jsx | `LoginPage.jsx`, `Sidebar.jsx` |
| File Service/Helper | PascalCase.js | `AuthHelper.js`, `TrackingHelper.js` |
| CSS Class | kebab-case | `sidebar-item`, `lp-btn-primary` |
| Hằng số Config | SCREAMING_SNAKE | `MAX_CHAT_MESSAGES`, `AUTH_KEY` |
| i18n Key | dot.notation | `login.username`, `profile.save_changes` |

---

## 7. Checklist Trước Khi Commit

- [ ] Mọi `AuthHelper`, `TrackingHelper`, `useTranslation` đã được import đầy đủ
- [ ] Không còn `fetch()` trực tiếp trong Component
- [ ] Không còn `localStorage.getItem/setItem` trực tiếp trong Component
- [ ] Không còn `console.log` — đã dùng `myLog`
- [ ] Không còn text tiếng Việt hard-code — đã dùng `t('key')`
- [ ] `npm run build` thành công 0 lỗi
- [ ] Test responsive trên Mobile viewport
