# VuFamily — Tài Liệu Kiến Trúc & Quy Tắc Tổng Hợp

> **Phiên bản**: 2.0 — Cập nhật ngày 20/05/2026
> **Kiến trúc**: Feature-based + Service Layer (Facade Pattern)
> **Stack**: React + Vite (Frontend) | Node.js + Express (Backend) | Supabase (Database)

---

## Mục Lục Tài Liệu

| File | Nội dung |
|------|----------|
| **STRUCTURE_AND_RULES.md** | Tổng quan kiến trúc + Quy tắc tổng hợp (file này) |
| **PROJECT_STRUCTURE.md** | Cây thư mục chi tiết + Luồng dữ liệu |
| **RULES.md** | Bộ quy tắc lập trình Enterprise (Luật thép) |
| **SERVICE_LAYER_API.md** | API Reference cho toàn bộ Service Layer |
| **REMOTE_CONFIG_STANDARD.md** | Chuẩn cấu hình Firebase Remote Config |
| **API.md** | REST API endpoints (Backend) |
| **DATABASE.md** | Schema Database + Indexing |
| **FEATURES.md** | Danh sách tính năng chi tiết |
| **analytics_tracking_plan.md** | Kế hoạch theo dõi Analytics |

---

## 1. Triết Lý Kiến Trúc

### 1.1. Facade Pattern — "Viết 1 nơi, gọi mọi nơi"

Dự án VuFamily áp dụng triệt để mô hình **Facade** (Bức tường giả) để tách biệt hoàn toàn giao diện khỏi logic hệ thống:

```
┌──────────────┐          ┌─────────────────────────┐
│              │          │    SERVICE LAYER         │
│  Component   │──────▸   │                         │
│  (Feature)   │          │  api.js         → HTTP  │
│              │          │  AuthHelper.js  → Token │
│  Chỉ biết    │          │  TrackingHelper → Event │
│  GỌI hàm    │          │  I18nHelper     → Text  │
│              │          │  ConfigAPI      → Flags │
│              │          │  myLog          → Logs  │
└──────────────┘          └─────────────────────────┘
```

**Lợi ích:**
- Thay đổi provider (VD: đổi Firebase → Mixpanel) chỉ sửa 1 file, không sửa UI.
- Component sạch, dễ đọc, chỉ chứa logic hiển thị.
- Dễ test, dễ onboard developer mới.

### 1.2. Feature-based Architecture

Mỗi tính năng (Auth, Chat, Tree, Calendar...) là một module **hoàn toàn độc lập**:
- Có folder riêng trong `features/`
- Có Component JSX + CSS riêng
- Import Helper/Service từ `shared/` — không import chéo giữa các feature

---

## 2. Các Layer Chính

### Layer 1: Features (`features/`)
Giao diện người dùng. Mỗi feature là 1 folder chứa Component + CSS.

| Feature | Mô tả | Files chính |
|---------|--------|-------------|
| `auth/` | Đăng nhập, Đăng ký, Hồ sơ | `LoginPage.jsx`, `ProfileModal.jsx` |
| `tree/` | Vẽ phả đồ gia phả | `TreeCanvas.jsx`, `DetailPanel.jsx` |
| `newsfeed/` | Bảng tin gia đình | `NewsfeedPage.jsx` |
| `calendar/` | Lịch sự kiện, Sinh nhật | `CalendarPage.jsx` |
| `chat/` | Chat real-time + Gọi điện | `ChatPage.jsx`, `VoiceCall.jsx` |
| `history/` | Lịch sử chỉnh sửa | `HistoryPanel.jsx` |
| `requests/` | Duyệt yêu cầu | `RequestsPanel.jsx` |
| `system/` | Quản trị Admin | `SystemAdminPage.jsx` |
| `guide/` | Hướng dẫn sử dụng | `GuidePage.jsx` |

### Layer 2: Shared Services (`shared/services/`)
Logic dùng chung. KHÔNG chứa giao diện.

| Service | Vai trò |
|---------|---------|
| `api.js` | HTTP Client — Mọi fetch đều qua đây |
| `AuthHelper.js` | Quản lý Token/Session |
| `TrackingHelper.js` | Facade Analytics (Phễu event) |
| `TrackingFirebaseHelper.js` | Provider Firebase Analytics |
| `i18n.js` | Đa ngôn ngữ (VI/EN) |
| `chatCache.js` | IndexedDB cache cho Chat |
| `firebaseMessaging.js` | Push Notification |

