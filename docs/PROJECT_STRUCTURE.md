# VuFamily — Cấu Trúc Dự Án (Project Structure)

> Dự án áp dụng kiến trúc **Feature-based + Service Layer (Facade Pattern)**.
> Mỗi tính năng là 1 module độc lập. Mọi logic dùng chung (API, Auth, Tracking, i18n) đều nằm tập trung trong `shared/`.

---

## Tổng Quan Cây Thư Mục

```
VuFamily/
│
├── client/                          # ── FRONTEND (React + Vite) ──
│   ├── src/
│   │   ├── main.jsx                 # Entry point — Mount React vào DOM
│   │   ├── App.jsx                  # Root Component — Routing, Auth, Layout
│   │   ├── config.js                # Cấu hình hệ thống (Static + Dynamic Config)
│   │   ├── firebase.js              # Khởi tạo Firebase (Analytics, Remote Config, Messaging)
│   │   │
│   │   ├── features/                # ── CÁC MODULE TÍNH NĂNG (Độc lập) ──
│   │   │   ├── auth/                # Đăng nhập, Đăng ký, Hồ sơ cá nhân
│   │   │   │   ├── LoginPage.jsx    #   Màn hình Đăng nhập / Đăng ký
│   │   │   │   ├── ProfileModal.jsx #   Popup chỉnh sửa Hồ sơ & Đổi mật khẩu
│   │   │   │   ├── ForceChangePasswordModal.jsx
│   │   │   │   └── Login.css
│   │   │   │
│   │   │   ├── tree/                # Vẽ cây Gia phả (Canvas 2D)
│   │   │   │   ├── TreeCanvas.jsx   #   Canvas vẽ phả đồ, zoom, pan
│   │   │   │   ├── DetailPanel.jsx  #   Panel xem chi tiết thành viên
│   │   │   │   └── MemberModal.jsx  #   Form thêm/sửa thành viên
│   │   │   │
│   │   │   ├── newsfeed/            # Bảng tin gia đình
│   │   │   ├── calendar/            # Lịch sự kiện, Sinh nhật, Ngày giỗ
│   │   │   ├── chat/                # Trò chuyện real-time + Gọi thoại/Video
│   │   │   │   ├── ChatPage.jsx     #   Giao diện Chat (rooms, messages)
│   │   │   │   ├── VoiceCall.jsx    #   Giao diện gọi thoại/video (WebRTC)
│   │   │   │   └── Chat.css / VoiceCall.css
│   │   │   │
│   │   │   ├── history/             # Lịch sử thay đổi phả đồ
│   │   │   ├── requests/            # Duyệt yêu cầu chỉnh sửa (Editor/Admin)
│   │   │   ├── system/              # Quản trị hệ thống (Admin only)
│   │   │   └── guide/               # Trang hướng dẫn sử dụng
│   │   │
│   │   ├── shared/                  # ── LÕI DÙNG CHUNG (Core Base) ──
│   │   │   │
│   │   │   ├── services/            # LỚP DỊCH VỤ (Service Layer / API Gateway)
│   │   │   │   ├── api.js           #   HTTP Client — Mọi fetch đều qua đây
│   │   │   │   ├── AuthHelper.js    #   Quản lý Token/Session (localStorage)
│   │   │   │   ├── TrackingHelper.js#   Facade Analytics — Phễu event tracking
│   │   │   │   ├── TrackingFirebaseHelper.js  # Provider: Firebase Analytics
│   │   │   │   ├── i18n.js          #   Đa ngôn ngữ (VI/EN) — Key-Value store
│   │   │   │   ├── chatCache.js     #   IndexedDB cache cho Chat offline
│   │   │   │   ├── firebaseMessaging.js  # Push Notification handler
│   │   │   │   └── sampleData.js    #   Dữ liệu mẫu (offline fallback)
│   │   │   │
│   │   │   ├── hooks/               # CUSTOM REACT HOOKS
│   │   │   │   ├── useTranslation.js#   Hook đa ngôn ngữ — cung cấp hàm t()
│   │   │   │   └── useRemoteConfig.js#  Hook đọc Remote Config an toàn
│   │   │   │
│   │   │   ├── components/          # UI COMPONENTS DÙNG CHUNG
│   │   │   │   ├── Sidebar.jsx/css  #   Thanh điều hướng chính (Navigation)
│   │   │   │   ├── Header.jsx/css   #   Header + Search bar
│   │   │   │   ├── Toast.jsx/css    #   Thông báo popup
│   │   │   │   ├── ThemeToggle.jsx  #   Chuyển đổi Light/Dark theme
│   │   │   │   ├── SplashLoading.*  #   Màn hình chờ khi khởi động
│   │   │   │   ├── Toolbar.jsx      #   Thanh công cụ phía trên
│   │   │   │   ├── Modal.css        #   Style chung cho Modal/Popup
│   │   │   │   ├── Responsive.css   #   Breakpoints responsive
│   │   │   │   └── ...các file CSS khác (Buttons, Common, Scrollbar...)
│   │   │   │
│   │   │   └── utils/               # HÀM TIỆN ÍCH
│   │   │       ├── logger.js        #   myLog/myError/myWarning (bật/tắt theo module)
│   │   │       ├── treeLayout.js    #   Thuật toán sắp xếp cây gia phả
│   │   │       ├── lunarCalendar.js #   Chuyển đổi lịch Âm-Dương
│   │   │       └── vietLunar.js     #   Tính ngày lễ Việt Nam
│   │   │
│   │   ├── styles/                  # DESIGN TOKENS & CSS TOÀN CỤC
│   │   │   ├── theme-light.css      #   Biến CSS cho Light theme
│   │   │   ├── theme-dark.css       #   Biến CSS cho Dark theme
│   │   │   └── index.css            #   CSS gốc (reset, typography)
│   │   │
│   │   └── assets/                  # Ảnh, icon tĩnh (login-hero, social icons...)
│   │
│   ├── index.html                   # HTML template
│   ├── vite.config.js               # Cấu hình Vite bundler
│   └── package.json
│
├── server/                          # ── BACKEND (Node.js + Express) ──
│   ├── index.js                     # Entry point — Khởi tạo Express + Socket.io
│   ├── config/                      # Cấu hình DB, hằng số
│   ├── controllers/                 # Logic nghiệp vụ (Business Logic)
│   ├── models/                      # Tương tác Database (Supabase)
│   ├── routes/                      # API endpoint definitions
│   │   └── api.js                   #   Tất cả RESTful routes
│   ├── middleware/                   # Auth middleware, RBAC
│   └── utils/
│       └── realtimeHub.js           # Socket.io Hub (Chat + Call signaling)
│
├── database/                        # Schema SQL, migrations
├── docs/                            # Tài liệu dự án (file này)
├── scripts/                         # Build scripts, automation
├── vercel.json                      # Cấu hình deploy Vercel
├── Dockerfile                       # Docker containerization
└── .env                             # Biến môi trường (KHÔNG commit)
```

