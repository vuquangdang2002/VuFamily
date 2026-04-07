# Feature: History (Lịch sử thao tác) & Requests (Yêu cầu)

## Lịch sử thao tác (History)
- **Client**: `client/src/features/history/`
- **Chức năng**: Ghi vết hành động (Audit Logs). Bất kể khi Admin cập nhật, xóa, sửa ai qua hệ thống, một bản record (Log) sẽ được lưu lại (Ví dụ: "Đã thêm thành viên A", "Vừa xóa thành viên B"). Có tuỳ chọn `Hoàn tác` để Undo dữ liệu nếu lỡ tay (tuỳ Record type).

## Yêu cầu chỉnh sửa (Requests)
- **Client**: `client/src/features/requests/`
- **Chức năng**: Hỗ trợ cộng đồng. Cung cấp cơ chế cho người dùng thường không có quyền sửa Cây. Họ có thể gửi Đơn Xin (Request form) cập nhật một người nào đó (Ví dụ: Báo mất, cập nhật nơi sinh).
- Yêu cầu sẽ đưa vào luồng `Pending` để Ban Quản trị phê duyệt (Approve -> Tự Merge vào Cây Thực Tế) hoặc (Reject). 
