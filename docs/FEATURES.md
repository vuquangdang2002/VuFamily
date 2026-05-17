# Hệ Sinh Thái Chức Năng Dòng Họ Vũ (VuFamily Features)

Tài liệu này mô tả chi tiết toàn bộ các tính năng hiện có trong hệ thống quản lý Gia phả và Kết nối Dòng họ Vũ (VuFamily). Hệ thống được thiết kế theo mô hình **All-in-One** (Tất cả trong một), vừa quản lý thông tin phả hệ nghiêm ngặt, vừa đóng vai trò như một mạng xã hội thu nhỏ để các thành viên kết nối với nhau.

---

## 1. 🌳 Quản lý Phả hệ (Family Tree)
*(Xem chi tiết tại: [docs/features/TREE.md](features/TREE.md))*
Đây là tính năng cốt lõi của ứng dụng, giúp trực quan hóa mối quan hệ huyết thống giữa các thế hệ.

- **Hiển thị sơ đồ cây động:** Vẽ sơ đồ gia phả trực quan, tự động tính toán vị trí, phân cấp thế hệ (Đời 1, Đời 2, v.v.). Hỗ trợ thao tác vuốt, kéo thả (pan) và thu phóng (zoom) mượt mà.
- **Quản lý Thành viên:** 
  - **Thêm/Sửa/Xóa:** Cho phép thêm người mới, khai báo mối quan hệ Vợ/Chồng hoặc Con cái.
  - **Hồ sơ chi tiết (Profile):** Quản lý thông tin cá nhân (Ngày sinh, Ngày mất, Nghề nghiệp, Tiểu sử, Hình ảnh đại diện).
- **Thành tựu (Achievements):** Ghi nhận các mốc son, công danh, giải thưởng hoặc sự kiện đáng nhớ của từng cá nhân để thế hệ sau ghi nhớ.
- **Công cụ nâng cao (Dành cho Admin):**
  - Khôi phục dữ liệu gốc (Reset Database).
  - Nhập (Import) / Xuất (Export) dữ liệu dưới dạng JSON để sao lưu.
  - Công cụ tìm kiếm nhanh thành viên theo tên.

---

## 2. 🔐 Hệ thống Xác thực & Phân quyền (Authentication & Authorization)
*(Xem chi tiết tại: [docs/features/AUTH.md](features/AUTH.md))*
Hệ thống bảo mật chặt chẽ để đảm bảo tính toàn vẹn của dữ liệu gia phả.

- **Đăng nhập & Đăng ký:** Hỗ trợ đăng nhập an toàn bằng JWT.
- **Tiêu chuẩn Mật khẩu (Password Policy):** Bắt buộc sử dụng mật khẩu mạnh (Tối thiểu 8 ký tự, có chữ Hoa, chữ thường, số và ký tự đặc biệt). Hỗ trợ ép buộc người dùng đổi mật khẩu ở lần đăng nhập đầu tiên (Force Change Password).
- **Phân quyền 3 cấp (Role-based Access Control):**
  - **Admin (Quản trị viên):** Toàn quyền kiểm soát hệ thống, quản lý tài khoản người dùng, thay đổi gia phả, xóa bài viết của người khác.
  - **Editor (Biên tập viên):** Được phép thêm/sửa/xóa thông tin các thành viên trong gia phả.
  - **Viewer (Người xem):** Chỉ được xem gia phả, tham gia mạng xã hội, chat và gọi điện.
- **Yêu cầu cập nhật (Update Requests):** Khi `Viewer` thấy thông tin sai sót, họ không thể tự sửa mà sẽ gửi "Yêu cầu cập nhật" lên hệ thống. `Admin` hoặc `Editor` sẽ nhận được thông báo và duyệt (Approve) hoặc từ cụ chối (Reject) yêu cầu này.

---

## 3. 📰 Bảng Tin Cộng Đồng (Newsfeed)
*(Xem chi tiết tại: [docs/features/NEWSFEED.md](features/NEWSFEED.md))*
Mạng xã hội thu nhỏ dành riêng cho các thành viên trong họ.

- **Đăng bài (Posts):** Chia sẻ thông báo, lời chúc, hình ảnh, thông báo giỗ chạp hay sự kiện của gia đình.
- **Tương tác:** 
  - Thả cảm xúc (Reactions: Like, Love, Haha, v.v.).
  - Bình luận (Comments) dưới mỗi bài viết.
- **Thời gian thực:** Giao diện tự động cập nhật khi có tương tác mới.
- **Kiểm duyệt:** Admin có quyền xóa các bài viết hoặc bình luận không phù hợp.

---

