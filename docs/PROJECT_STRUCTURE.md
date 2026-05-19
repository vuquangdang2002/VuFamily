# Cấu Trúc Dự Án VuFamily (Enterprise Architecture)

Dự án áp dụng kiến trúc Module hóa (Feature-based) kết hợp với Lớp Dịch Vụ trung tâm (Service Layer).

```
VuFamily/
├── client/                     # Frontend (React + Vite)
│   ├── src/
│   │   ├── config.js           # Biến môi trường và cấu hình chung
│   │   ├── App.jsx             # Root Component
│   │   ├── features/           # Các Module tính năng (Độc lập)
│   │   │   ├── auth/           # Đăng nhập, Hồ sơ, Đổi mật khẩu
│   │   │   ├── calendar/       # Lịch, Sự kiện, Sinh nhật
│   │   │   ├── chat/           # Trò chuyện, Gọi Video
│   │   │   ├── history/        # Lịch sử thay đổi Phả đồ
│   │   │   ├── newsfeed/       # Bảng tin gia đình
│   │   │   ├── requests/       # Duyệt yêu cầu chỉnh sửa
│   │   │   ├── system/         # Quản trị hệ thống (Admin)
│   │   │   └── tree/           # Vẽ cây Gia phả (Core)
│   │   │
│   │   ├── shared/             # Lõi dùng chung (Core Base)
│   │   │   ├── components/     # UI Components (Sidebar, Button, Modal...)
│   │   │   ├── hooks/          # React Hooks (useTranslation, useRemoteConfig...)
│   │   │   ├── services/       # LỚP DỊCH VỤ (API Gateway & Helpers)
│   │   │   │   ├── api.js      # Giao tiếp HTTP Fetch với Backend
│   │   │   │   ├── AuthHelper.js # Xử lý LocalStorage Token 
│   │   │   │   ├── i18n.js     # Đa ngôn ngữ (Localization)
│   │   │   │   ├── TrackingHelper.js # Gửi dữ liệu Analytics (Facade)
│   │   │   │   └── firebaseMessaging.js # Xử lý Push Notification
│   │   │   └── utils/          # Công cụ xử lý ngày âm, log, tiện ích
│   │   │
│   │   └── styles/             # Design Tokens (theme-light.css, Animations)
│
├── server/                     # Backend (NodeJS + Express)
│   ├── api/                    # RESTful Endpoints (Auth, Users, Chats)
│   └── utils/                  # Xử lý Realtime (Socket.io RealtimeHub)
│
└── docs/                       # Tài liệu dự án
```
