# Web & Mobile App Extension Standard (v1.0)
This standard extends the [Core AI Developer Standard](file:///e:/_Web/VuFamily/.agents/skills/ai_standard_en.md) with rules specific to Web applications, mobile apps, and client-server architectures.

**Any AI working on a Web or Mobile project in this workspace MUST follow these directives.**

---

## 1. Web/App Architectural Standards
Web and Mobile applications must enforce strict separation between UI Rendering and Network/Logic components using the **Facade & Service Layer Pattern**.

```
┌──────────────────────┐          ┌─────────────────────────┐
│     UI Layer         │          │      Service Layer      │
│                      │          │                         │
│  - React Components  │          │  - api.js (HTTP Client) │
│  - Flutter Widgets   │ ──────▸  │  - AuthHelper.js        │
│  - Swift UI Views    │          │  - TrackingHelper.js    │
│  - HTML/CSS templates│          │  - Cache / Local DB     │
└──────────────────────┘          └─────────────────────────┘
```

### 1.1. UI Layer Rules
*   **Presentational Only**: Components/Views must only handle rendering layout, styles, and capturing user actions.
*   **No Direct Fetching**: Never execute raw `fetch()`, `axios`, or SDK client requests directly inside a View.
*   **No Direct Storage Access**: Never access `localStorage`, `Cookies`, or local storage APIs directly inside UI files. Use wrappers or helper hooks.
*   **Styling Consistency**: Utilize CSS variables, Tailwind tokens, or Style Guides. Avoid hardcoded hex colors, margins, or padding.

### 1.2. Service & Facade Layer Rules
*   **Centralized Requests**: All outbound HTTP/gRPC requests must pass through a unified client module (e.g., `api.js`).
*   **State Management Isolation**: Decouple global state (Redux, Context, Zustand, Bloc) from business logic. Keep side effects inside actions or middleware.
*   **Error Normalization**: The API service must intercept errors and translate them into a standard application-friendly format before returning them to UI views.

---

## 2. API Contract & Data Exchange Rules
*   **Standard Payload**: All API endpoints should return a structured envelope, e.g.:
    ```json
    {
      "success": true,
      "data": {},
      "message": "Optional user message",
      "error": "Optional system error detail"
    }
    ```
*   **Idempotency & HTTP Verbs**: Respect REST standards:
    *   `GET`: Read (idempotent, safe).
    *   `POST`: Create (not idempotent).
    *   `PUT`: Replace/Upsert.
    *   `PATCH`: Partial modification.
    *   `DELETE`: Remove.

---

## 3. Database Schema & Query Optimization
*   **No N+1 Queries**: When retrieving list data, use join queries or batching (`WHERE IN`) instead of querying the database inside loops.
*   **Indexing**: Index fields commonly used in filtering, joining, or searching (e.g., `user_id`, `email`, `created_at`, `status`).
*   **Validation**: Enforce schema validations at the database layer (constraints, foreign keys) and validate requests at the controller level before writing to the DB.

---

## 4. Web-Specific Optimization Recommendations
1.  **Strict Component Splitting**:
    *   Keep React components, Vue templates, or Flutter widgets small. Extract lists, rows, headers, and form fields into separate files.
    *   Ensure any new component file is **under 300 lines**.
2.  **Explicit i18n**:
    *   Never hardcode UI text strings. Always use internationalization libraries (like `i18next`, standard JSON resource files).
3.  **Responsive Layout Budgeting**:
    *   Write CSS/styling in a mobile-first approach. Ensure every view is tested across Mobile, Tablet, and Desktop resolutions.
