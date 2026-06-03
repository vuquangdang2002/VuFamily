# Tiêu Chuẩn Mở Rộng Cho Phát Triển Game (Unity/C#) (v1.0)
Tài liệu này mở rộng cho [Tiêu Chuẩn Phát Triển AI Cốt Lõi](file:///e:/_Web/VuFamily/.agents/skills/ai_standard_vi.md) với các quy tắc kiến trúc và viết code chuyên biệt dành cho phát triển Game, tập trung vào công cụ Unity (C#) và logic game hiệu năng cao.

**Mọi Agent AI khi làm việc trên một dự án Game trong workspace này PHẢI tuân thủ các quy tắc tối ưu hóa sau.**

---

## 1. Quy Tắc Kiến Trúc Unity: Tách Biệt Code
Dự án game Unity rất dễ bị phình to và rối loạn do các file code bị phụ thuộc lẫn nhau. AI BẮT BUỘC phải thực thi cấu trúc tách biệt code thành 3 vai trò rõ ràng:

```
┌─────────────────────────────────┐
│              VIEW               │ <── MonoBehaviour (Gắn vào GameObject)
│   - Vẽ UI / Sprite / Mesh       │
│   - Nhận va chạm vật lý (Engine)│
└─────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│             LOGIC               │ <── Class C# thuần (Không kế thừa MonoBehaviour)
│   - Tính toán toán học di chuyển│
│   - Đánh giá luật chơi           │
└─────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│             DATA                │ <── ScriptableObject (File asset dữ liệu)
│   - Các chỉ số Speed, Health    │
│   - Cấu hình các item           │
└─────────────────────────────────┘
```

*   **Logic (C# thuần)**: Tránh kế thừa từ `MonoBehaviour` đối với các class chỉ làm nhiệm vụ tính toán dữ liệu thuần túy. Việc này giúp dễ dàng viết Unit Test và tăng tốc thời gian compile của Unity.
*   **Dữ liệu (ScriptableObjects)**: Lưu trữ các cấu hình game, chỉ số quái vật/nhân vật, thông số màn chơi và các hằng số trong các file asset `ScriptableObject` thay vì viết cứng (hardcode) trong code hoặc lưu trữ trong các prefab.
*   **Hiển thị (MonoBehaviours)**: Giới hạn lớp MonoBehaviour chỉ làm nhiệm vụ nhận sự kiện từ Unity lifecycle (`Start`, `Update`, va chạm) và chuyển tiếp sự kiện đó cho bộ xử lý Logic, hoặc nhận kết quả từ Logic để cập nhật lên View hiển thị (Spine, Sprite, Text UI).

---

## 2. Tối Ưu Hóa Game Loop & Hiệu Năng (Performance Budget)
Main Thread của Unity chạy 60+ lần mỗi giây. Code kém chất lượng trong các hàm lặp sẽ gây ra sụt giảm khung hình đột ngột (giật lag/hiccups).

*   **Không tạo Rác (GC Alloc) trong vòng lặp**:
    *   Tuyệt đối không sử dụng từ khóa `new` (khởi tạo object, list mới) bên trong các hàm `Update()`, `FixedUpdate()`, hoặc `LateUpdate()`. Hãy khởi tạo sẵn (pre-allocate) trong `Start` hoặc sử dụng cơ chế gom nhóm đối tượng (Object Pooling).
    *   Tránh sử dụng các truy vấn **LINQ** (như `.Where()`, `.Select()`) trong các hàm chạy mỗi frame vì chúng cấp phát bộ nhớ Heap tạo rác.
    *   Không cộng chuỗi động trong vòng lặp (ví dụ: `text.text = "Score: " + score;` - hãy lưu cache chuỗi hoặc chỉ cập nhật UI khi điểm số thay đổi thực tế).
*   **Cache tham chiếu Components**:
    *   Không bao giờ gọi `GetComponent<T>()` hoặc `Camera.main` trong hàm `Update()`.
    *   Hãy gọi một lần duy nhất trong `Awake()` hoặc `Start()` và lưu lại trong một biến private (caching).
*   **Ràng buộc vòng lặp Vật Lý**:
    *   Mọi tính năng tính toán vật lý và tác động lực lên `RigidBody` BẮT BUỘC phải thực hiện trong `FixedUpdate()`, không làm trong `Update()`.

---

## 3. Luồng Bất Đồng Bộ & Mô Hình Hướng Sự Kiện
Tránh việc liên tục kiểm tra trạng thái mỗi frame (polling) trong hàm `Update()`.

*   **UniTask**: Sử dụng `UniTask` thay thế cho `Coroutine` truyền thống của Unity để xử lý logic bất động bộ (như chờ UI chạy xong animation, chờ load tài nguyên, gọi mạng). UniTask giúp giảm thiểu 100% rác bộ nhớ heap.
*   **UniRx**: Đối với các thay đổi trạng thái reactive (như máu của nhân vật thay đổi → cập nhật thanh máu UI), hãy sử dụng `ReactiveProperty` hoặc C# Events thay vì liên tục đọc dữ liệu trong hàm `Update()`.
*   **Event Bus**: Xây dựng hệ thống Event Bus lỏng để các thành phần không liên quan giao tiếp với nhau (ví dụ: `SoundManager` phát nhạc khi `Player` ghi điểm, mà không cần liên kết trực tiếp code giữa Player và SoundManager).

---

## 4. Thiết Kế Máy Trạng Thái (FSM - Finite State Machine)
Các logic điều khiển nhân vật, AI của quái vật, hoặc luồng của Game State phải được mô hình hóa bằng máy trạng thái rõ ràng.
*   Mỗi trạng thái (ví dụ: `IdleState`, `RunState`, `JumpState`) phải là một class riêng biệt, nhỏ gọn kế thừa từ một interface trạng thái chung.
*   Không viết các câu lệnh `switch-case` khổng lồ trong hàm `Update()` để điều khiển nhân vật. Chia nhỏ các trạng thái giúp các file script luôn giữ được **dưới 300 dòng**.

---

## 5. Quản Lý Tài Nguyên & Addressables
*   **Tránh tham chiếu trực tiếp**: Tránh kéo thả trực tiếp các tài nguyên nặng (textures độ phân giải cao, file âm thanh dài, Spine assets) vào MonoBehaviour thông qua biến `public GameObject prefab;`. Việc này gây ngốn RAM khi scene được load.
*   **Addressables**: Sử dụng hệ thống **Addressable Asset System** của Unity để tải và giải phóng tài nguyên bất đồng bộ thông qua các wrapper `AssetReference`.
