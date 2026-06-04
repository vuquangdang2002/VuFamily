/**
 * ChatModals — re-export wrapper for backward compatibility.
 * The two modals have been split into focused sub-components:
 *   - NewChatModal (./NewChatModal.jsx)
 *   - GroupInfoModal (./GroupInfoModal.jsx)
 */
import React from 'react';
import NewChatModal from './NewChatModal';
import GroupInfoModal from './GroupInfoModal';

export default function ChatModals({
    showNewChat, setShowNewChat,
    showGroupInfo, setShowGroupInfo,
    activeRoom, user, allUsers,
    selectedUserIds, toggleSelectUser,
    handleCreateRoom, currentUserRole,
    handleKickMember, handleLeaveGroup,
    handleUpdateSettings, handleAddMember,
    handleUpdateMemberRole
}) {
    return (
        <>
            <NewChatModal
                showNewChat={showNewChat}
                setShowNewChat={setShowNewChat}
                allUsers={allUsers}
                selectedUserIds={selectedUserIds}
                toggleSelectUser={toggleSelectUser}
                handleCreateRoom={handleCreateRoom}
            />
            <GroupInfoModal
                showGroupInfo={showGroupInfo}
                setShowGroupInfo={setShowGroupInfo}
                activeRoom={activeRoom}
                user={user}
                allUsers={allUsers}
                currentUserRole={currentUserRole}
                handleKickMember={handleKickMember}
                handleLeaveGroup={handleLeaveGroup}
                handleUpdateSettings={handleUpdateSettings}
                handleAddMember={handleAddMember}
                handleUpdateMemberRole={handleUpdateMemberRole}
            />
        </>
    );
}