### Layer 3: Shared Hooks (`shared/hooks/`)
Custom React Hooks tái sử dụng.

| Hook | Vai trò |
|------|---------|
| `useTranslation()` | Trả về `{ t, lang, changeLanguage }` cho i18n |
| `useRemoteConfig(key, type, fallback)` | Đọc Remote Config reactive |

### Layer 4: Shared Utils (`shared/utils/`)
Hàm tiện ích thuần (không phụ thuộc React).

| Util | Vai trò |
|------|---------|
| `logger.js` | `myLog`, `myError`, `myWarning` — bật/tắt theo module |
| `treeLayout.js` | Thuật toán sắp xếp cây gia phả |
| `lunarCalendar.js` | Chuyển đổi Âm-Dương lịch |

---

## 3. Quy Trình Phát Triển

### 3.1. Documentation-First
1. **Thiết kế** → Viết spec/doc trước khi code
2. **Review** → Chốt input/output, edge cases
3. **Code** → Bám sát tài liệu đã chốt
4. **Update doc** → Nếu phát sinh, sửa doc trước rồi mới sửa code

### 3.2. Thêm Tính Năng Mới (7 Bước)
1. Tạo folder `features/ten_tinh_nang/`
2. Tạo Component JSX + CSS
3. Thêm API endpoints → `shared/services/api.js`
4. Thêm i18n keys → `shared/services/i18n.js` (cả `vi` + `en`)
5. Thêm tracking events → `shared/services/TrackingHelper.js`
6. Thêm Feature Flag → `config.js`: `feature_xxx_enabled: true`
7. Đăng ký route `App.jsx` + menu `Sidebar.jsx`

### 3.3. Checklist Trước Commit
- [ ] Import đầy đủ (AuthHelper, TrackingHelper, useTranslation)
- [ ] Không còn `fetch()` trực tiếp trong Component
- [ ] Không còn `localStorage` trực tiếp trong Component
- [ ] Không còn `console.log` — đã dùng `myLog`
- [ ] Không còn text hard-code — đã dùng `t('key')`
- [ ] `npm run build` thành công 0 lỗi
- [ ] Test responsive Mobile viewport

---

## 4. Quy Tắc Lập Trình Chi Tiết

> Xem file **RULES.md** để đọc bộ quy tắc đầy đủ với ví dụ code.

### Tóm tắt nhanh:
| Quy tắc | ❌ Sai | ✅ Đúng |
|---------|-------|---------|
| API Call | `fetch('/api/users')` | `api.getUsers()` |
| Auth Token | `localStorage.getItem(...)` | `AuthHelper.getToken()` |
| Analytics | `logEvent(analytics, ...)` | `TrackingHelper.trackLoginSuccess()` |
| UI Text | `<span>Đăng xuất</span>` | `<span>{t('app.logout')}</span>` |
| Logging | `console.log(...)` | `myLog('MODULE', ...)` |
| CSS Color | `color: #3B6FCF` | `color: var(--primary)` |

---

## 5. Thiết Kế Chịu Tải (Scalability)

### 5.1. Feature Flags
- Bật/tắt tính năng qua Firebase Remote Config mà KHÔNG cần deploy
- Mọi tính năng có cờ `feature_xxx_enabled` trong `AppConfig`
- Sidebar tự ẩn/hiện menu item theo Feature Flag

### 5.2. Caching & Offline
- Chat messages được cache trong IndexedDB (`chatCache.js`)
- Remote Config có local fallback trong `AppConfig`
- Login hỗ trợ offline mode (dùng local users)

### 5.3. Database Optimization
- Index các cột thường WHERE/JOIN: `username`, `email`, `room_id`, `token`
- Tránh N+1 query — dùng batch query với `IN`
- Pagination cho mọi danh sách (messages, members, posts)

---

## 6. Bảo Mật

- JWT Token quản lý tập trung qua `AuthHelper`
- Server middleware kiểm tra token + role (RBAC) cho mọi endpoint
- Mật khẩu hash bằng `bcryptjs` phía server
- Biến nhạy cảm (API keys, DB password) trong `.env` — KHÔNG commit lên git
- Content-Security-Policy headers cho production
