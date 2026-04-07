# Feature: Calendar (Lịch & Sự kiện)

## Tổng quan
Module theo dõi Lịch, cung cấp hiển thị đanh sách cho các sự kiện của dòng họ - nổi bật nhất là module thông báo "Sinh nhật" và "Ngày Giỗ" (Âm lịch).

## Cấu trúc thư mục
- **Client**: `client/src/features/calendar/`

## Các tính năng chính
1. **Tra cứu Âm Lịch & Dương Lịch**:
   - Sử dụng tool xử lý logic quy đổi Lịch (`shared/utils/lunar.js` & `vietLunar.js`).
2. **Upcoming Events (Sự kiện Sắp tới)**:
   - **Sinh nhật**: Dò tìm các thành viên có Ngày Sinh nhật Dương lịch nằm trong vòng 30 ngày tiếp theo.
   - **Ngày Giỗ**: Scan và đối chiếu Lịch Dương quy ra Âm tương đương xem những ai có tiết Giỗ sắp tới so với ngày thực hành hiện tại.
3. **Display UI**:
   - Hiển thị theo lưới Tháng (Month Grid - Sun to Sat).
   - Card dạng list cho Ngày sinh/Giỗ sắp tới, render kèm avatar và tuổi hiện tại.
