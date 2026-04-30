# Cấu trúc Dự án và Nguyên tắc Lập trình (Project Structure & Rules)

Tài liệu này định nghĩa cấu trúc chuẩn và các quy tắc lập trình bắt buộc cho dự án VuFamily, đảm bảo hệ thống dễ bảo trì, mở rộng, dễ debug và hoạt động ổn định.

---

## 1. Cấu trúc Dự án (MVC Architecture)

Dự án tuân thủ mô hình **MVC (Model-View-Controller)**, tách biệt rõ ràng giữa logic nghiệp vụ, giao diện và dữ liệu. Cấu trúc thư mục được chia làm 2 phần chính: `client` (View) và `server` (Controller, Model, API).

```text
VuFamily/
├── client/                     # [VIEW] Ứng dụng Frontend (React + Vite)
│   ├── src/
│   │   ├── assets/             # Hình ảnh, icon, font tĩnh
│   │   ├── features/           # Các tính năng chính (mỗi tính năng là 1 folder riêng)
│   │   │   ├── auth/           # Chứa View cho Login, Register
│   │   │   ├── chat/           # Chứa View cho ChatPage
│   │   │   ├── ...
│   │   ├── shared/             # Các thành phần dùng chung
│   │   │   ├── components/     # UI Components dùng chung (Sidebar, Toast, Modal...)
│   │   │   ├── services/       # Các service gọi API, xử lý logic dùng chung (api.js, chatCache.js)
│   │   │   └── utils/          # Các hàm helper, tiện ích (format date, validation...)
│   │   ├── styles/             # CSS toàn cục (index.css)
│   │   ├── App.jsx             # Component gốc, cấu hình routing
│   │   └── main.jsx            # Entry point của React
│   ├── index.html
│   └── package.json
│
├── server/                     # [BACKEND] Node.js + Express
│   ├── config/                 # TẬP TRUNG CẤU HÌNH (DB, Env, Constants)
│   │   ├── supabase.js         # Khởi tạo kết nối DB
│   │   └── constants.js        # Các biến hằng số dùng chung
│   ├── controllers/            # [CONTROLLER] Xử lý logic nghiệp vụ
│   │   ├── authController.js
│   │   ├── chatController.js
│   │   └── ...
│   ├── models/                 # [MODEL] Định nghĩa dữ liệu và các hàm tương tác trực tiếp với DB
│   │   ├── User.js
│   │   ├── ChatMessage.js
│   │   └── ...
│   ├── routes/                 # [API] Định nghĩa các API endpoints và route
│   │   └── api.js              # Ánh xạ endpoint tới Controller tương ứng
│   ├── middleware/             # Các hàm trung gian (Auth, Phân quyền, Error Handling)
│   │   └── auth.js             # Middleware xác thực token, kiểm tra role (requireAdmin, requireEditor)
│   ├── api/                    # Dành cho serverless function (Vercel deployment)
│   │   └── index.js            # Entry point cho Vercel serverless
│   ├── app.js                  # Khởi tạo Express app, cấu hình middleware tổng
│   ├── server.js               # Entry point chạy local server
│   └── package.json
│
├── database/                   # Khởi tạo và thiết kế Database
│   ├── schema.sql              # Cấu trúc bảng và phân quyền (RLS)
│   └── ...
├── docs/                       # Tài liệu dự án
└── .env                        # Các biến môi trường nhạy cảm (KHÔNG commit lên git)
```

```

```

---

## 2. Quy trình Phát triển: Documentation-First (Viết Doc trước, Code sau)
Đối với các hệ thống lớn, việc sửa đi sửa lại code do không thống nhất từ đầu là một thảm họa. Vì vậy, quy trình phát triển bắt buộc:
1. **Thiết kế & Viết Document**: Trước khi code bất kỳ tính năng mới nào (API, Database schema, Logic phức tạp), phải thiết kế rõ ràng và cập nhật vào thư mục `docs/`.
2. **Review & Chốt kiến trúc**: Đảm bảo các thành viên hiểu rõ input/output, các case lỗi (fallback) và cấu trúc dữ liệu.
3. **Triển khai Code**: Bám sát tài liệu đã chốt. Nếu trong quá trình code có phát sinh, phải quay lại sửa document trước.

---

