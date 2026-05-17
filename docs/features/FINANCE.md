# Tính năng Quản lý Tài chính & Quỹ dòng họ (Finance / Funds)

## 1. Tổng quan (Overview)
Hệ thống minh bạch hóa tài chính của dòng họ/gia đình. Quản lý chi tiết dòng tiền ra/vào (đóng góp, ghi nhận góp quỹ, các khoản chi tiêu) với mức độ bảo mật cao nhất, có báo cáo tổng kết theo Tháng / Quý / Năm.

**Yêu cầu cốt lõi:**
- 💰 **Minh bạch:** Toàn bộ thành viên trong họ đều có quyền **XEM** báo cáo tài chính, số dư quỹ hiện tại, các khoản thu chi.
- 🔒 **Phân quyền chặt chẽ (RBAC):** Chỉ `Admin` hoặc những người được cấp quyền đặc biệt (ví dụ: `Treasurer` / Thủ quỹ) mới được phép **THÊM/SỬA/XÓA** các khoản thu/chi.
- 📜 **Lịch sử chỉnh sửa (Audit Trail):** BẮT BUỘC lưu lại mọi thay đổi. Nếu một khoản thu/chi bị sửa, hệ thống phải ghi lại ai là người sửa, sửa từ số tiền bao nhiêu thành bao nhiêu, vào lúc nào (Audit Log).
- 🛡️ **Bảo mật dữ liệu (Data Encryption):** Toàn bộ các con số (số tiền thu/chi, số dư) lưu trong Database phải được **MÃ HÓA** (Symmetric Encryption), tránh việc xem trực tiếp từ Database.

## 2. Cấu trúc Database (Supabase) Đề xuất

Để đáp ứng yêu cầu khắt khe về Audit Trail và Encryption, cần thiết kế ít nhất 2 bảng:

### Bảng `funds_transactions` (Ghi nhận Thu/Chi)
- `id` (UUID)
- `type` (Enum: `INCOME` - Thu/Góp quỹ, `EXPENSE` - Chi tiêu)
- `amount_encrypted` (Text) - **Lưu số tiền đã được mã hóa AES-256**
- `description` (Text) - Lý do thu/chi
- `category` (Text) - Phân loại (Đám hiếu, Đám hỉ, Giỗ chạp, Xây dựng...)
- `created_by` (UUID) - Người tạo
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Bảng `funds_audit_logs` (Lưu lịch sử chỉnh sửa - Bất biến)
- `id` (UUID)
- `transaction_id` (UUID) - ID của khoản thu/chi bị sửa
- `action` (Enum: `CREATED`, `UPDATED`, `DELETED`)
- `old_amount_encrypted` (Text) - Số tiền cũ trước khi sửa
- `new_amount_encrypted` (Text) - Số tiền mới sau khi sửa
- `modified_by` (UUID) - ID của người thực hiện thay đổi
- `modified_at` (Timestamp)

## 3. Cấu trúc 3 lớp (Định hướng triển khai)

### A. Frontend (UI / Component)
- **File dự kiến:** `client/src/features/finance/FinancePage.jsx`
- **UI Mặc định (Tối ưu hiệu năng):**
  - Màn hình chính **chỉ hiển thị tóm tắt** các con số quan trọng nhất: Số dư quỹ hiện tại, Tổng thu, Tổng chi (để load cực nhanh).
  - Không tải toàn bộ danh sách giao dịch ngay lập tức để tránh làm nặng web.
- **Xem chi tiết (Lazy load):**
  - Có các nút như `Chi tiết thu chi` hoặc `📊 Xem biểu đồ (Tháng/Quý/Năm)`.
  - **Loading State:** Chỉ khi người dùng click vào nút xem chi tiết thì mới gọi API để load danh sách hoặc biểu đồ tương ứng, kèm theo giao diện Loading (Spinner) chuyên nghiệp.
- **Thao tác & Lịch sử:**
  - Nút "Thêm giao dịch" (Chỉ hiển thị nếu `user.role === 'admin'` hoặc `user.permissions.includes('finance')`).
  - Trong phần xem chi tiết, click vào một giao dịch sẽ xem được Audit Log (ai đã thêm/sửa nó).

### B. Backend API (Routes)
- **Route dự kiến:** `api/finance`
  - `GET /api/finance/transactions` (Lấy danh sách, mọi người đều xem được)
  - `GET /api/finance/summary` (Tổng kết thu chi)
  - `POST /api/finance/transactions` (Middleware phân quyền nghiêm ngặt)
  - `PUT /api/finance/transactions/:id` (Sửa, tự động trigger ghi log vào `funds_audit_logs`)

### C. Controller & Service
- **File dự kiến:** `server/controllers/financeController.js`
- **Logic Mã hóa:**
  - Tái sử dụng `server/utils/cryptoUtils.js` để mã hóa con số từ Client gửi lên thành chuỗi hex/base64 trước khi Insert/Update vào Supabase.
  - Khi lấy dữ liệu (GET), Controller tự động giải mã các field `amount_encrypted` thành con số để gửi về Frontend dưới dạng JSON.

## 4. Tiêu chuẩn Logging
- Bất cứ hành động thay đổi dữ liệu nào đều phải gọi `myLog('FINANCE_AUDIT', ...)` và `myWarning` nếu phát hiện có người dùng bình thường cố tình gửi API sửa quỹ.