---

## Luồng Dữ Liệu (Data Flow)

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│  Component   │────▸│  api.js      │────▸│  Express API │────▸│ Supabase │
│  (Feature)   │     │  (Service)   │     │  (Server)    │     │   (DB)   │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────┘
       │                    │
       │              ┌─────┴──────┐
       │              │ AuthHelper │ ←── localStorage (Token)
       │              └────────────┘
       │
       ├──▸ TrackingHelper ──▸ TrackingFirebaseHelper ──▸ Firebase Analytics
       │
       ├──▸ useTranslation() ──▸ I18nHelper ──▸ i18n.js (Key-Value store)
       │
       └──▸ ConfigAPI ──▸ AppConfig ←── Firebase Remote Config
```

---

## Quy Tắc Thêm Tính Năng Mới

1. Tạo folder trong `features/` (VD: `features/album/`)
2. Tạo Component chính (`AlbumPage.jsx`) + CSS (`Album.css`)
3. Thêm API endpoints vào `shared/services/api.js`
4. Thêm i18n keys vào `shared/services/i18n.js` (cả `vi` và `en`)
5. Thêm tracking events vào `shared/services/TrackingHelper.js`
6. Thêm Feature Flag vào `config.js`: `feature_album_enabled: true`
7. Đăng ký route trong `App.jsx` và menu item trong `Sidebar.jsx`