## 3. Quy tắc Đặt tên (Naming Conventions) Tường minh
Để code dễ đọc và dễ bảo trì bởi nhiều người (hoặc chính bạn sau vài tháng), việc đặt tên phải rõ ràng, tránh viết tắt tối nghĩa:
- **Tên Biến/Hàm (CamelCase)**: Đặt tên theo đúng hành động và đối tượng. (VD: `getUserActiveRooms()` thay vì `getRooms()`, `chatMessageList` thay vì `msgList`).
- **Class Model (PascalCase)**: Tên Class thể hiện đúng thực thể và hậu tố `Model`. (VD: `ChatRoomModel` thay vì `Chat`, `UserAccountModel`).
- **Cấu hình (Screaming Snake Case)**: Tên hằng số config phải viết hoa toàn bộ và thể hiện rõ ngữ cảnh. (VD: `MAX_CHAT_MESSAGES_PER_PAGE`, `CALL_UNANSWERED_TIMEOUT_MS`). Tránh các tên chung chung như `LIMIT` hay `TIMEOUT`.

---

## 4. Thiết kế Hệ thống Lớn & Chịu tải cao (High-Availability & Scale)

Hệ thống được thiết kế theo chuẩn của các ứng dụng lớn (như Messenger, Facebook) với các nguyên tắc sau:

### 2.1. Feature Flags (Bật/Tắt tính năng động)
Mọi tính năng lớn (Gọi điện, Chat, Lưu trữ lịch sử) cần phải được gắn cờ (Feature Toggles) trong `server/config/constants.js`. Việc này giúp hệ thống:
- Dễ dàng tắt một tính năng bị lỗi (ví dụ: tắt gọi điện) mà không làm sập toàn bộ web.
- Rollout dần dần tính năng mới.
**Quy tắc:** Mọi Controller của tính năng mới phải kiểm tra cờ này đầu tiên (VD: `if (!FEATURES.ENABLE_CALL_SYSTEM) return res.status(503)...`).

### 2.2. Timeouts & Fallbacks
Các tính năng thời gian thực hoặc phụ thuộc bên thứ 3 phải có Timeout. 
- **Ví dụ gọi điện (Call System)**: Khi tạo cuộc gọi, nếu sau `TIMEOUTS.CALL_RINGING_TIMEOUT_MS` (ví dụ 30 giây) mà đầu kia không bắt máy, hệ thống tự động:
  1. Hủy trạng thái `calling` -> `missed`.
  2. Bắn một tin nhắn tự động "📞 Cuộc gọi nhỡ" vào hệ thống Chat.

### 2.3. Tối ưu dữ liệu lớn (Pagination & Caching)
- Không bao giờ trả về toàn bộ dữ liệu (như lịch sử chat) trong 1 lần. Phải có Limit và Lazy Loading (ví dụ: dùng `?since=` hoặc lấy 50-100 tin nhắn mỗi lần).
- Cache dữ liệu tĩnh hoặc ít thay đổi ở Client (như IndexedDB cho Chat).

---

## 5. Tối ưu Database & Hiệu năng Query (Big Data & High Performance)

Hệ thống phải được thiết kế để chịu tải khi lượng dữ liệu phình to (Big Data), trả kết quả "siêu nhanh" để tránh nghẽn server.

### 5.1. Tối ưu Indexing & Tìm kiếm
- **Index các cột thường xuyên tìm kiếm**: Các cột dùng trong điều kiện `WHERE` (như `username`, `email`, `token`) hoặc các khóa ngoại (Foreign Keys như `user_id`, `room_id`) **bắt buộc** phải được đánh Index (`CREATE INDEX`) dưới Database. Việc này giúp việc tra cứu tài khoản mất vài mili-giây thay vì quét toàn bộ bảng.
- **Tránh dùng `SELECT *`**: Chỉ select đúng những cột cần thiết. Tránh việc kéo dữ liệu thừa qua mạng gây chậm phản hồi.

### 5.2. Chống nghẽn N+1 Queries
- Tuyệt đối không gọi Query Database bên trong vòng lặp `for/map`. 
- **Quy tắc**: Gom ID lại thành một mảng và gọi query bằng mệnh đề `IN` (Ví dụ: `supabase.from('users').in('id', userIds)`) để lấy dữ liệu trong 1 lần gọi (Batch Query), sau đó map dữ liệu lại bằng logic code (Javascript).

### 5.3. Full-Text Search
- Thay vì dùng `LIKE '%keyword%'` gây rớt hiệu năng nghiêm trọng trên dữ liệu lớn, hãy cấu hình tính năng **Full-Text Search** của PostgreSQL/Supabase để phục vụ tính năng tìm kiếm.

---

## 6. Các Nguyên tắc Lập trình (Coding Rules)

### 6.1. Phân tách trách nhiệm (Separation of Concerns - MVC)
- **API (Routes)**: Chỉ làm nhiệm vụ định nghĩa endpoint, middleware (xác thực) và gọi Controller. KHÔNG viết logic xử lý dữ liệu ở đây.
- **Controller**: Xử lý logic nghiệp vụ (business logic), nhận request từ Route, gọi Model để lấy/lưu dữ liệu, xử lý kết quả và trả về response cho View (Client).
- **Model**: Chỉ chịu trách nhiệm tương tác với Database (Supabase). Các câu query, insert, update, delete phải nằm ở đây.
- **View (Client)**: Chỉ hiển thị dữ liệu và nhận tương tác từ người dùng. Mọi logic gọi data phải tách ra service hoặc utils.

