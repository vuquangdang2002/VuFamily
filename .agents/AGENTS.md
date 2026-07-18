# Vu Gia Family Project - AI Agent Rules & Guidelines

## 1. Kiến trúc thư mục Frontend (Feature-Driven)
- Toàn bộ thư mục `frontend/src/` được chia theo `features/`.
- Mỗi feature (VD: `home/`, `auth/`) phải có `components/` và `styles/`.
- **Tách bạch CSS & JSX**: Tuyệt đối không nhồi nhét quá nhiều class Tailwind dài dòng vào thẻ JSX. Phải bóc tách các style phức tạp ra các file `.css` tương ứng trong thư mục `styles/` của feature đó bằng `@apply`.
- Khi dùng `@apply` trong Tailwind v4 ở các file CSS rời, **phải** có dòng `@reference "tailwindcss";` ở đầu file.
- Tuyệt đối KHÔNG dùng các class dạng pseudo-state đặc thù (`group`, `peer`, `custom-scrollbar`...) trong hàm `@apply` vì Tailwind v4 sẽ không nhận diện được ngữ cảnh DOM. Thay vào đó, thêm trực tiếp các class này vào thẻ JSX (VD: `<div className="guest-card group">`).

## 2. Tiêu chuẩn UI/UX (Rất quan trọng!)
Dự án "Vũ Gia" không chỉ là website gia phả thông thường mà định vị là một **hệ sinh thái số hóa cao cấp, sang trọng, hiện đại**. Khi thiết kế, phải tuân thủ các thẩm mỹ (Aesthetics) sau:

- **Màu sắc chủ đạo**:
  - Background (Dark mode mặc định): Tối thẫm, sang trọng (VD: `#050505`, `#0b0f19`, `#0d1117`).
  - Màu nhấn (Primary Accent): Cam/Vàng hoàng kim (VD: `#fe6e00`, `amber-500`) tượng trưng cho sự thịnh vượng, huyết thống, và ánh sáng.
- **Glassmorphism & Hiệu ứng phát sáng**:
  - Thường xuyên dùng `backdrop-blur-md`, `backdrop-blur-xl` kết hợp với nền có độ trong suốt (VD: `bg-black/40` hoặc `bg-white/5`).
  - Dùng hiệu ứng sáng (glow/blur) ở background để tạo chiều sâu (VD: cục sáng tròn bự mờ `blur-[120px] mix-blend-screen`).
- **Typography & Căn lề (Spacing)**:
  - Font chữ: Inter, Outfit. Chú ý line-height (`leading-relaxed`) và độ nét.
  - Phải sử dụng khoảng cách (gap, margin, padding) một cách RỘNG RÃI, tránh để nội dung bị dính vào nhau (crunched/squished). Đặc biệt với các Form: ưu tiên dùng `flex flex-col gap-4` thay vì `space-y` để tránh lỗi với Fragment.
- **Micro-interactions (Chuyển động)**:
  - Mọi nút bấm, card khi hover đều phải có hiệu ứng (VD: `hover:scale-[1.02]`, đổi màu viền, bóng đổ shadow).
  - Tích hợp Framer Motion để tạo hiệu ứng mượt mà (Fade In, Slide Up) khi render component.

## 3. Quy trình bảo trì
- Không bao giờ xoá code hiện tại mà không test kĩ.
- Khi làm mới 1 component to, hãy tạo file test/backup hoặc làm theo Checklist chia nhỏ.
