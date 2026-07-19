import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from '../../shared/hooks/useTranslation';
import { PhoneOff } from 'lucide-react';
import { myError } from '../../shared/services/logger';
import '@livekit/components-styles';
import {
    LiveKitRoom,
    VideoConference,
    RoomAudioRenderer,
} from '@livekit/components-react';

export default function VoiceCall({ user, activeCallRoom, onClearActiveCallRoom, addToast }) {
    const { t } = useTranslation();
    const [token, setToken] = useState(null);
    const [serverUrl, setServerUrl] = useState(null);

    // Refs for handlers to prevent unnecessary re-renders
    const addToastRef = useRef(addToast);
    const onClearActiveCallRoomRef = useRef(onClearActiveCallRoom);

    useEffect(() => {
        addToastRef.current = addToast;
        onClearActiveCallRoomRef.current = onClearActiveCallRoom;
    }, [addToast, onClearActiveCallRoom]);

    const handleEndCall = async () => {
        // Notify backend that we ended the call
        if (activeCallRoom?.callId) {
            try {
                const authToken = localStorage.getItem('vuFamilyToken');
                await fetch('/api/calls/end', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': authToken },
                    body: JSON.stringify({ callId: activeCallRoom.callId })
                });
            } catch (e) {
                console.error('[VoiceCall] Failed to end call on backend', e);
            }
        }

        addToastRef.current(t('call.ended') || 'Cuộc gọi kết thúc.', 'info');
        onClearActiveCallRoomRef.current();
    };

    useEffect(() => {
        if (!activeCallRoom) return;

        let isMounted = true;

        const fetchLiveKitToken = async () => {
            try {
                const authToken = localStorage.getItem('vuFamilyToken');
                const roomName = `vufamily-room-${activeCallRoom.roomId}-call-${activeCallRoom.callId}`;
                
                const res = await fetch('/api/livekit/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': authToken },
                    body: JSON.stringify({ roomName })
                });
                
                const json = await res.json();
                
                if (json.success && json.data) {
                    if (isMounted) {
                        setToken(json.data.token);
                        setServerUrl(json.data.url);
                    }
                } else {
                    throw new Error(json.message || 'Lỗi cấp quyền LiveKit');
                }
            } catch (error) {
                myError('LiveKit', 'Token fetch failed', error);
                if (isMounted) {
                    addToastRef.current('Không thể kết nối đến máy chủ gọi điện.', 'error');
                    handleEndCall();
                }
            }
        };

        fetchLiveKitToken();

        return () => {
            isMounted = false;
        };
    }, [activeCallRoom]);

    if (!activeCallRoom || !token || !serverUrl) {
        return (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-xl">
                <div className="flex flex-col items-center gap-4 text-white">
                    <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    <p>Đang chuẩn bị phòng họp ảo...</p>
                    
                    {/* Fallback end call button in case it hangs */}
                    <button onClick={handleEndCall} className="px-6 py-2 bg-rose-600 rounded-full mt-4 flex items-center gap-2 text-sm font-bold shadow-lg hover:bg-rose-500 transition-all">
                        <PhoneOff size={16} /> Cúp máy
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-xl p-0 md:p-6 animate-fade-in">
            <div className="relative w-full h-full md:max-w-6xl md:max-h-[90vh] bg-zinc-950 md:rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
                
                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/80 border-b border-white/5 z-20 shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">{activeCallRoom.requestVideo ? '📹' : '📞'}</span>
                        <div>
                            <h3 className="m-0 text-base font-bold text-white tracking-tight">
                                {activeCallRoom.display_name || t('call.call_label')}
                            </h3>
                            <p className="m-0 text-xs text-zinc-400 font-medium flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                LiveKit Enterprise
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleEndCall}
                        className="px-6 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-2 transition-all shadow-xl shadow-rose-600/30 active:scale-95 shrink-0"
                    >
                        <PhoneOff size={16} />
                        Cúp máy
                    </button>
                </div>

                {/* ── Main Stage (LiveKit Components) ── */}
                <div className="flex-1 relative bg-zinc-950 flex flex-col overflow-hidden" data-lk-theme="default">
                    <LiveKitRoom
                        video={activeCallRoom.requestVideo}
                        audio={true}
                        token={token}
                        serverUrl={serverUrl}
                        connect={true}
                        onDisconnected={handleEndCall}
                        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                    >
                        <VideoConference />
                        <RoomAudioRenderer />
                    </LiveKitRoom>
                </div>
            </div>
        </div>
    );
}
