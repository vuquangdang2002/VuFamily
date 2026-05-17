# Tính năng: Hạ tầng Đa Nền tảng (Cross-Platform & Core)

## Tổng quan
VuFamily không chỉ là một trang web tĩnh, hệ thống được thiết kế theo cấu trúc PWA và chuẩn bị sẵn cấu hình để bọc thành Native App di động.

## Cấu trúc thư mục
- **Cấu hình Capacitor**: `client/capacitor.config.json`, `client/android/`
- **PWA Manifest**: `client/public/manifest.json`
- **Styling**: `client/src/index.css`, `client/src/App.jsx`

## Các tính năng chính
1. **Progressive Web App (PWA)**:
   - File `manifest.json` và Service Worker định nghĩa ứng dụng như một App thực thụ.
   - Hỗ trợ nút "Thêm vào màn hình chính" (Add to Home Screen) trên thiết bị di động (Chrome/Safari).
   - Biểu tượng, màu nền (theme_color) đồng bộ.
2. **Capacitor Android / iOS**:
   - Dễ dàng bọc Frontend Vite (React) thành ứng dụng `.apk` hoặc `.aab` cho Android bằng Ionic Capacitor.
   - Truy cập các quyền native của thiết bị: Local Notifications, Microphone, Camera.
3. **Giao diện đáp ứng (Responsive) & Theme**:
   - Tương thích 100% với màn hình Desktop, Tablet, Smartphone.
   - Chế độ Sáng/Tối (Light/Dark Mode) có thể chuyển đổi mượt mà bằng CSS Variables, tự động ghi nhớ trạng thái theo Local Storage.
   - Áp dụng triết lý thiết kế Glassmorphism và màu vàng (Gold) hoàng gia đặc trưng của phả hệ.
4. **Hệ thống Toast & Analytics**:
   - Quản lý cảnh báo và lỗi đồng nhất qua Global Toast.
   - Theo dõi sự kiện Analytics ẩn danh phục vụ thống kê lượt sử dụng.
