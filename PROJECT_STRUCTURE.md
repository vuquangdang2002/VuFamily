# 📁 VuFamily — Cấu Trúc Dự Án

> **Gia Phả — Dòng Họ Vũ**
> Ứng dụng web quản lý gia phả dòng họ, sử dụng kiến trúc cloud-native.

---

## 🏗️ Kiến Trúc Tổng Quan

```
┌──────────────────────────────────────────────────────────────────┐
│                        VERCEL (Hosting)                          │
│  ┌────────────────────┐   ┌──────────────────────────────────┐  │
│  │   Static Files     │   │   Serverless Function            │  │
│  │   (client/dist/)   │   │   (api/index.js → Express app)   │  │
│  │   React SPA        │   │         ↓                        │  │
│  │                    │   │   server/routes/api.js            │  │
│  └────────────────────┘   │   server/models/*.js             │  │
│           ↑               │   server/middleware/auth.js       │  │
│      Browser renders      │         ↓                        │  │
│                           │   database/supabase.js           │  │
│                           └──────────┬───────────────────────┘  │
│                                      │                          │
└──────────────────────────────────────┼──────────────────────────┘
                                       │ HTTPS
                              ┌────────▼────────┐
                              │   SUPABASE      │
                              │   PostgreSQL    │
                              │   (Cloud DB)    │
                              └─────────────────┘
```

---

## 📂 Cây Thư Mục

```
VuFamily/
├── 📁 api/                          # ── VERCEL SERVERLESS ENTRY ──
│   └── index.js                     #   Entry point duy nhất, import Express app
│
├── 📁 server/                       # ── BACKEND (Express.js) ──
│   ├── index.js                     #   Express app (export cho Vercel + local dev)
│   ├── 📁 config/
│   │   └── index.js                 #   Cấu hình (PORT, DB_PATH, CORS, NODE_ENV)
│   ├── 📁 routes/
│   │   └── api.js                   #   Định tuyến API: auth, users, members, posts, requests
│   ├── 📁 controllers/
│   │   └── memberController.js      #   Logic CRUD thành viên (getAll, create, update, delete...)
│   ├── 📁 models/
│   │   ├── Member.js                #   Model: Thành viên gia phả (Supabase queries)
│   │   ├── Post.js                  #   Model: Bài đăng bảng tin (Supabase queries)
│   │   └── UpdateRequest.js         #   Model: Yêu cầu chỉnh sửa từ viewer
│   └── 📁 middleware/
│       ├── auth.js                  #   Xác thực: login, logout, session, RBAC, forgot password
│       └── errorHandler.js          #   Middleware xử lý lỗi và 404
│
├── 📁 database/                     # ── DATABASE LAYER ──
│   ├── supabase.js                  #   Supabase client (createClient)
│   ├── connection.js                #   [Legacy] SQLite connection (chỉ local dev cũ)
│   ├── init.js                      #   [Legacy] SQLite schema + seed (chỉ local dev cũ)
│   ├── family.db                    #   [Legacy] SQLite DB file
│   └── accounts.db                  #   [Legacy] SQLite DB file
│
├── 📁 client/                       # ── FRONTEND (React + Vite) ──
│   ├── index.html                   #   HTML entry
│   ├── vite.config.js               #   Vite config (proxy /api → localhost:3000)
│   ├── package.json                 #   Frontend dependencies (react, vite)
│   └── 📁 src/
│       ├── main.jsx                 #   React DOM render
│       ├── App.jsx                  #   Root component — routing, auth state, page switching
│       │
│       ├── 📁 components/           #   ── UI COMPONENTS ──
│       │   ├── LoginPage.jsx        #     Trang đăng nhập + quên mật khẩu
│       │   ├── Sidebar.jsx          #     Menu điều hướng (admin/viewer adaptive)
│       │   ├── Header.jsx           #     Thanh header (tìm kiếm, thống kê)
│       │   ├── Toolbar.jsx          #     Thanh công cụ (đổi theme)
│       │   │
│       │   ├── TreeCanvas.jsx       #     🌳 Sơ đồ gia phả (canvas-based rendering)
│       │   ├── DetailPanel.jsx      #     Panel chi tiết thành viên (slide-in)
│       │   ├── MemberModal.jsx      #     Modal thêm/sửa thành viên
│       │   ├── PhotoCropper.jsx     #     Cắt ảnh đại diện
│       │   │
│       │   ├── NewsfeedPage.jsx     #     📰 Bảng tin dòng họ (posts API + contacts)
│       │   ├── CalendarPage.jsx     #     📅 Lịch sinh nhật & giỗ
│       │   ├── HistoryPanel.jsx     #     📜 Lịch sử thao tác
│       │   ├── RequestsPanel.jsx    #     📋 Yêu cầu chỉnh sửa (admin review)
│       │   ├── AccountsPage.jsx     #     👥 Quản lý tài khoản (admin only)
│       │   │
│       │   ├── ThemeToggle.jsx      #     🌙 Chuyển đổi sáng/tối
│       │   └── Toast.jsx            #     Thông báo pop-up
│       │
│       ├── 📁 services/
│       │   └── api.js               #     API client + localStorage fallback (offline)
│       │
│       ├── 📁 utils/
│       │   ├── treeLayout.js        #     Thuật toán layout cây gia phả
│       │   ├── vietLunar.js         #     Chuyển đổi lịch âm Việt Nam
│       │   ├── lunarCalendar.js     #     Logic calendar âm dương
│       │   └── lunar.js             #     [Vendor] Thư viện tính lịch âm
│       │
│       ├── 📁 styles/
│       │   └── index.css            #     Toàn bộ CSS (design system + component styles)
│       │
│       └── 📁 assets/
│           ├── 📁 icons/            #     Icon PNG (Zalo, Facebook, Messenger)
│           └── 📁 pictures/         #     Ảnh thành viên
│
├── 📁 scripts/                      # ── UTILITY SCRIPTS ──
│   └── generate-hashes.js           #     Script tạo bcrypt hash cho seed data
│
├── 📁 public/                       # ── STATIC FILES (Express legacy) ──
│   └── ...                          #     Served bởi Express khi chạy local
│
├── ── CONFIG FILES ──
│   ├── .gitattributes               #   Git line-ending rules + linguist config
│   ├── .gitignore                   #   Ignore rules
│   ├── .vercelignore                #   Vercel ignore rules
│   ├── .env                         #   Biến môi trường (KHÔNG commit, local only)
│   ├── .env.example                 #   Mẫu biến môi trường
│   ├── vercel.json                  #   Vercel deployment config
│   ├── package.json                 #   Root dependencies (backend)
│   ├── package-lock.json            #   Lock file
│   ├── supabase-schema.sql          #   PostgreSQL schema + seed (chạy trên Supabase)
│   ├── README.md                    #   Hướng dẫn sử dụng
│   └── PROJECT_STRUCTURE.md         #   File này
```

