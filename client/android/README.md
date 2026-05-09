# VuFamily Android Project Documentation

Tài liệu này cung cấp hướng dẫn và thông tin chi tiết về cấu hình, cấu trúc và cách vận hành dự án Android cho hệ thống VuFamily.

## 1. Thông tin chung
- **Công nghệ cốt lõi:** Capacitor (kết nối Web và Native) + Android Native (Java)
- **Package Name (App ID):** `com.dangvq.vu_family`
- **Tên hiển thị:** `VuFamily`

## 2. Cấu hình Firebase
Dự án được tích hợp sâu với các dịch vụ Firebase để hỗ trợ các tính năng nền tảng:
- **Crashlytics:** Theo dõi và báo cáo lỗi ứng dụng tự động.
- **Analytics:** Phân tích hành vi và hiệu suất người dùng.
- **Remote Config:** Thay đổi cấu hình động từ máy chủ mà không cần cập nhật ứng dụng.
- **Cloud Messaging (FCM):** Nhận thông báo đẩy (Push Notifications) và tín hiệu cuộc gọi (VoIP/WebRTC).

### Cấu hình `google-services.json`
- File cấu hình Firebase Android được đặt tại: `client/android/app/google-services.json`.
- Mọi thay đổi về thông số Firebase phải được thay đổi trên Firebase Console và tải lại file JSON này đè vào thư mục trên.

## 3. Quyền truy cập ứng dụng (Permissions)
Ứng dụng yêu cầu một số quyền quan trọng trong `AndroidManifest.xml` để đảm bảo các tính năng hoạt động trơn tru:

### Quyền Thông báo (Notifications)
- `POST_NOTIFICATIONS`: Yêu cầu cho Android 13+ (API 33) để hiển thị thông báo.
- `VIBRATE`: Rung thiết bị khi có thông báo hoặc cuộc gọi tới.
- `WAKE_LOCK`: Đánh thức màn hình khi nhận được tín hiệu đẩy.
- `RECEIVE_BOOT_COMPLETED`: Tự động khởi động service nhận thông báo khi máy khởi động lại.

### Quyền Gọi điện (Calling & WebRTC)
- `INTERNET`: Truy cập mạng (Bắt buộc).
- `RECORD_AUDIO` & `CAMERA`: Sử dụng microphone và camera cho cuộc gọi thoại/video.
- `MODIFY_AUDIO_SETTINGS`: Thay đổi cài đặt loa/tai nghe khi trong cuộc gọi.
- `READ_PHONE_STATE`: Đọc trạng thái cuộc gọi để tạm dừng nhạc/ngắt gọi khi có cuộc gọi viễn thông xen vào.
- `USE_FULL_SCREEN_INTENT`: Cho phép hiển thị màn hình nhận cuộc gọi tràn viền ngay cả khi thiết bị đang khóa màn hình.
- `BLUETOOTH` & `BLUETOOTH_CONNECT`: Định tuyến âm thanh qua tai nghe Bluetooth (Yêu cầu cho Android 12+).

## 4. Các lệnh Build & Chạy phổ biến
Vì đây là một dự án Capacitor, mọi sự thay đổi bên phía Web (React/Vue/...) cần được đồng bộ sang Android trước khi build.

**Bước 1: Build mã nguồn Web**
```bash
npm run build
```

**Bước 2: Đồng bộ mã nguồn và cấu hình sang Android**
```bash
npx cap sync android
```
*Lưu ý: Lệnh này sẽ copy thư mục `dist/` vào `android/app/src/main/assets/public/` đồng thời cập nhật file `capacitor.config.json`.*

**Bước 3: Mở Android Studio để Build & Chạy**
```bash
npx cap open android
```
Trong Android Studio, bạn có thể nhấn `Run (Shift + F10)` để cài đặt app lên máy ảo hoặc thiết bị thật.

## 5. Xử lý sự cố thường gặp
- **Lỗi "No matching client found for package name"**: Xảy ra khi Package Name trong file `build.gradle` khác với trong file `google-services.json`. Hãy đảm bảo chúng trùng khớp là `com.dangvq.vu_family`.
- **Không nhận được thông báo**: 
  - Đảm bảo app đã cấp quyền Thông báo trong cài đặt thiết bị.
  - Trên các máy Android Trung Quốc (Xiaomi, Oppo, Vivo...), có thể cần cấp quyền "Tự khởi chạy (Auto-start)" cho ứng dụng.
- **Lỗi Gradle khi Build**: Thử chạy lệnh clean dự án trên thư mục `client/android`:
  ```bash
  ./gradlew clean
  ```

---
*Tài liệu này được tạo tự động để hỗ trợ cho việc phát triển và bảo trì nền tảng Android VuFamily.*