## 4. 💬 Trò chuyện Trực tuyến (Real-time Chat)
*(Xem chi tiết tại: [docs/features/CHAT.md](features/CHAT.md))*
Hệ thống nhắn tin nội bộ, không phụ thuộc vào ứng dụng bên thứ 3 (như Zalo/Messenger).

- **Chat 1-1 & Chat Nhóm:** Trò chuyện riêng tư hoặc tạo nhóm (Ví dụ: Nhóm Ban liên lạc dòng họ, Nhóm thanh niên họ Vũ).
- **Trạng thái Hoạt động:** Hiển thị ai đang Online (🟢) hoặc Ngoại tuyến (⚪) theo thời gian thực.
- **Lưu trữ Thông minh:** Tích hợp bộ đệm (IndexedDB/Local Cache) ở client để hiện tin nhắn ngay lập tức khi mở app (tốc độ load như Messenger), sau đó mới đồng bộ với server.
- **Hiệu năng:** Hoạt động thông qua giao thức WebSockets với `Socket.io`, duy trì độ trễ cực thấp.

---

## 5. 📞 Gọi Thoại & Gọi Video (WebRTC Voice/Video Call)
*(Xem chi tiết tại: [docs/features/CALL.md](features/CALL.md))*
Hạ tầng truyền thông hiện đại cho phép kết nối nghe nhìn trực tiếp trên nền web/app.

- **Công nghệ cốt lõi:** Sử dụng WebRTC (Real-Time Communication) cho chất lượng truyền tải mượt mà (Peer-to-Peer).
- **Signaling Server (Hub):** Kết nối WebSockets chạy độc lập trên Railway để khắc phục các giới hạn ngắt kết nối của Vercel (Serverless).
- **Tính năng Cuộc gọi:**
  - Bật/Tắt Micro, Bật/Tắt Camera.
  - Chuyển đổi loa ngoài (Speaker).
  - Giao diện đổ chuông (Ringing), Nhận/Từ chối cuộc gọi.
- **Độ tin cậy:** Hệ thống Fallback & Reconnect tự động giới hạn 3 lần thử, cùng với lưới tín hiệu Toast thông báo khi mạng yếu hoặc server gián đoạn.

---

## 6. 📅 Lịch Sự kiện & Nhắc nhở (Calendar)
*(Xem chi tiết tại: [docs/features/CALENDAR.md](features/CALENDAR.md))*
Quản lý thời gian, công việc chung của dòng họ.

- **Lịch Thông minh:** Giao diện lưới lịch tháng, tự động quét dữ liệu gia phả để hiển thị sinh nhật của các thành viên.
- **Lịch Giỗ & Sự kiện:** Đánh dấu các ngày kỷ niệm, ngày giỗ (Âm lịch/Dương lịch) để con cháu không bị quên lãng.

---

## 7. ⚙️ Hệ thống quản trị (Dành cho Admin)
*(Xem chi tiết tại: [docs/features/SYSTEM_ADMIN.md](features/SYSTEM_ADMIN.md))*
Trang dành riêng cho Quản trị viên để kiểm soát dữ liệu và con người.

- **Quản lý Dữ liệu:** Export/Import Database ra file zip an toàn (có hỗ trợ mã hoá nội dung).
- **Quản lý Tài khoản:**
  - Thêm mới tài khoản cho các thành viên trong gia đình.
  - Phân quyền (Set Role).
  - Đặt lại mật khẩu (Reset Password) trong trường hợp thành viên quên.
  - Quản lý danh sách thành viên hợp lệ tham gia vào ứng dụng.

---

## 8. 📱 Hạ tầng & Nền tảng (Cross-Platform)
*(Xem chi tiết tại: [docs/features/CROSS_PLATFORM.md](features/CROSS_PLATFORM.md))*
- **Thiết kế PWA (Progressive Web App):** Ứng dụng hỗ trợ cài đặt thẳng lên màn hình chính của điện thoại (iOS/Android) như một App thực thụ, có Splash Screen, ẩn thanh trình duyệt.
- **Mobile First & Dark Mode:** Giao diện đáp ứng (Responsive) 100% cho mọi thiết bị từ Desktop, Tablet đến Smartphone. Chuyển đổi linh hoạt giữa giao diện Sáng (Light Theme) và Tối (Dark Theme).
- **Native Wrap (Tương lai):** Ứng dụng đã sẵn sàng hạ tầng để bọc (wrap) thành Native App bằng Capacitor (Ionic) để đẩy lên App Store & Google Play.

> *Hệ thống VuFamily không chỉ là một cơ sở dữ liệu phả hệ khô khan, mà là một sản phẩm công nghệ hoàn thiện, hiện đại, mang sứ mệnh gắn kết các thế hệ dòng họ Vũ trong kỷ nguyên số.*
