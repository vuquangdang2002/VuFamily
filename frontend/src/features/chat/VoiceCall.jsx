import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../shared/hooks/useTranslation';
import { PhoneOff } from 'lucide-react';

export default function VoiceCall({ user, activeCallRoom, onClearActiveCallRoom, addToast }) {
    const { t } = useTranslation();
    const jitsiContainerRef = useRef(null);
    const jitsiApiRef = useRef(null);
    const [loading, setLoading] = useState(true);

    // Keep functions in refs to avoid useEffect dependency triggers on every render
    const addToastRef = useRef(addToast);
    const onClearActiveCallRoomRef = useRef(onClearActiveCallRoom);

    useEffect(() => {
        addToastRef.current = addToast;
        onClearActiveCallRoomRef.current = onClearActiveCallRoom;
    }, [addToast, onClearActiveCallRoom]);
    const handleEndCall = async () => {
        if (jitsiApiRef.current) {
            jitsiApiRef.current.dispose();
            jitsiApiRef.current = null;
        }
        
        // Notify backend that we ended the call
        if (activeCallRoom?.callId) {
            try {
                const token = localStorage.getItem('vuFamilyToken');
                await fetch('/api/calls/end', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
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
        if (!activeCallRoom || !jitsiContainerRef.current) return;

        // Ensure Jitsi API is loaded
        if (!window.JitsiMeetExternalAPI) {
            addToastRef.current('Chưa tải được Jitsi API. Vui lòng tải lại trang.', 'error');
            handleEndCall();
            return;
        }

        // Generate a unique room name for this call
        // For example: vufamily-room-2-call-12345
        const roomName = `vufamily-room-${activeCallRoom.roomId}-call-${activeCallRoom.callId}`;
        
        console.log(`[Jitsi] Starting call in room: ${roomName}`);

        const domain = 'meet.ffmuc.net';
        const options = {
            roomName: roomName,
            width: '100%',
            height: '100%',
            parentNode: jitsiContainerRef.current,
            configOverwrite: {
                startWithAudioMuted: false,
                startWithVideoMuted: !activeCallRoom.requestVideo,
                prejoinPageEnabled: false,
                disableDeepLinking: true,
                p2p: {
                    enabled: true // Prefer p2p if only 2 people
                },
                resolution: 720
            },
            interfaceConfigOverwrite: {
                DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                SHOW_CHROME_EXTENSION_BANNER: false,
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'desktop', 'fullscreen',
                    'fodeviceselection', 'hangup', 'profile', 'chat', 'settings',
                    'raisehand', 'videoquality', 'filmstrip', 'shortcuts',
                    'tileview', 'select-background', 'mute-everyone', 'security'
                ]
            },
            userInfo: {
                displayName: user?.full_name || user?.username || 'Thành viên',
                email: user?.email || '',
            }
        };

        if (user?.avatar) {
            options.userInfo.avatarURL = user.avatar.startsWith('http') 
                ? user.avatar 
                : `${window.location.origin}${user.avatar}`;
        }

        try {
            const api = new window.JitsiMeetExternalAPI(domain, options);
            jitsiApiRef.current = api;

            api.addEventListener('videoConferenceJoined', () => {
                setLoading(false);
                addToastRef.current(t('call.connected') || 'Đã kết nối vào phòng gọi.', 'success');
            });

            api.addEventListener('videoConferenceLeft', () => {
                console.log('[Jitsi] User left the conference.');
                handleEndCall();
            });
            
            api.addEventListener('readyToClose', () => {
                console.log('[Jitsi] Ready to close (redirect/hangup).');
                handleEndCall();
            });

            const hideLoading = () => setLoading(false);
            api.addEventListener('cameraError', hideLoading);
            api.addEventListener('micError', hideLoading);
            api.addEventListener('errorOccurred', hideLoading);

            // Force hide loading after 5 seconds in case browser blocks the event
            const fallbackTimer = setTimeout(() => {
                setLoading(false);
            }, 5000);

            jitsiApiRef.current._fallbackTimer = fallbackTimer;

        } catch (e) {
            console.error('[Jitsi] Init error:', e);
            addToastRef.current('Lỗi khởi tạo cuộc gọi.', 'error');
            handleEndCall();
        }

        return () => {
            if (jitsiApiRef.current) {
                if (jitsiApiRef.current._fallbackTimer) {
                    clearTimeout(jitsiApiRef.current._fallbackTimer);
                }
                jitsiApiRef.current.dispose();
                jitsiApiRef.current = null;
            }
        };
    }, [activeCallRoom, user]);

    if (!activeCallRoom) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-xl p-0 md:p-6 animate-fade-in">
            <div className="relative w-full h-full md:max-w-5xl md:max-h-[85vh] bg-zinc-950 md:rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
                
                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/80 border-b border-white/5 z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">{activeCallRoom.requestVideo ? '📹' : '📞'}</span>
                        <div>
                            <h3 className="m-0 text-base font-bold text-white tracking-tight">
                                {activeCallRoom.display_name || t('call.call_label')}
                            </h3>
                            <p className="m-0 text-xs text-zinc-400 font-medium flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${!loading ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                {!loading ? t('call.connected') || 'Đã kết nối' : t('call.dialing') || 'Đang gọi...'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleEndCall}
                        className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs md:text-sm flex items-center gap-2 transition-all shadow-lg shadow-rose-600/30 active:scale-95 shrink-0"
                    >
                        <PhoneOff size={16} />
                        {t('call.end_btn') || 'Kết thúc cuộc gọi'}
                    </button>
                </div>

                {/* ── Main Jitsi Stage ── */}
                <div className="flex-1 relative bg-zinc-950 flex items-center justify-center overflow-hidden">
                    <div ref={jitsiContainerRef} className="w-full h-full" />
                </div>
            </div>
        </div>
    );
}
