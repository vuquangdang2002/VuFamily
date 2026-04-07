# Feature: Newsfeed (Bảng tin)

## Tổng quan
Khu vực tương tác cộng đồng nội bộ dành riêng cho dòng họ. Nơi các thành viên có thể đăng thông báo chung, cập nhật tin tức, hoặc thảo luận thông qua Reactions & Comments.

## Cấu trúc thư mục
- **Client**: `client/src/features/newsfeed/`
- **Server Models**: `Post.js`, `Reaction.js`, `Comment.js`

## Các tính năng chính
1. **Bài Đăng (Posts)**:
   - Admin và thành viên có thể tạo bài chia sẻ dạng văn bản.
2. **Reactions (Cảm xúc)**:
   - "Thả tim", "Haha", "Like"... Giới hạn mỗi người dùng có thể toggle 1 Icon nhiều hoặc lưu nhiều Icon khác nhau trên 1 Post tùy thiết kế. Cập nhật giao diện tự động (optimistic UI) không cần chờ refetch Server.
3. **Bình luận (Comments)**:
   - Thành viên có thể nói chuyện qua comment. Gửi comment hiển thị tức thì (Optimistic updates).
4. **Performance**:
   - Tối ưu hóa Database queries: N+1 calls đã được Batch Query gộp lại để giảm thời gian Load Post + Kéo Comments/Reactions cực nhẹ và nhanh.
