# Feature: Authentication (Auth)

## Tổng quan
Module xử lý tính năng xác thực, phân quyền (Role-based access control), và bảo trì phiên đăng nhập cho người dùng.
Tất cả các route yêu cầu xác thực (`/api/auth/*` hoặc có middleware `authenticate`) đều dựa trên JSON Web Token (JWT).

## Cấu trúc thư mục
- **Client**: `client/src/features/auth/`
- **Server Services**: `server/features/auth/`
- **API Routes**: `/api/auth/*`

## Các tính năng chính
1. **Đăng nhập (`/api/auth/login`)**:
   - Xác thực `username` và `password`. Kiểm tra mật khẩu mã hóa bằng `bcryptjs`.
   - Trả về Token kèm thông tin Role. Admin mặc định là `dangvq`.
2. **Kiểm tra phiên (`/api/auth/me`)**:
   - Dùng để tự động đăng nhập nếu token (lưu ở `localStorage`) còn hiệu lực.
3. **Quên mật khẩu (`/api/auth/forgot-password` & `/api/auth/reset-password`)**:
   - Tích hợp **Resend API** gửi mail kèm link Reset có thời hạn.
4. **Bảo mật**:
   - Middleware `authenticate`: chặn truy cập các Endpoint nhạy cảm nếu không có token.
   - Middleware `requireAdmin`: chỉ cho phép những API đặc quyền cho Role `admin`.
5. **Tiêu chuẩn Mật khẩu (Password Policy)**:
   - Hệ thống bắt buộc sử dụng Mật khẩu mạnh (Strong Password) khi tạo mới đổi mật khẩu.
   - Thỏa mãn Regex: `^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})`
   - **Tối thiểu 8 ký tự**.
   - Phải chứa ít nhất **1 chữ IN HOA**, **1 chữ thường**, **1 chữ số**, và **1 ký tự đặc biệt (VD: !@#$)**.
