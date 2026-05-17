# Tính năng: Gọi Thoại & Gọi Video (WebRTC Voice/Video Call)

## 1. Tổng quan
Module hạ tầng truyền thông chuyên dụng để thực hiện các cuộc gọi thoại và video trực tiếp trên trình duyệt hoặc điện thoại mà không cần ứng dụng bên thứ 3. Hoạt động trên giao thức WebRTC (Peer-to-Peer) kết hợp với Signaling Server độc lập trên Railway.

---

## 2. Frontend (UI / HTML / JS / CSS)
- **Component chính:** `client/src/features/chat/VoiceCall.jsx`
- **Nhiệm vụ:**
  - Hiển thị giao diện người dùng: Popup cuộc gọi đến (Ringing), Màn hình đang gọi (Calling), và Màn hình kết nối thành công (Connected).
  - Cung cấp các nút bấm điều khiển (Controls): Bật/tắt Micro, Camera, Loa, Nhận cuộc gọi, Từ chối cuộc gọi.
- **State Management:**
  - Quản lý vòng đời cuộc gọi qua biến `phase` (`IDLE` -> `CALLING` -> `RINGING` -> `CONNECTED`).
  - Lưu trữ luồng Media (Audio/Video Stream) của local và remote.
- **Tiêu chuẩn CSS:** Dùng các class `.vc-container`, `.vc-btn` và biến CSS để hỗ trợ Dark/Light mode nhất quán.

---

## 3. Backend (API & Routes)
- **File định tuyến:** `server/routes/api.js` (Phần Calls)
- **Nhiệm vụ:** Cung cấp các điểm cuối HTTP (Endpoints) làm phương án dự phòng (Fallback) khi WebSockets bị chặn, hoặc để truy xuất thông tin cuộc gọi cũ.
- **Các API chính:**
  - `GET /api/calls/stream` (SSE - Server-Sent Events dự phòng).
  - `POST /api/calls` (Khởi tạo cuộc gọi qua HTTP nếu Socket rớt).
  - `PUT /api/calls/:id/status` (Cập nhật trạng thái kết thúc cuộc gọi).

---

## 4. Controller & Kết nối (Logic & Realtime Hub)
- **File xử lý:** `server/controllers/callController.js` và `server/utils/realtimeHub.js`.
- **Nhiệm vụ:**
  - **Realtime Hub (`realtimeHub.js`):** Xử lý tín hiệu WebSockets (Signaling). Nhận sự kiện `call:start` từ người gọi, xác định ID phòng, truy vấn Database lấy danh sách thành viên trong phòng, và phát (emit) sự kiện `call:incoming` đến những người nhận.
  - **Controller (`callController.js`):** Xử lý logic lưu thông tin cuộc gọi vào bảng `calls` trên Supabase (Database) để lưu trữ lịch sử cuộc gọi.
- **Kết nối WebRTC (Peer-to-Peer):** 
  - Tạo RTCPeerConnection trên Client.
  - Trao đổi SDP Offer, SDP Answer và ICE Candidates thông qua sự kiện `call:signal` trên Hub.

---

## 5. Tiêu chuẩn Debug, Log và Comment (BẮT BUỘC)

Để bảo trì tính năng này, mã nguồn cần tuân thủ:

### 5.1. Comment Tiếng Việt
Trong `VoiceCall.jsx` và `realtimeHub.js`:
```javascript
// Khởi tạo Peer Connection với STUN server của Google để vượt tường lửa (NAT)
const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });

// Lắng nghe sự kiện có cuộc gọi đến từ Server
socket.on('call:incoming', (data) => { ... });
```

### 5.2. Hệ thống Log đầy đủ
Mọi bước trong quy trình gọi bắt buộc phải có `console.log`:
- **Server Hub (`realtimeHub.js`):**
  - `console.log('[Hub] ✅ Kết nối thành công từ User:', socket.user.display_name);`
  - `console.log('[Hub] Broadcasting call:incoming to', members.length, 'members in room', roomId);`
- **Frontend (`VoiceCall.jsx`):**
  - `console.log('[VoiceCall] ✅ Hub connected (websocket)');`
  - `console.log('[VoiceCall] RECEIVED call:incoming', data, 'Current phase:', phaseRef.current);`
  - Báo lỗi: `console.error('[VoiceCall] Lỗi truy cập Micro/Camera:', err);`
