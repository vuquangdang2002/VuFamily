# 🏗️ Architecture — VuFamily

> Kiến trúc ứng dụng và quy ước phát triển

---

## 1. Tổng Quan Kiến Trúc

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (React SPA)                       │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐ │
│  │   Auth   │ │   Tree   │ │Newsfeed  │ │   Calendar     │ │
│  │ Feature  │ │ Feature  │ │Feature   │ │   Feature      │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │ Accounts │ │ Requests │ │ History  │                    │
│  │ Feature  │ │ Feature  │ │ Feature  │                    │
│  └──────────┘ └──────────┘ └──────────┘                    │
│                     │                                        │
│              fetch('/api/...')                                │
└─────────────────────┼───────────────────────────────────────┘
                      │ HTTPS
┌─────────────────────┼───────────────────────────────────────┐
│              VERCEL SERVERLESS                               │
│                     │                                        │
│  ┌──────────────────▼─────────────────────────────────────┐ │
│  │              api/index.js → Express App                 │ │
│  │                                                         │ │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ │ │
│  │  │  Auth   │ │ Members  │ │  Posts    │ │ Requests  │ │ │
│  │  │ Routes  │ │  Routes  │ │  Routes  │ │  Routes   │ │ │
│  │  └────┬────┘ └────┬─────┘ └────┬─────┘ └────┬──────┘ │ │
│  │       │           │            │             │         │ │
│  │  ┌────▼───────────▼────────────▼─────────────▼──────┐ │ │
│  │  │              Supabase Client                      │ │ │
│  │  └──────────────────────┬────────────────────────────┘ │ │
│  └─────────────────────────┼─────────────────────────────┘ │
└─────────────────────────────┼───────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  SUPABASE          │
                    │  PostgreSQL Cloud  │
                    │  (9 tables)        │
                    └────────────────────┘
```

---

## 2. Feature-Based Structure (Target)

Dự án đang chuyển sang cấu trúc **feature-based** thay vì **type-based** truyền thống.

### Server (Backend)

```
server/
├── index.js                     # Express app entry
├── shared/                      # Shared utilities
│   ├── config.js                # Environment config
│   ├── supabase.js              # Database client
│   └── errorHandler.js          # Error middleware
│
├── features/
│   ├── auth/                    # Authentication & Users
│   │   ├── auth.middleware.js   # authenticate, requireAdmin
│   │   ├── auth.controller.js   # login, logout, forgotPassword...
│   │   └── auth.routes.js       # POST /auth/login, etc.
│   │
│   ├── members/                 # Quản lý thành viên
│   │   ├── member.model.js      # Supabase queries
│   │   ├── member.controller.js # CRUD logic
│   │   └── member.routes.js     # GET/POST/PUT/DELETE /members
│   │
│   ├── posts/                   # Bảng tin
│   │   ├── post.model.js        # Post CRUD
│   │   ├── comment.model.js     # Comment CRUD
│   │   ├── reaction.model.js    # Reaction toggle
│   │   └── post.routes.js       # /posts, /posts/:id/comments, etc.
│   │
│   └── requests/                # Yêu cầu chỉnh sửa
│       ├── request.model.js     # Request queries
│       └── request.routes.js    # /requests
```

### Client (Frontend)

```
client/src/
├── main.jsx                     # React entry
├── App.jsx                      # Root component, routing
│
├── shared/                      # Shared/Common
│   ├── components/
│   │   ├── Sidebar.jsx
│   │   ├── Header.jsx
│   │   ├── Toast.jsx
│   │   └── Toolbar.jsx
│   ├── hooks/
│   │   └── useTheme.js
│   ├── services/
│   │   └── api.js
│   ├── utils/
│   │   ├── treeLayout.js
│   │   ├── vietLunar.js
│   │   └── lunarCalendar.js
│   └── styles/
│       └── index.css
│
├── features/
│   ├── auth/
│   │   └── LoginPage.jsx
│   ├── tree/
│   │   ├── TreeCanvas.jsx
│   │   ├── DetailPanel.jsx
│   │   ├── MemberModal.jsx
│   │   └── PhotoCropper.jsx
│   ├── newsfeed/
│   │   └── NewsfeedPage.jsx
│   ├── calendar/
│   │   └── CalendarPage.jsx
│   ├── accounts/
│   │   └── AccountsPage.jsx
│   ├── history/
│   │   └── HistoryPanel.jsx
│   └── requests/
│       └── RequestsPanel.jsx
│
└── assets/
    ├── icons/
    └── pictures/
```

---

## 3. Data Flow

```
User Action → Component → fetch('/api/...') → Express Router
    → Controller → Model → Supabase SDK → PostgreSQL
    → Response → Component State → Re-render
```

### Authentication Flow
```
Login → POST /auth/login → bcrypt verify → generate token → store in DB
     → return token → localStorage → x-auth-token header for all requests
```

### Reaction Toggle Flow
```
Click emoji → POST /posts/:id/reactions { emoji }
    → Check if reaction exists (user_id + post_id + emoji)
    → Exists? DELETE : INSERT
    → Refresh post list
```

---

## 4. Environment

| Env | Value | Required |
|-----|-------|----------|
| `SUPABASE_URL` | Supabase project URL | ✅ |
| `SUPABASE_SERVICE_KEY` | Service role secret key | ✅ |
| `RESEND_API_KEY` | Resend.com API key | Optional |
| `ADMIN_EMAIL` | Email nhận thông báo | Optional |
| `APP_URL` | URL ứng dụng live | Optional |

---

## 5. Deployment

| Step | Tool | Action |
|------|------|--------|
| 1 | Git | Push to `main` branch |
| 2 | Vercel | Auto-detect build (Vite) |
| 3 | Vercel | Bundle `api/index.js` as Serverless Function |
| 4 | Vercel | Serve static SPA + API |
| 5 | Supabase | PostgreSQL cloud DB |

---

## 6. Authorization Matrix

| Action | Admin | Viewer |
|--------|-------|--------|
| Xem gia phả | ✅ | ✅ |
| Thêm/sửa/xóa thành viên | ✅ | ❌ |
| Đăng bài bảng tin | ✅ | ✅ |
| Bình luận | ✅ | ✅ |
| React emoji | ✅ | ✅ |
| Xóa bài/comment | ✅ | ❌ |
| Quản lý tài khoản | ✅ | ❌ |
| Duyệt yêu cầu chỉnh sửa | ✅ | ❌ |
| Gửi yêu cầu chỉnh sửa | ✅ | ✅ |
| Import/Export dữ liệu | ✅ | ❌ |

---

## 7. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Vanilla CSS (Design System) |
| Backend | Express.js 4 |
| Database | PostgreSQL (Supabase) |
| Hosting | Vercel (Hobby) |
| Email | Resend |
| Auth | bcryptjs + token sessions |
| Version Control | Git + GitHub |
