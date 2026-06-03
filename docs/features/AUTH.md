# Feature: Authentication (Auth)

## 1. Overview
The Authentication module handles login, registration, password policies, user roles (Viewer, Editor, Admin), and session management. It secures server-side serverless endpoints and client-side page transitions.

---

## 2. Directory Structure
- **Client Components**: `client/src/features/auth/`
    - `LoginPage.jsx` (Login & registration layouts)
    - `ProfileModal.jsx` (User settings and password update popup)
- **Shared Helpers**:
    - `client/src/shared/services/AuthHelper.js` (Session management and token getters/setters)
- **Server Endpoints**: `/api/auth/*` (e.g. `api/auth/login.js`, `api/auth/me.js`)
- **Server Security Middleware**: `server/middleware/`

---

## 3. Core Features
1. **User Login (`/api/auth/login`)**:
   - Compares credentials, validates against hashed passwords in Supabase using `bcryptjs`.
   - Generates and returns a JSON Web Token (JWT) containing user identity and role.
2. **Session Persistence (`/api/auth/me`)**:
   - Auto-checks token stored in client's `localStorage` on application startup to verify if session remains valid.
3. **Password Security Policy**:
   - Password changes must satisfy Regex: `^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})` (Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character).

---

## 4. Sequence & Control Flow Diagrams

### 4.1. Login Sequence Flow
The diagram below represents how client credentials flow through the system and how token sessions are generated.

```mermaid
sequenceDiagram
    autonumber
    actor User as User UI
    participant Client as LoginPage
    participant Helper as AuthHelper
    participant API as api.js (Service)
    participant Server as /api/auth/login
    participant DB as Supabase DB

    User->>Client: Enters Username & Password
    Client->>API: Calls login(username, password)
    API->>Server: HTTP POST /api/auth/login (Payload)
    Server->>DB: Query User details by Username
    DB-->>Server: Returns user info & hashed password
    Server->>Server: bcrypt.compare(password, hash)
    alt Credentials Valid
        Server->>Server: Generate JWT (ID, Role)
        Server-->>API: Returns { success: true, token, user }
        API-->>Client: Returns data envelope
        Client->>Helper: Calls AuthHelper.setToken(token)
        Helper->>Helper: Save to localStorage('vuFamilyAuth')
        Client-->>User: Navigate to Dashboard / Tree
    else Credentials Invalid
        Server-->>API: Returns { success: false, error: 'Invalid...' }
        API-->>Client: Propagates error state
        Client-->>User: Display Toast error message
    end
```

### 4.2. API Middleware Authentication Flow
This flowchart describes how the server validates JWT tokens on protected REST endpoints.

```mermaid
flowchart TD
    A[Incoming API Request] --> B{Has Authorization Header?}
    B -->|No| C[Return 401 Unauthorized]
    B -->|Yes| D[Extract JWT Token Bearer]
    D --> E{jwt.verifyToken}
    E -->|Invalid / Expired| F[Return 403 Forbidden]
    E -->|Valid| G[Attach decoded user context to req.user]
    G --> H{Requires Admin Role?}
    H -->|No| I[Proceed to Controller Handler]
    H -->|Yes| J{Is req.user.role == admin?}
    J -->|No| K[Return 403 Forbidden - Admin Only]
    J -->|Yes| I
```
