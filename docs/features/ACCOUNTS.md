# Feature: Accounts Management (Quản lý tài khoản)

## Tổng quan
Dành riêng cho Quản trị viên (Admin) để cấp phát, chỉnh sửa và quản lý tài khoản cho các thành viên trong dòng họ, giúp kiểm soát người có quyền xem hoặc chỉnh sửa Gia Phả.

## Cấu trúc thư mục
- **Client**: `client/src/features/accounts/`
- **Server Endpoints**: `/api/users/*`

## Các tính năng chính (Chỉ dành cho Admin)
1. **Thêm tài khoản mới**:
   - Admin có thể tạo tài khoản, chỉ định Username, Password, Hiển thị Tên và Role (Viewer hoặc Admin).
2. **Cập nhật / Đặt lại mật khẩu (`/api/users/:id/reset-password`)**:
   - Nếu Viewer quên mật khẩu và không sử dụng Email, Admin có thể tự tay gán lại một mật khẩu mới cho họ.
3. **Xóa tài khoản**:
   - Thu hồi quyền truy cập.

## UI/UX
- Giao diện dạng Data Table hiển thị thông tin Users, Roles.
- Có tính năng bật/tắt (show/hide) mật khẩu khi gõ để kiểm tra trực quan.

## Tiêu chuẩn Mật khẩu (Password Policy)
Mọi tài khoản tạo mới hoặc đặt lại mật khẩu đều phải tuân thủ chuẩn bảo mật mạnh:
- **Ngắn nhất**: 8 ký tự.
- **Thành phần**: Ít nhất một chữ hoa (A-Z), một chữ thường (a-z), một chữ số (0-9), và một ký tự đặc biệt (`!@#$%^&*...`).
