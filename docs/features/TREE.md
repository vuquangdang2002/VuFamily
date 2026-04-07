# Feature: Family Tree (Cây gia phả chính)

## Tổng quan
Trái tim của ứng dụng "VuFamily" - Nơi hiển thị trực quan cấu trúc sơ đồ hình cây của toàn bộ các thế hệ trong dòng họ. Cung cấp tính năng thêm, xem chi tiết, kéo thả, và sắp xếp.

## Cấu trúc thư mục
- **Client**: `client/src/features/tree/`
- **Tập tin tiêu biểu**: `TreeCanvas.jsx`, `DetailPanel.jsx`, `MemberModal.jsx`, `PhotoCropper.jsx`.

## Các tính năng chính
1. **Tree Canvas**: 
   - Render đồ thị dựa trên toạ độ tính toán (sử dụng file `shared/utils/treeLayout.js` định tuyến Toạ độ Node).
   - Hỗ trợ cuộn, phóng to thu nhỏ bằng chuột và touch.
2. **Quản lý Thông tin Thành viên (Members)**:
   - Thêm/Sửa/Xóa thành viên.
   - Các trường dữ liệu chi tiết: Tên, Giới tính, Ngày mất Lịch âm/Dương, Nơi sinh/mất, Chức vụ, Note.
3. **Upload & Crop Ảnh (PhotoCropper)**: 
   - Hỗ trợ cắt ảnh hình vuông (1:1) trực tiếp ngay trên Frontend trước khi upload qua base64 lưu vào DB.
4. **Nhập Xóa Phục Hồi Dữ Liệu gốc**: 
   - Có thể Import/Export toàn bộ file JSON/CSV backup qua Database.
