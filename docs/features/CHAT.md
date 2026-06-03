# Feature: Real-time Chat & Calling

## 1. Overview
The Real-time Chat module handles direct and group messaging, offline message caching using IndexedDB, and WebRTC voice/video signaling. It functions entirely in-house without relying on third-party messaging services.

---

## 2. Directory Structure
- **Frontend Components**: `client/src/features/chat/`
    - `ChatPage.jsx` (Chat room layouts and message bubbles)
    - `VoiceCall.jsx` (Voice & video call overlay component using WebRTC signaling)
- **Shared Helpers**:
    - `client/src/shared/services/chatCache.js` (IndexedDB schema & message cache operations)
- **Server Logic**:
    - `server/controllers/chatController.js` (Business rules and membership validation)
    - `server/utils/realtimeHub.js` (Socket.io event broadcaster)
- **API Routes**: `/api/chats/*`

---

## 3. Core Features
1. **Incremental Fetching**:
   - UI instantly renders old messages from IndexedDB cache (`chatCache.js`) for instant loading.
   - Client sends background query `GET /api/chats/:id/messages?since=[last_cached_date]` to fetch only incremental updates and updates local cache.
2. **Real-time Broadcaster**:
   - Server-side Socket.io hub broadcasts incoming messages immediately to online room members.

---

## 4. Flow & Architecture Diagrams

### 4.1. Real-time Message Lifecycle
The diagram below describes the sequence of sending a message, broadcasting it over WebSockets, and updating local browser caches.

```mermaid
sequenceDiagram
    autonumber
    actor A as User Alice
    participant CA as Alice Client
    participant DB_C as IndexedDB Cache
    participant Hub as Socket.io (realtimeHub)
    participant Server as chatController.js
    participant DB as Supabase DB
    actor B as User Bob
    participant CB as Bob Client

    A->>CA: Types & Sends message
    CA->>DB_C: Store pending message (Status: sending)
    CA->>Server: HTTP POST /api/chats/:id/messages
    Server->>Server: Validate Alice is member of Room
    alt Alice is member
        Server->>DB: Save Message details
        DB-->>Server: Returns saved message object
        Server->>Hub: Triggers broadcast event
        Hub->>CB: Socket Emit `chat:message` (Payload)
        CB->>DB_C: Save incoming message to Bob's cache
        CB-->>B: Render new bubble (Alice: Hello)
        Server-->>CA: Return HTTP 200 { success: true, message }
        CA->>DB_C: Update Alice's cache (Status: sent)
        CA-->>A: Render sent status checkmark
    else Alice is not member
        Server-->>CA: Return HTTP 403 Forbidden
        CA->>DB_C: Mark message in Alice's cache (Status: failed)
        CA-->>A: Render exclamation error icon
    end
```

### 4.2. Chat Synchronization Protocol
Flowchart representing how the client updates messages efficiently on startup.

```mermaid
flowchart TD
    A[Open Chat Room] --> B[Fetch messages from local IndexedDB cache]
    B --> C[Render cached messages immediately on UI]
    C --> D[Identify date of most recent cached message]
    D --> E[Call API: GET /api/chats/:id/messages?since=last_date]
    E --> F{Has new messages?}
    F -->|No| G[Stop - Sync completed]
    F -->|Yes| H[Save new messages to local IndexedDB]
    H --> I[Append new messages to UI chat bubble list]
    I --> G
```
