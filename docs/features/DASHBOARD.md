# Tính năng Thống kê & Bảng xếp hạng (Dashboard / Leaderboard)

## 1. Tổng quan (Overview)
Tính năng này nhằm vinh danh và khích lệ các thành viên trong dòng họ tương tác, đăng bài và kết nối với nhau nhiều hơn. 
Hệ thống sẽ cung cấp một bảng điều khiển (Dashboard) thống kê chi tiết theo các mốc thời gian: Tuần / Tháng / Quý / Năm.

**Các chỉ số chính cần thống kê:**
- 🏆 **Chăm đăng bài nhất:** Số lượng bài viết (Newsfeed) được tạo bởi người dùng.
- ❤️ **Chăm tương tác nhất:** Số lượng biểu tượng cảm xúc (Reaction) và bình luận (Comment) đã thả.
- 📞 **Chăm gọi điện nhất:** Số lượng cuộc gọi Voice/Video Call đã thực hiện (có thể tính theo tổng số lần gọi hoặc tổng số phút gọi).

## 2. Cấu trúc 3 lớp (Định hướng triển khai tương lai)

### A. Frontend (UI / Component)
- **File dự kiến:** `client/src/features/dashboard/DashboardPage.jsx`
- **UI:**
  - Thiết kế theo phong cách Widget Card hoặc Bục vinh danh (Top 1, 2, 3).
  - Có các bộ lọc thời gian: Dropdown chọn "Tuần này", "Tháng này", "Năm nay".
  - Có hiệu ứng vinh danh (ví dụ: vương miện, huy chương) cho người đứng đầu.

### B. Backend API (Routes)
- **Route dự kiến:** `GET /api/dashboard/stats`
- Tham số truy vấn (Query params): `?period=week` (hoặc `month`, `year`).
- **Nhiệm vụ:** Validate đầu vào và gọi tới Controller tương ứng.

### C. Controller & Service
- **File dự kiến:** `server/controllers/dashboardController.js`
- **Logic:**
  - Sử dụng SQL aggregation functions (của Supabase/PostgreSQL) như `COUNT()`, `SUM()` kết hợp với `GROUP BY user_id`.
  - Filter `created_at` theo khoảng thời gian được truyền từ Frontend.
  - Sắp xếp (Order By) giảm dần để lấy ra Top N người dùng.

## 3. Cấu trúc Database (Supabase) cần bổ sung / query:
- Không cần tạo thêm bảng mới, chỉ cần query (truy vấn) các bảng hiện có:
  - Bảng `posts` để lấy số bài đăng.
  - Bảng `post_comments` và `post_reactions` để lấy số tương tác.
  - Bảng thống kê cuộc gọi (nếu có lưu lịch sử gọi ở backend, ví dụ bảng `call_history`).

## 4. Tiêu chuẩn Logging
- Sử dụng `myLog('DASHBOARD', ...)` trên client.
- Trên server, log rõ ràng khoảng thời gian query để dễ debug.
