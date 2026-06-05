const ChatModel = require('../models/ChatModel');
const { FEATURES } = require('../config/constants');
const CHAT_CONFIG = require('../config/features/chat');

/**
 * [API] Lấy lịch sử tin nhắn của một phòng chat cụ thể
 * Hỗ trợ phân trang và đồng bộ dữ liệu mới (Incremental Fetch) qua tham số `since`.
 */
async function getMessages(req, res) {
    console.log(`[ChatController - getMessages] Fetching messages for Room ID: ${req.params.id}, User ID: ${req.user.id}`);
    try {
        const roomId = parseInt(req.params.id);
        const userId = req.user.id;

        const membership = await ChatModel.getMembership(roomId, userId);

        if (!membership) {
            console.warn(`[ChatController - getMessages] CẢNH BÁO: User ID ${userId} cố gắng truy cập trái phép vào Phòng ID ${roomId}`);
            return res.status(403).json({ success: false, error: 'Bạn không có quyền xem nhóm chat này' });
        }

        const sinceParam = req.query.since;
        
        const limit = FEATURES.ENABLE_CHAT_HISTORY_ARCHIVE ? CHAT_CONFIG.MAX_MESSAGES_PER_PAGE : CHAT_CONFIG.FALLBACK_LIMIT;

        const messages = await ChatModel.getMessages(roomId, sinceParam, limit);

        await ChatModel.updateLastRead(roomId, userId);

        console.log(`[ChatController - getMessages] Returning ${messages?.length || 0} messages for Room ID: ${roomId}`);
        res.json({ success: true, data: messages || [] });
    } catch (e) {
        console.error(`[ChatController - getMessages] CRITICAL ERROR at Room ID ${req.params.id}:`, e);
        res.status(500).json({ success: false, error: e.message || 'Lỗi server' });
    }
}

/**
 * [API] Gửi một tin nhắn mới vào phòng chat
 * Sau khi lưu thành công, Hub (WebSockets) sẽ làm nhiệm vụ broadcast tin nhắn này cho những người khác.
 */
async function sendMessage(req, res) {
    console.log(`[ChatController - sendMessage] User ID: ${req.user.id} sending message to Room ID: ${req.params.id}`);
    try {
        const roomId = parseInt(req.params.id);
        const userId = req.user.id;
        const { content } = req.body;
        
        if (!content || !content.trim()) return res.status(400).json({ success: false, error: 'Tin nhắn rỗng' });

        const membership = await ChatModel.getMembership(roomId, userId);

        if (!membership) {
            return res.status(403).json({ success: false, error: 'Bạn không có quyền gửi tin vào nhóm này' });
        }

        const message = await ChatModel.saveMessage(roomId, userId, content.trim());
        
        await ChatModel.updateRoomTimestamp(roomId);

        console.log(`[ChatController - sendMessage] Sent successfully. Message ID: ${message.id}`);
        res.json({ success: true, data: message });
    } catch (e) {
        console.error(`[ChatController - sendMessage] ERROR sending message to Room ID ${req.params.id}:`, e);
        res.status(500).json({ success: false, error: e.message || 'Lỗi server' });
    }
}

module.exports = {
    getMessages,
    sendMessage
};
