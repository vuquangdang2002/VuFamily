# Tiêu chuẩn Tài liệu & Cấu trúc Tính năng (Feature Standard)

Để đảm bảo tính nhất quán, dễ bảo trì và làm cơ sở (chuẩn) để phát triển hoặc viết lại toàn bộ dự án trong tương lai, MỌI TÍNH NĂNG (Feature) trong hệ thống VuFamily đều phải được tài liệu hóa và phát triển theo cấu trúc 3 lớp rõ ràng dưới đây.

Đồng thời, mã nguồn bắt buộc phải tuân thủ nghiêm ngặt quy định về Comment và Logging bằng Tiếng Việt.

---

## 1. Cấu trúc của một Feature (Mô hình 3 lớp)

Khi xây dựng một tính năng mới hoặc tài liệu hóa tính năng cũ, phải chia tách rõ ràng thành 3 thành phần:

### A. Frontend (UI / HTML / JS / CSS)
- **Nhiệm vụ:** Hiển thị giao diện người dùng, xử lý tương tác (click, form submit), và quản lý trạng thái (State/Redux/Context).
- **Thành phần:**
  - **Component (JS/JSX):** File giao diện chính (Ví dụ: `VoiceCall.jsx`).
  - **Styling (CSS):** File CSS tương ứng, ưu tiên dùng biến CSS (CSS Variables) để hỗ trợ Light/Dark theme.
  - **State Management:** Xử lý state nội bộ.

### B. Backend API (Routes / Endpoints)
- **Nhiệm vụ:** Định nghĩa các đường dẫn mạng (URL) để Frontend gọi tới. Phân quyền và kiểm tra tính hợp lệ của dữ liệu đầu vào.
- **Thành phần:**
  - **Routes (Express Router):** Định tuyến URL (Ví dụ: `router.post('/calls', authenticate, CallController.initiateCall);`).
  - **Middleware:** Kiểm tra Token, Role (Admin/Viewer).

### C. Controller & Service (Logic & Kết nối)
- **Nhiệm vụ:** Xử lý nghiệp vụ lõi (Business Logic), truy vấn Database (Supabase), kết nối Realtime (Socket.io), và trả dữ liệu về cho API.
- **Thành phần:**
  - **Controller:** Hàm xử lý (Ví dụ: `initiateCall(req, res)`).
  - **Database Service:** Hàm thao tác với bảng dữ liệu.
  - **Realtime Hub:** Xử lý sự kiện WebSockets (nếu có).

---

## 2. Tiêu chuẩn Coding & Debugging (BẮT BUỘC)

Để sau này dễ dàng bảo trì và fix bug, toàn bộ code phải tuân thủ 2 nguyên tắc:

### 2.1. Comment Tiếng Việt
Tất cả các hàm (Function), các khối logic phức tạp, hoặc các biến quan trọng đều phải được chú thích bằng Tiếng Việt rõ ràng.
```javascript
// Kiểm tra xem người dùng có quyền chỉnh sửa gia phả hay không (Admin hoặc Editor)
function checkEditPermission(user) {
    if (!user) return false;
    // ...
}
```

### 2.2. Logging đầy đủ (Console.log / Server log)
Mọi luồng dữ liệu (Data flow) khi đi qua các lớp (Từ Frontend -> API -> Controller -> Database) đều phải có Log ghi nhận trạng thái (Thành công / Thất bại).
- **Trên Server:** Dùng `console.log` hoặc `console.error` kèm theo tên Module.
  - *Ví dụ:* `console.log('[CallController - initiateCall] Đã nhận yêu cầu gọi từ User:', req.user.id);`
- **Trên Client:** Dùng `console.log` để theo dõi vòng đời Component hoặc State.
  - *Ví dụ:* `console.log('[VoiceCall] RECEIVED call:incoming data:', data);`

---

> **Lưu ý:** Các tài liệu tính năng trong thư mục `docs/features/` BẮT BUỘC phải được viết theo cấu trúc: Tổng quan -> Frontend -> Backend (API) -> Controller -> Log & Tiêu chuẩn.