---

## 🔌 API Endpoints

### Authentication
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| `POST` | `/api/auth/login` | Không | Đăng nhập |
| `POST` | `/api/auth/logout` | ✅ | Đăng xuất |
| `GET` | `/api/auth/me` | ✅ | Lấy thông tin user hiện tại |
| `POST` | `/api/auth/change-password` | ✅ | Đổi mật khẩu |
| `POST` | `/api/auth/forgot-password` | Không | Quên mật khẩu (gửi email) |

### Users (Admin only)
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| `GET` | `/api/users` | 👑 Admin | Danh sách tài khoản |
| `POST` | `/api/users` | 👑 Admin | Tạo tài khoản mới |
| `DELETE` | `/api/users/:id` | 👑 Admin | Xóa tài khoản |
| `POST` | `/api/users/:id/reset-password` | 👑 Admin | Đặt lại mật khẩu |

### Members
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| `GET` | `/api/members` | Không | Danh sách thành viên |
| `GET` | `/api/members/:id` | Không | Chi tiết 1 thành viên |
| `GET` | `/api/members/search?q=` | Không | Tìm kiếm |
| `GET` | `/api/members/:id/children` | Không | Danh sách con |
| `GET` | `/api/members/:id/achievements` | Không | Thành tựu |
| `POST` | `/api/members` | 👑 Admin | Thêm thành viên |
| `PUT` | `/api/members/:id` | 👑 Admin | Cập nhật thành viên |
| `DELETE` | `/api/members/:id` | 👑 Admin | Xóa thành viên |

