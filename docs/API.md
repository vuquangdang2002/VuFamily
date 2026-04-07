# 🔌 API Reference — VuFamily

> Base URL: `https://vu-family.vercel.app/api`  
> Auth: Token-based (`x-auth-token` header)

---

## 🔐 Authentication

### `POST /auth/login`
Đăng nhập, trả về token + thông tin user.

```json
// Request
{ "username": "dangvq", "password": "***" }

// Response 200
{
  "success": true,
  "data": {
    "id": 1,
    "username": "dangvq",
    "displayName": "Vũ Quang Đăng",
    "role": "admin",
    "token": "abc123..."
  }
}
```

### `POST /auth/logout` 🔒
Hủy session token.

### `GET /auth/me` 🔒
Lấy thông tin user hiện tại (dùng để verify token).

### `POST /auth/change-password` 🔒
```json
{ "currentPassword": "old", "newPassword": "new" }
```

### `POST /auth/forgot-password`
Đặt lại mật khẩu, gửi email cho admin.
```json
{ "username": "dangvq" }
```

---

## 👥 User Management (Admin Only)

### `GET /users` 👑
Danh sách tất cả tài khoản.

### `POST /users` 👑
Tạo tài khoản mới.
```json
{ "username": "newuser", "password": "***", "displayName": "Tên", "role": "viewer" }
```

### `DELETE /users/:id` 👑
Xóa tài khoản (không thể xóa chính mình).

### `POST /users/:id/reset-password` 👑
Admin đặt lại mật khẩu cho user.
```json
{ "newPassword": "***" }
```

---

## 🌳 Members (Thành viên)

### `GET /members`
Danh sách toàn bộ thành viên + achievements.

### `GET /members/:id`
Chi tiết 1 thành viên.

### `GET /members/search?q=keyword`
Tìm kiếm tên thành viên.

### `GET /members/:id/children`
Danh sách con.

### `GET /members/:id/achievements`
Danh sách thành tựu.

### `POST /members` 👑
Thêm thành viên mới.
```json
{
  "name": "Vũ Văn A",
  "gender": 1,
  "birthDate": "1990-01-01",
  "parentId": 1,
  "generation": 3
}
```

### `PUT /members/:id` 👑
Cập nhật thông tin thành viên.

### `DELETE /members/:id` 👑
Xóa thành viên (con sẽ mất liên kết parent).

---

## 📰 Posts (Bảng tin)

### `GET /posts`
Danh sách bài đăng + reaction summary + comment count.

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "content": "Hello World",
      "author": "Quản trị viên",
      "author_role": "admin",
      "created_at": "2026-04-07T...",
      "reactions": { "❤️": { "count": 2, "users": [1, 3] } },
      "comment_count": 5
    }
  ]
}
```

### `POST /posts` 🔒
Đăng bài mới.
```json
{ "content": "Nội dung bài đăng..." }
```

### `DELETE /posts/:id` 👑
Xóa bài đăng.

---

## 💬 Comments (Bình luận)

### `GET /posts/:id/comments`
Danh sách bình luận của 1 bài đăng.

### `POST /posts/:id/comments` 🔒
Thêm bình luận.
```json
{ "content": "Bình luận hay quá!" }
```

### `DELETE /comments/:id` 👑
Xóa bình luận.

---

## ❤️ Reactions (Cảm xúc)

### `POST /posts/:id/reactions` 🔒
Toggle reaction (thêm nếu chưa có, xóa nếu đã có).
```json
{ "emoji": "❤️" }
```

Emojis hỗ trợ: `❤️` `👍` `😂` `😮` `😢`

---

## 📋 Update Requests (Yêu cầu chỉnh sửa)

### `GET /requests` 🔒
Danh sách yêu cầu.

### `GET /requests/pending` 👑
Yêu cầu chờ duyệt.

### `POST /requests` 🔒
Gửi yêu cầu chỉnh sửa.
```json
{
  "memberId": 5,
  "changes": "{\"name\":\"Tên mới\"}",
  "note": "Sửa tên sai"
}
```

### `POST /requests/:id/approve` 👑
Duyệt yêu cầu.

### `POST /requests/:id/reject` 👑
Từ chối yêu cầu.
```json
{ "reason": "Thông tin chưa chính xác" }
```

---

## 📊 Stats

### `GET /stats`
Thống kê tổng quan.
```json
{
  "success": true,
  "data": { "totalMembers": 19, "totalGenerations": 5 }
}
```

---

## 🔑 Auth Legend

| Icon | Mô tả |
|------|--------|
| — | Không cần đăng nhập |
| 🔒 | Cần đăng nhập (`x-auth-token` header) |
| 👑 | Cần quyền admin |

## ❌ Error Response Format

```json
{
  "success": false,
  "error": "Mô tả lỗi bằng tiếng Việt"
}
```

| Status | Mô tả |
|--------|--------|
| `400` | Bad Request (thiếu dữ liệu) |
| `401` | Unauthorized (chưa đăng nhập / token hết hạn) |
| `403` | Forbidden (không đủ quyền) |
| `404` | Not Found |
| `500` | Server Error |
