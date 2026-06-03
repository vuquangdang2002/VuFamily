# Tiêu Chuẩn Mở Rộng Cho Web & Mobile App (v1.0)
Tài liệu này mở rộng cho [Tiêu Chuẩn Phát Triển AI Cốt Lõi](file:///e:/_Web/VuFamily/.agents/skills/ai_standard_vi.md) với các quy tắc chuyên biệt dành cho phát triển ứng dụng Web, Mobile App và kiến trúc Client-Server.

**Mọi Agent AI khi làm việc trên một dự án Web hoặc Mobile trong workspace này PHẢI tuân thủ các chỉ thị sau.**

---

## 1. Tiêu Chuẩn Kiến Trúc Web/App
Ứng dụng Web và Mobile phải áp dụng sự tách biệt nghiêm ngặt giữa Giao diện (UI Rendering) và phần xử lý Logic/Mạng bằng cách sử dụng **Mô hình Facade & Service Layer**.

```
┌──────────────────────┐          ┌─────────────────────────┐
│       UI Layer       │          │      Service Layer      │
│                      │          │                         │
│  - React Components  │          │  - api.js (HTTP Client) │
│  - Flutter Widgets   │ ──────▸  │  - AuthHelper.js        │
│  - Swift UI Views    │          │  - TrackingHelper.js    │
│  - HTML/CSS templates│          │  - Cache / Local DB     │
└──────────────────────┘          └─────────────────────────┘
```

### 1.1. Quy tắc lớp UI (UI Layer)
*   **Chỉ hiển thị (Presentational Only)**: Các components/views chỉ nên xử lý việc render giao diện, áp dụng style và bắt các sự kiện tương tác của người dùng.
*   **Không gọi Mạng trực tiếp**: Tuyệt đối không viết trực tiếp các hàm `fetch()`, `axios` hoặc client SDK để gọi API bên trong file giao diện.
*   **Không truy cập trực tiếp Storage**: Không truy cập trực tiếp `localStorage`, `Cookies` hay các API lưu trữ của trình duyệt/thiết bị bên trong component UI. Phải dùng qua các wrapper hoặc custom hooks.
*   **Style đồng bộ**: Sử dụng các biến CSS variables, Tailwind tokens hoặc Style Guide của dự án. Không code cứng các mã màu hex, margin hoặc padding ngẫu nhiên.

### 1.2. Quy tắc lớp Service & Facade (Service Layer)
*   **Tập trung hóa Request**: Mọi yêu cầu HTTP/gRPC ra ngoài hệ thống phải được đi qua một module client duy nhất (ví dụ: `api.js`).
*   **Tách biệt State**: Tách biệt luồng dữ liệu state toàn cục (Redux, Context, Zustand, Bloc) khỏi logic nghiệp vụ. Giữ các side effects (tác vụ phụ như ghi log, analytics) trong actions hoặc middleware.
*   **Chuẩn hóa Lỗi**: Lớp dịch vụ API phải chặn các lỗi mạng/hệ thống và biên dịch chúng thành định dạng lỗi chuẩn, thân thiện trước khi trả về cho UI hiển thị.

---

## 2. Quy Chuẩn API & Trao Đổi Dữ Liệu
*   **Cấu trúc Response chuẩn**: Mọi endpoint API nên trả về một cấu trúc bao gói chuẩn như sau:
    ```json
    {
      "success": true,
      "data": {},
      "message": "Thông báo thân thiện cho người dùng",
      "error": "Chi tiết lỗi kỹ thuật của hệ thống"
    }
    ```
*   **Phương thức HTTP**: Tuân thủ chuẩn REST:
    *   `GET`: Đọc dữ liệu (idempotent - không thay đổi dữ liệu trên server).
    *   `POST`: Tạo mới dữ liệu.
    *   `PUT`: Thay thế/Ghi đè dữ liệu.
    *   `PATCH`: Cập nhật một phần dữ liệu.
    *   `DELETE`: Xóa dữ liệu.

---

## 3. Thiết Kế Database & Tối Ưu Hóa Truy Vấn
*   **Tránh Lỗi N+1 Query**: Khi lấy danh sách dữ liệu, sử dụng câu lệnh JOIN hoặc gom nhóm truy vấn (`WHERE IN`) thay vì viết câu lệnh truy vấn database lặp đi lặp lại trong vòng lặp.
*   **Đánh Index**: Thiết lập chỉ mục (index) cho các cột thường xuyên được dùng để lọc, kết bảng hoặc tìm kiếm (ví dụ: `user_id`, `email`, `created_at`, `status`).
*   **Xác thực dữ liệu**: Thực hiện kiểm tra ràng buộc (constraints, khóa ngoại) tại tầng Database, và validate dữ liệu request tại tầng Controller trước khi lưu vào DB.

---

## 4. Khuyến Nghị Tối Ưu Hóa Riêng Cho Web/App
1.  **Chia nhỏ Component nghiêm ngặt**:
    *   Giữ cho các React components, Vue templates, hoặc Flutter widgets gọn gàng. Tách các danh sách, hàng (rows), headers, hoặc form fields ra các file riêng.
    *   Đảm bảo mọi file component mới luôn **dưới 300 dòng**.
2.  **Đa ngôn ngữ hóa (i18n)**:
    *   Không viết cứng (hardcode) các chuỗi chữ hiển thị trên UI. Luôn sử dụng thư viện đa ngôn ngữ (như `i18next`, hệ thống file resource JSON).
3.  **Thiết kế Mobile-First**:
    *   Viết CSS/Styling ưu tiên giao diện di động trước, sau đó mở rộng ra màn hình lớn. Đảm bảo mọi giao diện đều được test đầy đủ ở các kích thước Mobile, Tablet và Desktop.
