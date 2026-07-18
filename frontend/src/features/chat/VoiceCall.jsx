import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../shared/hooks/useTranslation';

export default function VoiceCall({ user, activeCallRoom, onClearActiveCallRoom, addToast }) {
    const { t } = useTranslation();
    const jitsiContainerRef = useRef(null);
    const jitsiAPIRef = useRef(null);
    const [jitsiLoaded, setJitsiLoaded] = useState(false);

    useEffect(() => {
        if (!activeCallRoom) return;

        // Load Jitsi Meet External API script dynamically
        const scriptId = 'jitsi-external-api-script';
        let script = document.getElementById(scriptId);

        const initJitsi = () => {
            if (!activeCallRoom || !window.JitsiMeetExternalAPI) return;

            // Dispose existing instance if any
            if (jitsiAPIRef.current) {
                jitsiAPIRef.current.dispose();
            }

            // Create unique room name for security/uniqueness
            const roomName = `vufamily_call_room_${activeCallRoom.id}`;

            const domain = 'meet.jit.si';
            const options = {
                roomName: roomName,
                width: '100%',
                height: '100%',
                parentNode: jitsiContainerRef.current,
                configOverwrite: {
                    startWithAudioMuted: false,
                    startWithVideoMuted: !activeCallRoom.requestVideo,
                    prejoinPageEnabled: false, // Join immediately
                    disableWelcomePage: true,
                    enableClosePage: false,
                    apiClientID: null,
                    p2p: { enabled: true }
                },
                interfaceConfigOverwrite: {
                    SHOW_JITSI_WATERMARK: false,
                    SHOW_BRAND_WATERMARK: false,
                    SHOW_WATERMARK_FOR_GUESTS: false,
                    DEFAULT_BACKGROUND: '#1C1C1E',
                    TOOLBAR_BUTTONS: [
                        'microphone', 'camera', 'closedcaptions', 'desktop', 
                        'fullscreen', 'fodeviceselection', 'hangup', 'profile', 
                        'chat', 'settings', 'raisehand', 'videoquality', 
                        'tileview', 'videobackgroundblur'
                    ]
                },
                userInfo: {
                    displayName: user.display_name || user.displayName || user.username,
                    email: user.email || '',
                    avatarUrl: user.avatar || ''
                }
            };

            try {
                const api = new window.JitsiMeetExternalAPI(domain, options);
                jitsiAPIRef.current = api;
                setJitsiLoaded(true);

                // Close modal when user leaves call (e.g. presses hangup)
                api.addEventListener('videoConferenceLeft', () => {
                    onClearActiveCallRoom();
                });
            } catch (err) {
                console.error('[Jitsi] Initialization failed:', err);
                addToast('Không thể kết nối dịch vụ cuộc gọi.', 'error');
                onClearActiveCallRoom();
            }
        };

        if (script) {
            initJitsi();
        } else {
            script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://meet.jit.si/external_api.js';
            script.async = true;
            script.onload = initJitsi;
            document.body.appendChild(script);
        }

        return () => {
            if (jitsiAPIRef.current) {
                jitsiAPIRef.current.dispose();
                jitsiAPIRef.current = null;
            }
            setJitsiLoaded(false);
        };
    }, [activeCallRoom, user, onClearActiveCallRoom, addToast]);

    if (!activeCallRoom) return null;

    return (
        <div className="jitsi-call-overlay" style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            padding: window.innerWidth <= 768 ? '0' : '24px',
            animation: 'jitsiFadeIn 0.3s ease-out'
        }}>
            <div className="jitsi-call-container" style={{
                width: window.innerWidth <= 768 ? '100vw' : '90vw',
                height: window.innerWidth <= 768 ? '100vh' : '85vh',
                maxWidth: '1200px',
                background: '#1C1C1E',
                borderRadius: window.innerWidth <= 768 ? '0' : '24px',
                border: window.innerWidth <= 768 ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 24px',
                    background: '#121214',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 20 }}>{activeCallRoom.requestVideo ? '📹' : '📞'}</span>
                        <div>
                            <div style={{ color: '#FFFFFF', fontWeight: 600, fontSize: 16 }}>
                                {activeCallRoom.display_name || 'Cuộc gọi dòng họ'}
                            </div>
                            <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 12 }}>
                                {activeCallRoom.requestVideo ? 'Cuộc gọi Video' : 'Cuộc gọi thoại'} • Kết nối bảo mật
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onClearActiveCallRoom}
                        style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#EF4444',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '8px 16px',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                        }}
                    >
                        Tắt cuộc gọi
                    </button>
                </div>

                {/* Jitsi Box */}
                <div style={{ flex: 1, position: 'relative', background: '#1C1C1E' }}>
                    {!jitsiLoaded && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'rgba(255, 255, 255, 0.5)',
                            gap: 16
                        }}>
                            <div style={{
                                width: 40,
                                height: 40,
                                border: '3px solid rgba(255, 255, 255, 0.1)',
                                borderTop: '3px solid #0A84FF',
                                borderRadius: '50%',
                                animation: 'jitsiSpin 1s linear infinite'
                            }} />
                            <span>Đang thiết lập kết nối cuộc gọi...</span>
                        </div>
                    )}
                    <div ref={jitsiContainerRef} style={{ width: '100%', height: '100%' }} />
                </div>
            </div>

            <style>
                {`
                @keyframes jitsiFadeIn {
                    from { opacity: 0; transform: scale(0.98); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes jitsiSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                `}
            </style>
        </div>
    );
}
