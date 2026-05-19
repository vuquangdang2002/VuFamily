# TIÊU CHUẨN FIREBASE REMOTE CONFIG

Theo yêu cầu của hệ thống (Standardization Rule), toàn bộ cấu hình từ xa (Remote Config) phải tuân thủ nghiêm ngặt quy trình quản lý trạng thái sau đây:

## 1. Nguyên tắc cốt lõi (Core Principles)
- **Luôn có giá trị mặc định (Default Value):** Mọi Remote Config đều phải được khai báo một giá trị mặc định nội bộ (Hardcoded Default) để đề phòng trường hợp không có mạng hoặc chưa tải xong.
- **Trạng thái khởi tạo (Initial State):** Khi ứng dụng vừa khởi động (chưa fetch được config), `Giá trị hiện tại = Giá trị Default`.
- **Cập nhật động (Dynamic Update):** Ngay khi `fetchAndActivate` thành công, `Giá trị hiện tại = Giá trị Fetch được`. Toàn bộ các module (React UI, API Services) phải **tự động** lấy theo giá trị hiện tại mới nhất này.

## 2. Tiêu chuẩn triển khai (Implementation Standards)

### 2.1. Cấu hình mặc định (firebase.js)
Tất cả config key cần được định nghĩa mặc định tại `remoteConfig.defaultConfig`:
```javascript
import { API_BASE_URL } from './config.js';

remoteConfig.defaultConfig = {
  "api_base_url": API_BASE_URL,
  "maintenance_mode": false
};
```
Khi `syncRemoteConfig` chạy xong, hệ thống PHẢI phát ra một Global Event để báo hiệu việc thay đổi cấu hình:
```javascript
window.dispatchEvent(new Event('remoteConfigUpdated'));
```

### 2.2. Dành cho Javascript Module tĩnh (VD: api.js)
KHÔNG ĐƯỢC phép gán cấu hình vào một biến Hằng số (Constants) tại thời điểm import file, vì nó sẽ bị kẹt ở giá trị Default vĩnh viễn lúc ứng dụng vừa chạy lên.
Thay vào đó, phải dùng một **Hàm Getter (Dynamic function)** để luôn đọc trực tiếp cấu hình mới nhất mỗi khi thực thi:
```javascript
// SAI ❌
const API_BASE = getRemoteConfigValue('api_base_url'); 
fetch(`${API_BASE}/users`);

// ĐÚNG ✅
function getApiBase() { return getRemoteConfigValue('api_base_url'); }
fetch(`${getApiBase()}/users`);
```

### 2.3. Dành cho React Components (UI)
Sử dụng Custom Hook `useRemoteConfig` để Component có thể re-render tự động ngay khi Remote Config được fetch thành công mà không cần f5.
```javascript
import { useRemoteConfig } from '../hooks/useRemoteConfig';

function MyComponent() {
    // Giá trị này sẽ tự động thay đổi từ Default -> Remote sau khi fetch xong
    const isMaintenance = useRemoteConfig('maintenance_mode', 'boolean');
    
    if (isMaintenance) return <div>Hệ thống đang bảo trì!</div>;
    return <div>...</div>;
}
```

## 3. Danh sách Cấu hình (Remote Config Registry)

Dưới đây là danh sách các biến cấu hình đang được sử dụng trên hệ thống, kèm theo giá trị mặc định của chúng:

| Khóa (Key) | Kiểu (Type) | Mặc định (Default) | Ý nghĩa (Description) |
| --- | --- | --- | --- |
| `api_base_url` | String | `API_BASE_URL` (env) | URL gốc của máy chủ backend để gọi API. |
| `enable_new_call_ui` | Boolean | `true` | Bật/tắt giao diện Video Call & Voice Call mới. |
| `maintenance_mode` | Boolean | `false` | Bật/tắt chế độ bảo trì toàn hệ thống. |
| `newsfeed_refresh_interval_ms` | Number | `300000` (5 phút) | Thời gian cache tối đa của Bảng tin (Newsfeed). Sau thời gian này, app sẽ tự động tìm kiếm bài viết mới ngầm và hiện nút gợi ý làm mới dữ liệu. Giúp giảm tải giật lag mạng. |

## 4. Danh sách Cấu hình Tĩnh (Static / Env Config Registry)

Các cấu hình tĩnh được lưu tại `client/src/config.js` và lấy dữ liệu từ file `.env`. Khác với Remote Config, những cấu hình này yêu cầu **phải Build lại ứng dụng** nếu có thay đổi.

| Khóa .env (Env Key) | Biến xuất (Exported Variable) | Mặc định (Default Fallback) | Ý nghĩa (Description) |
| --- | --- | --- | --- |
| `VITE_APP_DOMAIN` | `APP_DOMAIN` | `family.dangvq.online` | Tên miền chính của toàn bộ hệ thống. Các URL khác sẽ tự động nội suy từ đây. |
| `VITE_APP_URL` | `APP_URL` | `https://${APP_DOMAIN}` | URL gốc của website frontend (Dùng để set CORS hoặc share link). |
| `VITE_API_BASE_URL` | `API_BASE_URL` | `https://${APP_DOMAIN}/api` | URL của Backend Server để gọi REST API. |
| `VITE_HUB_URL` | `HUB_URL` | `http://localhost:3000` (Local)<br/>`https://${APP_DOMAIN}` (Prod) | URL của máy chủ Socket.io để xử lý Real-time (Chat, Gọi Video, Push Event). |

---
*Quy chuẩn này được áp dụng làm tiêu chuẩn bắt buộc cho mọi bản cập nhật và cấu hình tham số của VuFamily từ thời điểm hiện tại.*