### 6.2. Chuẩn mực Viết Code & Fallback (Xử lý lỗi)
Mọi tính năng quan trọng (đặc biệt là call API hoặc tương tác DB) bắt buộc phải có cơ chế xử lý lỗi và fallback.

- **Luôn dùng `try...catch`**: Bao bọc các thao tác bất đồng bộ (`async/await`) trong khối `try...catch`.
- **Trả về response chuẩn**: Server luôn trả về định dạng `{ success: boolean, data: any, message: string, error: string }`.
- **Fallback UI (Client)**: Khi API lỗi hoặc mất mạng, UI không được crash trắng trang. Phải có:
  - Trạng thái Loading.
  - Thông báo lỗi thân thiện (Toast / Alert).
  - Sử dụng Cache (như IndexedDB cho Chat) để hiển thị dữ liệu offline hoặc fallback khi server phản hồi chậm.

**Ví dụ chuẩn Controller:**
```javascript
// Tốt: Xử lý lỗi đầy đủ
async function getMessages(req, res) {
    try {
        const data = await ChatModel.getMessages(req.params.roomId);
        res.json({ success: true, data });
    } catch (error) {
        console.error(`[ChatController - getMessages] Lỗi lấy tin nhắn room ${req.params.roomId}:`, error);
        res.status(500).json({ success: false, error: 'Không thể tải tin nhắn. Vui lòng thử lại.' });
    }
}
```

### 6.3. Xử lý Log (Logging)
Để dễ dàng debug và bảo trì sau này, cần thiết lập quy tắc ghi log rõ ràng:
- **Client**: Hạn chế `console.log` bừa bãi. Chỉ log khi có `error` hoặc trong môi trường `development`.
- **Server**: Phải log các thông tin quan trọng:
  - Lỗi hệ thống/Database (bắt buộc dùng `console.error` với prefix rõ ràng: `[Module_Name] [Action] Error: ...`).
  - Các hành động nhạy cảm (Đăng nhập sai nhiều lần, Xóa user, Thay đổi phân quyền).
- Tương lai: Nên tích hợp 1 thư viện logging chuyên dụng (như Winston hoặc Morgan) để ghi log ra file hoặc service theo dõi (Sentry).

### 6.4. Quản lý Cấu hình (Configuration)
- **Tách biệt Config**: Tất cả các giá trị cấu hình (URL, API keys, timeout, hằng số phân quyền) **KHÔNG** được hardcode rải rác trong code.
- **Môi trường (.env)**: Thông tin nhạy cảm (Supabase Key, JWT Secret) phải nằm trong `.env`.
- **File Config**: Tạo file `server/config/constants.js` hoặc `client/src/shared/utils/constants.js` để chứa các hằng số dùng chung (ví dụ: `MAX_CACHE_ITEMS = 10`, `ROLE_ADMIN = 'admin'`). Khi cần đổi, chỉ sửa 1 file duy nhất.

### 6.5. Bảo trì & Nâng cấp dễ dàng (Maintainability)
- **Hàm nhỏ và tập trung (Single Responsibility Principle)**: Mỗi hàm chỉ làm 1 việc duy nhất. Nếu hàm quá dài (>100 dòng), hãy tách nhỏ thành các helper functions.
- **Comment Code**: Viết JSDoc hoặc comment giải thích rõ ràng TẠI SAO (Why) đoạn code này tồn tại cho những logic phức tạp, thay vì mô tả NÓ LÀM GÌ (What - vì code tự mô tả).
- **Tái sử dụng (Reusable)**: Các đoạn UI lặp lại (Button, Input, Modal) hoặc logic lặp lại (hàm format ngày, gọi API) phải được chuyển vào thư mục `shared`.

### 6.6. Quản lý Package và Dependency
- **Sử dụng bản MỚI nhưng ỔN ĐỊNH**: Khi cài mới hoặc nâng cấp package, ưu tiên các bản phát hành ổn định (Stable/LTS), tránh các bản Alpha/Beta/RC.
- **Ghim phiên bản**: Trong `package.json`, nên ghim cứng phiên bản (ví dụ `"react": "18.2.0"`) hoặc dùng dấu `^` một cách có kiểm soát để tránh việc tự động cập nhật lên phiên bản có breaking changes làm hỏng app.
- **Xóa package rác**: Định kỳ kiểm tra và gỡ bỏ các thư viện không còn sử dụng để giảm dung lượng bundle và rủi ro bảo mật.
