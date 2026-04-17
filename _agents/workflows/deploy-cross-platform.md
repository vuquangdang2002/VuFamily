---
description: Quy trình Triển khai Đa nền tảng Hệ thống VuFamily (Vercel, Android, iOS)
---

# 🚀 Quy trình Triển khai VuFamily Enterprise

Do dự án dùng chung một mã nguồn cho cả 3 nền tảng (Web, Android, iOS) qua framework **Vite + React + Capacitor**, cấu trúc Deploy được chuẩn hóa thành 3 bước độc lập dưới đây.

## Tiền đề: Đồng bộ Môi trường (Git & Env)
1. Hãy luôn đảm bảo nhánh `main` trên Github là nhánh Product hoàn thiện nhất. Mọi commit phải được đẩy lên Git:
`git add . && git commit -m "update" && git push`

---

## Bước 1: Triển khai Backend và Web (Vercel)
Web và Serverless Backend của dự án nằm toàn bộ ở Vercel. Vercel tự động lắng nghe kho Github.
1. Code đẩy lên nhánh `main` -> Vercel tự động kéo về.
2. Vercel tự động thực thi `npm run vercel-build` (Build tĩnh Web App).
3. Vercel tự động nạp thư mục `server/api` thành các Serverless Functions (Backend).
4. Bạn không cần làm gì thêm. Truy cập `https://dangvq.online` để kiểm chứng Web sau 2 phút từ lúc Push.

---

## Bước 2: Triển khai Ứng dụng Android (Capacitor)
Android App được trích xuất thẳng từ lõi Web. Code của Web sau khi nén lại sẽ được Copy vào thư mục rỗng của Android (Assets).

1. Bạn phải Build Web ở dưới dạng Offline (Tạo thư mục `/dist`):
```bash
cd client
npm run build
```

2. Yêu cầu Capacitor nạp cục tĩnh `/dist` này đẩy vào nền tảng Android và tinh chỉnh các Plugin (Mic, Notification):
```bash
npx cap sync android
```

3. Bước cuối cùng, sử dụng Android Studio để đóng gói tệp APK/AAB:
```bash
npx cap open android
```
_Trong Android Studio: Chọn **Build** > **Generate Signed Bundle / APK**._

---

## Bước 3: Triển khai Ứng dụng iOS (Capacitor - Yêu cầu máy Mac)
iOS mang cấu trúc khắt khe nhất của Apple. Tương tự như Android, nó vẫn ngốn cục tĩnh của hệ thống Vite.

1. Đồng bộ mã nguồn cho iOS:
```bash
cd client
npm run build
npx cap sync ios
```

2. Mở Xcode để tinh chỉnh Quyền (Permissions):
```bash
npx cap open ios
```
3. **Cấu hình Bắt buộc trong Xcode (`Info.plist`):** 
Bạn phải xin Apple cấp phép sử dụng Loa/Mic. Thêm vào tệp plist:
- `Privacy - Microphone Usage Description`: "We need microphone access for voice calls."
- Tích chọn mục `Push Notifications` trong thẻ **Capabilities**.

4. Bấm **Archive** trên Xcode để đẩy lên **TestFlight / App Store**.
