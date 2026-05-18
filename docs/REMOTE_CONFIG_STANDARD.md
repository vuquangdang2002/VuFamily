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

---
*Quy chuẩn này được áp dụng làm tiêu chuẩn bắt buộc cho mọi bản cập nhật và cấu hình tham số của VuFamily từ thời điểm hiện tại.*
