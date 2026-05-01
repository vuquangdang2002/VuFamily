# Kế Hoạch Theo Dõi Dữ Liệu (Analytics Tracking Plan)
*Dự án: VuFamily*
*Cập nhật lần cuối: 2026-05-01*

Tài liệu này là "Nguồn chân lý" (Single Source of Truth) định nghĩa toàn bộ các sự kiện (Events) và thuộc tính (Properties) được theo dõi trong hệ thống VuFamily. Việc tuân thủ tài liệu này giúp dữ liệu thu thập về luôn sạch (clean data), đồng nhất và dễ dàng phục vụ cho việc tính toán Retention, Engagement và Session.

---

## 1. User Properties (Định danh người dùng)
Được gọi mỗi khi người dùng đăng nhập hoặc cập nhật thông tin qua hàm `Analytics.identifyUser()`.

| Property Name | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `user_id` | String | ID duy nhất của người dùng trên hệ thống. |
| `role` | String | Phân quyền (admin, editor, viewer). Dùng để chia cohort phân tích. |
| `account_created_at` | ISO Date | Ngày giờ tạo tài khoản. Cực kỳ quan trọng để tính toán **Retention Day N**. |
| `last_login_at` | ISO Date | Thời điểm đăng nhập cuối cùng. Dùng để tính toán độ "Churn" (Rời bỏ). |

---

## 2. Core Events (Các sự kiện Cốt lõi)
Dùng để đo lường mức độ hoạt động chung (DAU/MAU) và số lượng phiên (Sessions).

| Tên sự kiện (Event Name) | Vị trí kích hoạt (Trigger) | Các tham số đi kèm (Params) | Mục đích phân tích |
| :--- | :--- | :--- | :--- |
| `app_open` | Khi app load xong màn hình đầu tiên (cả Web & Android) | `platform`: "web", "android" | Tính số lượt mở app, tỷ lệ nền tảng (Platform distribution). |
| `login_success` | Ngay khi user đăng nhập thành công vào app | `method`: "email", "token" | Đo lường số phiên đăng nhập thực tế (Sessions), MAU/DAU. Kết hợp với `account_created_at` để tính **Retention**. |
| `logout` | Khi user chủ động bấm đăng xuất | - | Đo lường tỷ lệ chủ động thoát khỏi tài khoản. |

---

## 3. Engagement Events (Mức độ tương tác / Gắn kết)
Dùng để trả lời câu hỏi: *"Người dùng vào app VuFamily để làm gì nhiều nhất?"*

### Tính năng Gia Phả
| Tên sự kiện | Vị trí kích hoạt | Các tham số đi kèm | Mục đích phân tích |
| :--- | :--- | :--- | :--- |
| `view_family_tree` | Khi bấm mở màn hình "Gia Phả" | `total_nodes`: Số lượng thành viên trong cây (Int) | Đo lường tần suất sử dụng tính năng cốt lõi. |
| `add_tree_member` | Khi tạo thành công 1 người mới trên cây | `relationship`: "con", "vo", "chong" | Đo mức độ đóng góp nội dung của các thành viên. |

### Tính năng Giao Tiếp (Chat & Gọi thoại)
| Tên sự kiện | Vị trí kích hoạt | Các tham số đi kèm | Mục đích phân tích |
| :--- | :--- | :--- | :--- |
| `send_chat_message`| Khi bấm nút gửi tin nhắn thành công | `room_type`: "private", "group" | Đo lường "Engagement Score" (Độ gắn kết). Những user nhắn tin nhiều thường có Retention cao. |
| `start_voice_call` | Khi user bấm nút gọi thoại (Outbound) | `call_type`: "1-1", "group" | Đo lường độ phủ của tính năng gọi điện. |
| `end_voice_call` | Khi cuộc gọi kết thúc | `duration_seconds`: Thời gian gọi (Int) | Đo lường thời lượng gọi trung bình (Session length của cuộc gọi). |

### Tính năng Quản lý
| Tên sự kiện | Vị trí kích hoạt | Các tham số đi kèm | Mục đích phân tích |
| :--- | :--- | :--- | :--- |
| `create_account` | (Dành cho Admin) Khi tạo tài khoản mới | `target_role`: "viewer", "editor" | Đo lường tốc độ mở rộng thành viên của dòng họ. |
| `ban_account` | (Dành cho Admin) Khóa tài khoản | `target_user_id`: String | Theo dõi tính an toàn của hệ thống. |

---

## 4. Công thức phân tích các chỉ số KPIs (Cho Firebase / Data Studio)

- **Daily Active Users (DAU)**: Đếm tổng số lượng `user_id` có kích hoạt event `app_open` hoặc `login_success` duy nhất trong ngày.
- **Engagement Rate**: (Số `send_chat_message` + `view_family_tree`) / Tổng số sessions.
- **Retention (Ngày N)**: 
  - Khởi tạo (Day 0): Tính từ lúc `account_created_at`.
  - Quay lại (Retained): Lấy tệp người dùng của Day 0 so sánh xem họ có phát sinh bất kỳ Core/Engagement event nào vào Ngày thứ N hay không.
- **Average Call Duration**: Tổng `duration_seconds` / Tổng số lượt `end_voice_call`.

> **Lưu ý cho Developer (Dành cho Codebase):** Mọi sự kiện phải tuân thủ chuẩn Snake Case (ví dụ: `send_chat_message`) và sử dụng thông qua Facade `Analytics.trackEvent()` để đồng nhất dữ liệu.
