# Tính năng: Trò chuyện Trực tuyến (Real-time Chat)

## 1. Tổng quan
Module xử lý hệ thống nhắn tin nội bộ của ứng dụng, hoạt động hoàn toàn độc lập, không phụ thuộc vào nền tảng thứ ba (Zalo, Messenger, v.v.).

---

## 2. Frontend (UI / HTML / JS / CSS)
- **Component chính:** `client/src/features/chat/ChatPage.jsx` và `client/src/shared/services/chatCache.js`
- **Nhiệm vụ:**
  - Hiển thị danh sách các phòng chat (Bên trái) và luồng tin nhắn chi tiết (Bên phải).
  - Quản lý trạng thái nhập văn bản, hiển thị bong bóng tin nhắn (Message Bubbles).
- **State & Cache Management:**
  - Sử dụng IndexedDB (`chatCache.js`) để lưu trữ tin nhắn cũ vào bộ nhớ cục bộ của trình duyệt. 
  - Khi người dùng mở ứng dụng, giao diện sẽ render ngay lập tức tin nhắn từ Cache (giúp tải trang siêu tốc), sau đó Background Sync (đồng bộ ngầm) để kéo tin nhắn mới từ Server về.
- **Tiêu chuẩn UI:** Layout Flexbox, sử dụng các biến CSS chuẩn của dự án để tự động hỗ trợ Light/Dark mode.

---

## 3. Backend (API & Routes)
- **File định tuyến:** `server/routes/api.js` (Phần Chats)
- **Nhiệm vụ:** Định nghĩa các đường dẫn (Endpoints) xử lý việc tạo phòng, lấy tin nhắn, gửi tin nhắn.
- **Các API chính:**
  - `GET /api/chats`: Lấy danh sách các phòng chat của người dùng.
  - `GET /api/chats/:id/messages?since=ISO_DATE`: Lấy lịch sử tin nhắn của một phòng. Hỗ trợ tham số `since` để chỉ lấy các tin nhắn mới (Incremental Fetch).
  - `POST /api/chats/:id/messages`: Gửi một tin nhắn mới.
  - `POST /api/chats`: Tạo phòng chat mới (Group hoặc Direct 1-1).

---

## 4. Controller & Kết nối (Logic & Realtime Hub)
- **File xử lý:** `server/controllers/chatController.js` và `server/utils/realtimeHub.js`.
- **Nhiệm vụ:**
  - **Controller (`chatController.js`):** Xử lý nghiệp vụ phân quyền (Membership Check). Đảm bảo người dùng phải ở trong phòng chat mới được phép gửi/nhận tin nhắn. Ghi dữ liệu vào Supabase.
  - **Realtime Hub (`realtimeHub.js`):** Xử lý WebSockets. Khi có một tin nhắn mới được lưu vào Database thành công, Hub sẽ phát tín hiệu (Broadcast) sự kiện `chat:message` kèm theo dữ liệu tin nhắn tới tất cả thành viên (members) đang online trong phòng đó, giúp giao diện Frontend tự động hiển thị tin nhắn ngay lập tức mà không cần F5.

---

## 5. Tiêu chuẩn Debug, Log và Comment (BẮT BUỘC)

Để bảo trì tính năng này, mã nguồn cần tuân thủ:

### 5.1. Comment Tiếng Việt
Trong `ChatPage.jsx` và `chatController.js`:
```javascript
// Step 1: Hiển thị ngay lập tức tin nhắn từ IndexedDB cache để tối ưu trải nghiệm (UX)
getCachedMessages(activeRoomId).then(cached => { ... });

// Kiểm tra quyền của người dùng trước khi lấy tin nhắn
const membership = await ChatModel.getMembership(roomId, userId);
if (!membership) return res.status(403).json({ error: 'Bạn không có quyền xem nhóm chat này' });
```

### 5.2. Hệ thống Log đầy đủ
- **Server Controller (`chatController.js`):**
  - Khi có lỗi, bắt buộc log kèm ID phòng để dễ truy vết: 
  - `console.error('[ChatController - getMessages] Lỗi room ' + req.params.id + ':', e);`
- **Frontend (`ChatPage.jsx`):**
  - Ghi nhận trạng thái đồng bộ: 
  - `console.log('[ChatPage] Background Sync thành công cho phòng:', roomId);`
  - Bắt lỗi nếu Cache thất bại: 
  - `console.error('[ChatPage] Background Sync Error:', e);`
