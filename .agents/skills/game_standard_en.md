# Game Development Extension Standard (Unity/C#) (v1.0)
This standard extends the [Core AI Developer Standard](file:///e:/_Web/VuFamily/.agents/skills/ai_standard_en.md) with architectural and coding rules specifically tailored for Game Development, focusing on Unity (C#) and high-performance game logic.

**Any AI working on a Game project in this workspace MUST adhere to these optimization rules.**

---

## 1. Unity Architecture Rules: Clean Scripting
Unity projects can easily degrade into massive, tightly-coupled codebases. The AI MUST enforce clean architecture by splitting scripts into three distinct roles:

```
┌─────────────────────────────────┐
│              VIEW               │ <── MonoBehaviour (Attach to GameObject)
│   - Renders UI / Sprite / Mesh  │
│   - Receives Engine Collisions  │
└─────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│             LOGIC               │ <── Pure C# Class (No MonoBehaviour inheritance)
│   - Calculates movement math    │
│   - Evaluates game rules        │
└─────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│             DATA                │ <── ScriptableObject (Asset file)
│   - Speed, Health values        │
│   - Item configurations         │
└─────────────────────────────────┘
```

*   **Logic (Pure C#)**: Avoid inheriting from `MonoBehaviour` for pure data-processing or math calculations. This allows unit testing and speeds up compiling.
*   **Data (ScriptableObjects)**: Store game configurations, stats, levels, and constants in `ScriptableObject` assets rather than hardcoding values in scripts or prefabs.
*   **View (MonoBehaviours)**: Limit MonoBehaviours to receiving Unity lifecycle events (`Start`, `Update`, collisions) and relaying them to logic handlers, or updating rendering assets (Spine, Sprites, Text).

---

## 2. Game Loop & Performance Budgeting
The Unity Main Thread runs 60+ times per second. Bad code inside `Update()` causes frame rate drops ("hiccups").

*   **No Garbage Collection (GC Alloc) inside loops**:
    *   Never use `new` keywords (allocating objects/lists) inside `Update()`, `FixedUpdate()`, or `LateUpdate()`. Pre-allocate arrays/lists or use object pooling.
    *   Avoid using **LINQ** queries (e.g., `.Where()`, `.Select()`) inside loops as they allocate heap memory.
    *   Do not instantiate strings dynamically in loops (e.g., `text.text = "Score: " + score;` - use cached string formatting or update only when the value changes).
*   **Cache Component References**:
    *   Never call `GetComponent<T>()` or `Camera.main` inside `Update()`.
    *   Call them once inside `Awake()` or `Start()` and cache the reference in a private variable.
*   **Physics Loop Constraints**:
    *   All physics calculations and RigidBody manipulations MUST happen inside `FixedUpdate()`, not `Update()`.

---

## 3. Asynchronous Flow & Event-Driven Patterns
Avoid heavy frame polling (checking states every frame in `Update()`).

*   **UniTask**: Use `UniTask` instead of traditional Unity `Coroutines` for asynchronous logic (e.g., waiting for UI animation, loading assets, network delays). It allocates zero GC memory.
*   **UniRx**: For reactive state changes (e.g., updating UI when health changes), use `ReactiveProperty` or classic C# Events instead of querying states inside `Update()`.
*   **Event Bus**: Implement a loose event-driven system to communicate between unrelated systems (e.g., `SoundManager` playing an audio clip when `Player` scores).

---

## 4. State Machine (FSM) Design
Character control, enemy AI, and Game Flow must be modeled using explicit **Finite State Machines (FSM)**.
*   Each state (e.g., `IdleState`, `RunState`, `JumpState`) must be a separate, small class inheriting from a base state interface.
*   Do not write long switch-cases inside a single `Update()` method to handle states. Keep individual script files **under 300 lines** by splitting states.

---

## 5. Asset Management & Addressables
*   **Decoupled Assets**: Never directly reference massive assets (high-res textures, audio tracks, Spine assets) inside MonoBehaviours using `public GameObject prefab;`. This inflates scene load memory.
*   **Addressables**: Use Unity's **Addressable Asset System** to load and unload prefabs/assets asynchronously via `AssetReference` handle wrappers.