### Posts (Bảng tin)
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| `GET` | `/api/posts` | Không | Danh sách bài đăng |
| `POST` | `/api/posts` | ✅ | Đăng bài mới |
| `DELETE` | `/api/posts/:id` | 👑 Admin | Xóa bài đăng |

### Requests (Yêu cầu chỉnh sửa)
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| `GET` | `/api/requests` | ✅ | Danh sách yêu cầu |
| `GET` | `/api/requests/pending` | 👑 Admin | Yêu cầu chờ duyệt |
| `POST` | `/api/requests` | ✅ | Gửi yêu cầu mới |
| `POST` | `/api/requests/:id/approve` | 👑 Admin | Duyệt yêu cầu |
| `POST` | `/api/requests/:id/reject` | 👑 Admin | Từ chối yêu cầu |

### Other
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| `GET` | `/api/stats` | Không | Thống kê tổng quan |

---

## 🗄️ Database Schema (Supabase PostgreSQL)

```
┌──────────────┐     ┌──────────────┐
│  family_meta │     │    users     │
│──────────────│     │──────────────│
│ id           │     │ id           │
│ family_name  │     │ username     │
│ description  │     │ password     │
│ origin_place │     │ display_name │
│ created_at   │     │ role         │
└──────────────┘     │ token        │
                     │ created_at   │
                     └──────┬───────┘
                            │ 1:N
                     ┌──────▼───────┐        ┌──────────────────┐
                     │    posts     │        │ update_requests  │
                     │──────────────│        │──────────────────│
                     │ id           │        │ id               │
                     │ content      │        │ user_id → users  │
                     │ author       │        │ member_id        │
                     │ author_role  │        │ changes          │
                     │ user_id      │        │ status           │
                     │ created_at   │        │ reviewed_by      │
                     └──────────────┘        │ reject_reason    │
                                             └──────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   members    │     │ achievements │     │    events    │
│──────────────│     │──────────────│     │──────────────│
│ id           │     │ id           │     │ id           │
│ name         │     │ member_id ──►│     │ member_id ──►│
│ gender       │     │ category     │     │ event_type   │
│ birth_date   │     │ title        │     │ event_date   │
│ death_date   │     │ organization │     │ title        │
│ parent_id ──►│     │ start_year   │     │ description  │
│ spouse_id ──►│     │ end_year     │     └──────────────┘
│ generation   │     │ description  │
│ photo        │     └──────────────┘
│ ...          │
└──────────────┘
```

---

## ⚙️ Environment Variables

| Biến | Mô tả | Bắt buộc |
|------|--------|----------|
| `SUPABASE_URL` | URL project Supabase | ✅ |
| `SUPABASE_SERVICE_KEY` | Service role key Supabase | ✅ |
| `RESEND_API_KEY` | API key từ resend.com (gửi email) | Tùy chọn |
| `ADMIN_EMAIL` | Email nhận thông báo quên mật khẩu | Tùy chọn |
| `APP_URL` | URL ứng dụng live (cho link trong email) | Tùy chọn |
| `PORT` | Port Express local (mặc định: 3000) | Không |
| `NODE_ENV` | development / production | Không |

---

## 🚀 Quy Trình Deploy

```
1. Code → Push GitHub
2. Vercel auto-detect → Build client (Vite)
3. Vercel bundle → api/index.js (Express as Serverless)
4. Vercel serve → Static SPA + API routes
5. API → Supabase PostgreSQL
```

---

## 🔐 Authorization Model

```
┌─────────────┐          ┌─────────────┐
│   Admin     │          │   Viewer    │
│─────────────│          │─────────────│
│ ✅ CRUD      │          │ ✅ Read      │
│ ✅ Users     │          │ ✅ Post news │
│ ✅ Approve   │          │ ✅ Request   │
│ ✅ Delete    │          │ ❌ Write     │
│ ✅ Reset PW  │          │ ❌ Delete    │
└─────────────┘          └─────────────┘
```

---

## 📦 Tech Stack

| Layer | Technology | Phiên bản |
|-------|-----------|-----------|
| Frontend | React (Vite) | 18.x |
| Styling | Vanilla CSS | — |
| Backend | Express.js | 4.x |
| Database | PostgreSQL (Supabase) | 15+ |
| Hosting | Vercel | Hobby |
| Email | Resend | — |
| Auth | bcryptjs + token-based sessions | — |
