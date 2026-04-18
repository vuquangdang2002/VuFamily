# VuFamily Features Documentation

## 1. Gia Phả (Family Tree)
- **View Mode**: Displays members in a hierarchical node structure (`TreeCanvas.jsx`). Supports Pan, Zoom, and Minimap.
- **Edit Mode (Admin)**: Create, Update, Delete members directly. Connect parents and spouses.
- **Request Mode (Viewer)**: Propose edits to existing members.
- **Search & Detail**: Search by name. Side panel to view full member info (Achievements, Lifecycle events).

## 2. Bảng Tin (Newsfeed)
- **Posts**: Viewers and Admins can post updates.
- **Reactions & Comments**: Standard social features.

## 3. Lịch & Sự Kiện (Calendar)
- Shows upcoming birthdays (solar) and death anniversaries (lunar, calculated dynamically).

## 4. Quản lý Yêu Cầu (Requests)
- Admins review (`approve`/`reject`) profile update requests submitted by viewers.
- History diff view to compare what changed before approving.

## 5. Chat & Voice Call (Liên Lạc)
- **Direct & Group Chat**: Send text messages.
- **Voice Call**: Real-time WebRTC audio calling.

## 6. Thành Viên & Tài Khoản (Accounts)
- Admin can manage all user credentials.
- Users can update their own passwords and avatars.
