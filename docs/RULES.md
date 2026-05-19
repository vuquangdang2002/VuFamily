# VuFamily Coding Rules & Best Practices

## 1. Architectural Rules (Facade & API Gateway Pattern)
Tất cả các module tương tác với bên ngoài (API, Storage, Firebase, LocalStorage, i18n) **BẮT BUỘC** phải được đóng gói thông qua các **Helper/Service** tĩnh (API Gateway pattern) để đảm bảo tính tái sử dụng và khả năng mở rộng.

- **Networking:** Mọi request đều phải đi qua `api.js`. Không gọi `fetch` trực tiếp trong Component.
- **Authentication:** Phiên đăng nhập, Token phải được quản lý bởi `AuthHelper.js`. Không dùng `localStorage.getItem` tùy tiện ở component.
- **Tracking/Analytics:** Mọi sự kiện (Event) bắt buộc đi qua phễu `TrackingHelper.TrackingEvent(eventName, payload)`.
- **Localization (i18n):** Ngôn ngữ được quản lý tập trung ở `I18nHelper`. Component lấy bản dịch thông qua hook `useTranslation()`.

*Triết lý:* "Viết Helper một lần, Component chỉ việc gọi ra dùng".

## 2. Design Pattern & UI
- **Design Tokens:** Toàn bộ kích thước, màu sắc phải sử dụng biến CSS toàn cục từ `styles/theme-light.css` (VD: `var(--primary-color)`). KHÔNG hard-code mã Hex trực tiếp trong `.css`.
- **Responsive:** Sử dụng Flexbox/Grid và `Responsive.css` để đảm bảo Viewport điện thoại không bị vỡ.

## 3. Code Maintainability
- Sử dụng `myLog`, `myError` từ `logger.js` thay cho `console.log` thuần để có thể tắt bật dễ dàng trên Production.
- Comment code tường minh bằng tiếng Việt hoặc tiếng Anh (ưu tiên tiếng Việt đối với các nghiệp vụ phức tạp của phả đồ).
