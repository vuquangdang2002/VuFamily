# Gia Phả - Dòng Họ Vũ 🏛️

Ứng dụng web quản lý gia phả dòng họ Vũ — hiển thị cây gia phả, quản lý thành viên, thành tích, lịch sử chỉnh sửa.

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Vercel Serverless Functions (Node.js)
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel

## Cài đặt & Chạy Local

### 1. Clone và cài dependencies

```bash
git clone https://github.com/your-username/VuFamily.git
cd VuFamily
npm run install:all
```

### 2. Tạo Supabase Project

1. Truy cập [supabase.com](https://supabase.com) → tạo project mới
2. Vào **SQL Editor** → paste nội dung file `supabase-schema.sql` → chạy
3. Vào **Settings → API** → copy `URL` và `service_role key`

### 3. Cấu hình .env

```bash
cp .env.example .env
```

Sửa file `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...your-service-role-key
```

### 4. Chạy local

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api

## Deploy lên Vercel

### 1. Push code lên GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/VuFamily.git
git push -u origin main
```

### 2. Import vào Vercel

1. Truy cập [vercel.com](https://vercel.com) → Import Git Repository
2. Chọn repo `VuFamily`
3. Thêm **Environment Variables**:
   - `SUPABASE_URL` = `https://your-project.supabase.co`
   - `SUPABASE_SERVICE_KEY` = `eyJhbGci...`
4. Click **Deploy**

### 3. Xong! 🎉

Truy cập URL Vercel cung cấp → đăng nhập bằng:
- **Admin**: `dangvq` / `test123`
- **Admin**: `admin` / `admin123`
- **Viewer**: `viewer` / `viewer123`

## Tài khoản mặc định

| Username | Password | Role | Tên |
|----------|----------|------|-----|
| dangvq | test123 | admin | Vũ Quang Đáng |
| admin | admin123 | admin | Quản trị viên |
| viewer | viewer123 | viewer | Khách xem |

## Cấu trúc dự án

```
VuFamily/
├── api/                    # Vercel serverless functions
│   ├── auth/               # Login, logout, me, change-password
│   ├── members/            # CRUD members
│   ├── achievements/       # CRUD achievements
│   ├── requests/           # Update requests workflow
│   ├── users/              # User management
│   └── stats.js            # Statistics
├── client/                 # React + Vite frontend
│   └── src/
│       ├── components/     # React components
│       ├── services/       # API service layer
│       ├── styles/         # CSS styles
│       └── utils/          # Utilities (lunar calendar, etc.)
├── server/                 # Shared server logic (models, middleware)
│   ├── models/             # Database models (Supabase)
│   ├── middleware/         # Auth middleware
│   └── controllers/       # Request controllers
├── database/               # Database connection
│   └── supabase.js         # Supabase client
├── supabase-schema.sql     # Database schema + seed data
├── vercel.json             # Vercel configuration
└── package.json
```

## License

MIT
