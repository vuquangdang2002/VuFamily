# Feature: System Administration (Hệ thống quản trị)

## Tổng quan
Dành riêng cho Quản trị viên (Admin) để quản lý cơ sở dữ liệu (Database) và quản lý tài khoản (Accounts) cho các thành viên trong dòng họ, giúp kiểm soát hệ thống một cách toàn diện.

## Cấu trúc thư mục
- **Client**: `client/src/features/system/`
- **Server Endpoints**: `/api/users/*`, `/api/database/*`

## Các tính năng chính (Chỉ dành cho Admin)

### 1. Quản lý Cơ sở dữ liệu (Tab Dữ liệu)
- **Backup (Export)**: Xuất toàn bộ dữ liệu ra định dạng `.zip` chứa các file `JSON` hoặc `CSV` tương ứng với mỗi bảng. Có tùy chọn xuất chọn lọc bảng và mã hóa dữ liệu.
- **Restore (Import)**: Tải lên file `.zip` để khôi phục hoặc import đè dữ liệu. Hỗ trợ giải mã tự động nếu file được mã hóa.

### 2. Quản lý Tài khoản (Tab Tài khoản)
- **Thêm tài khoản mới**:
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
