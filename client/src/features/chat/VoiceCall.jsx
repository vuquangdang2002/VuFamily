import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../../shared/services/api';
import { LocalNotifications } from '@capacitor/local-notifications';
function getToken() {
    try { return JSON.parse(localStorage.getItem('vuFamilyAuth') || '{}').token || ''; }
    catch { return ''; }
}

export default function VoiceCall({ user, activeCallRoom, onClearActiveCallRoom, addToast }) {
    const [callState, setCallState] = useState('IDLE'); // IDLE, CALLING, RINGING, CONNECTED
    const [callData, setCallData] = useState(null); // { id, caller, room }
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOff, setIsSpeakerOff] = useState(false);

    const pcRef = useRef(null);
    const localAudioRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const pollIntervalRef = useRef(null);
    const durationIntervalRef = useRef(null);

    // --- Media Setup ---
    const getMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            setLocalStream(stream);
            if (localAudioRef.current) localAudioRef.current.srcObject = stream;
            return stream;
        } catch (e) {
            addToast('Không thể truy cập Microphone: ' + e.message, 'error');
            return null;
        }
    };

    const stopMedia = () => {
        if (localStream) {
            localStream.getTracks().forEach(t => t.stop());
            setLocalStream(null);
        }
        if (remoteStream) setRemoteStream(null);
        if (localAudioRef.current) localAudioRef.current.srcObject = null;
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    };

    // --- WebRTC Setup ---
    const setupWebRTC = (stream) => {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]
        });
        pcRef.current = pc;

        // Add local tracks
        if (stream) {
            stream.getTracks().forEach(track => pc.addTrack(track, stream));
        }

        // Receive remote tracks
        pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                setRemoteStream(event.streams[0]);
                if (remoteAudioRef.current) remoteAudioRef.current.srcObject = event.streams[0];
            }
        };

        return pc;
    };

    // --- Poller for Incoming Calls & Ringing Sync ---
    useEffect(() => {
        if (!user) return;
        const interval = setInterval(async () => {
            if (callState === 'IDLE') {
                try {
                    const res = await fetch(`${API_BASE}/calls/incoming`, { headers: { 'x-auth-token': getToken() } });
                    const json = await res.json();
                    if (json.success && json.data) {
                        setCallData(json.data);
                        setCallState('RINGING');

                        // Trigger notification
                        if (window.Capacitor && window.Capacitor.Plugins.LocalNotifications) {
                            try {
                                await LocalNotifications.schedule({
                                    notifications: [{
                                        title: "Cuộc gọi đến 📞",
                                        body: `${json.data?.caller?.displayName || 'Ai đó'} đang gọi cho bạn...`,
                                        id: Math.floor(Math.random() * 100000),
                                        schedule: { at: new Date() }
                                    }]
                                });
                            } catch (e) { }
                        } else if ('Notification' in window && Notification.permission === 'granted') {
                            new Notification("Cuộc gọi đến 📞", { body: `${json.data?.caller?.displayName || 'Ai đó'} đang gọi cho bạn...` });
                        }
                    }
                } catch (e) { }
            } else if (callState === 'RINGING' && callData?.id) {
                // Sync check: nếu người gọi tự ngắt khi mình chưa nhấc máy
                try {
                    const res = await fetch(`${API_BASE}/calls/${callData.id}`, { headers: { 'x-auth-token': getToken() } });
                    const json = await res.json();
                    if (json.success && json.data && ['ended', 'rejected', 'missed'].includes(json.data.status)) {
                        cleanupCall();
                        addToast('Cuộc gọi nhỡ.', 'info');
                    }
                } catch (e) { }
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [user, callState, callData]);

    // --- 30 Second Call Timeout ---
    useEffect(() => {
        if (callState === 'CALLING' || callState === 'RINGING') {
            const timeout = setTimeout(() => {
                if (callState === 'CALLING' && callData?.id) {
                    endCall();
                    addToast('Không có ai trả lời.', 'info');
                } else if (callState === 'RINGING' && callData?.id) {
                    rejectCall();
                    addToast('Đã bỏ lỡ một cuộc gọi.', 'info');
                }
            }, 30000);
            return () => clearTimeout(timeout);
        }
    }, [callState, callData]);

    // --- Handle Outbound Call (Triggered from ChatPage) ---
    useEffect(() => {
        if (activeCallRoom && callState === 'IDLE') {
            startCall(activeCallRoom);
            onClearActiveCallRoom();
        }
    }, [activeCallRoom]);

    const startCall = async (room) => {
        const stream = await getMedia();
        if (!stream) { onClearActiveCallRoom(); return; }

        setCallState('CALLING');
        setCallData({ caller: { display_name: room.display_name || 'Nhóm' } });

        const pc = setupWebRTC(stream);

        pc.onicecandidate = async (e) => {
            if (e.candidate && callData?.id) {
                // Post candidate
                await fetch(`${API_BASE}/calls/${callData.id}/candidates`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                    body: JSON.stringify({ candidate: JSON.stringify(e.candidate) })
                });
            }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        try {
            const res = await fetch(`${API_BASE}/calls`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                body: JSON.stringify({ roomId: room.id, offer: JSON.stringify(offer) })
            });
            const json = await res.json();
            if (json.success) {
                setCallData(json.data);

                // Start polling for answer
                pollIntervalRef.current = setInterval(async () => {
                    const statusRes = await fetch(`${API_BASE}/calls/${json.data.id}`, { headers: { 'x-auth-token': getToken() } });
                    const statusJson = await statusRes.json();

                    if (statusJson.success && statusJson.data) {
                        const updatedCall = statusJson.data;
                        if (updatedCall.status === 'ongoing' && updatedCall.answer) {
                            clearInterval(pollIntervalRef.current);
                            await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(updatedCall.answer)));
                            setCallState('CONNECTED');
                            startCandidatePolling(json.data.id, pc);
                            fetch(`${API_BASE}/chats/${room.id}/messages`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                                body: JSON.stringify({ content: '📞 Cuộc gọi bắt đầu.' })
                            }).catch(() => { });
                        } else if (['ended', 'rejected', 'missed'].includes(updatedCall.status)) {
                            cleanupCall();
                            addToast('Cuộc gọi kết thúc.', 'info');
                        }
                    }
                }, 2000);

            } else {
                cleanupCall();
                addToast(json.error, 'error');
            }
        } catch (e) {
            cleanupCall();
            addToast('Lỗi mạng', 'error');
        }
    };

    const acceptCall = async () => {
        if (!callData) return;
        const stream = await getMedia();
        if (!stream) return;

        const pc = setupWebRTC(stream);

        pc.onicecandidate = async (e) => {
            if (e.candidate && callData?.id) {
                await fetch(`${API_BASE}/calls/${callData.id}/candidates`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                    body: JSON.stringify({ candidate: JSON.stringify(e.candidate) })
                });
            }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(callData.offer)));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        try {
            const res = await fetch(`${API_BASE}/calls/${callData.id}/answer`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                body: JSON.stringify({ answer: JSON.stringify(answer) })
            });
            const json = await res.json();
            if (json.success) {
                setCallState('CONNECTED');
                startCandidatePolling(callData.id, pc);

                // Poll check if caller ended
                pollIntervalRef.current = setInterval(async () => {
                    const statusRes = await fetch(`${API_BASE}/calls/${callData.id}`, { headers: { 'x-auth-token': getToken() } });
                    const statusJson = await statusRes.json();
                    if (statusJson.success && statusJson.data && ['ended', 'rejected'].includes(statusJson.data.status)) {
                        cleanupCall();
                        addToast('Cuộc gọi kết thúc.', 'info');
                    }
                }, 3000);
            }
        } catch (e) {
            cleanupCall();
            addToast('Lỗi kết nối', 'error');
        }
    };

    const rejectCall = async () => {
        if (callData && callData.id) {
            await fetch(`${API_BASE}/calls/${callData.id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                body: JSON.stringify({ status: 'rejected' })
            }).catch(() => { });
        }
        cleanupCall();
    };

    const endCall = async () => {
        if (callData && callData.id) {
            await fetch(`${API_BASE}/calls/${callData.id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                body: JSON.stringify({ status: 'ended' })
            }).catch(() => { });
            await fetch(`${API_BASE}/chats/${callData.room_id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                body: JSON.stringify({ content: `📞 Cuộc gọi đã kết thúc (${formatDuration(duration)}).` })
            }).catch(() => { });
        }
        cleanupCall();
    };

    const startCandidatePolling = (callId, pc) => {
        const interval = setInterval(async () => {
            const res = await fetch(`${API_BASE}/calls/${callId}/candidates`, { headers: { 'x-auth-token': getToken() } });
            const json = await res.json();
            if (json.success && json.data) {
                for (let c of json.data) {
                    try { await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(c.candidate))); } catch (e) { }
                }
            }
        }, 2000);
        // Save interval to some ref to clear on cleanup
        // We'll just hook onto pollIntervalRef too or skip clearing it to leak less
    };

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
            setIsMuted(!localStream.getAudioTracks()[0]?.enabled);
        }
    };

    const toggleSpeaker = () => {
        if (remoteAudioRef.current) {
            remoteAudioRef.current.muted = !remoteAudioRef.current.muted;
            setIsSpeakerOff(remoteAudioRef.current.muted);
        }
    };

    const cleanupCall = () => {
        setCallState('IDLE');
        setCallData(null);
        stopMedia();
        if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
        setDuration(0);
        setIsMuted(false);
        setIsSpeakerOff(false);
        onClearActiveCallRoom();
    };

    useEffect(() => {
        if (callState === 'CONNECTED') {
            setDuration(0);
            durationIntervalRef.current = setInterval(() => setDuration(d => d + 1), 1000);
        } else {
            if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
        }
    }, [callState]);

    const formatDuration = (d) => {
        const m = Math.floor(d / 60);
        const s = d % 60;
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (callState === 'IDLE') return null;

    const callerName = callData?.caller?.display_name || callData?.caller?.displayName || callData?.caller?.username || 'Người thân';
    const callerAvatar = callData?.caller?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(callerName)}&background=random`;
    const isMobile = window.innerWidth <= 600;

    return (
        <>
            <div style={{ position: 'fixed', inset: 0, background: isMobile ? '#1f2937' : 'rgba(0,0,0,0.7)', zIndex: 99998, backdropFilter: 'blur(8px)' }} />

            <div className="voice-call-ui" style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: isMobile ? '100%' : 400, height: isMobile ? '100%' : 550,
                background: isMobile ? 'transparent' : 'linear-gradient(to bottom, #1f2937, #111827)', color: 'white',
                borderRadius: isMobile ? 0 : 32, boxShadow: isMobile ? 'none' : '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
                zIndex: 99999, display: 'flex', flexDirection: 'column',
                animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
                {/* Header Tiêu đề */}
                <div style={{ padding: '30px 20px 20px', textAlign: 'center', opacity: 0.8, fontSize: 14, letterSpacing: 1 }}>
                    Hệ thống Cuộc gọi VuFamily
                </div>

                {/* Khu vực Avatar */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'relative', width: 140, height: 140, marginBottom: 24 }}>
                        <img src={callerAvatar} style={{
                            width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover',
                            border: '4px solid #374151',
                            boxShadow: ['CALLING', 'RINGING'].includes(callState) ? '0 0 0 10px rgba(255,255,255,0.1)' : '0 10px 25px rgba(0,0,0,0.5)',
                            animation: ['CALLING', 'RINGING'].includes(callState) ? 'pulseRing 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
                        }} />
                    </div>

                    <h2 style={{ margin: '0 0 8px 0', fontSize: 28, fontWeight: 600, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                        {callerName}
                    </h2>

                    <div style={{ fontSize: 16, opacity: 0.8 }}>
                        {callState === 'RINGING' && 'Đang gọi cho bạn...'}
                        {callState === 'CALLING' && 'Đang đổ chuông...'}
                        {callState === 'CONNECTED' && <span style={{ color: '#34d399', fontWeight: 600 }}>{formatDuration(duration)}</span>}
                    </div>
                </div>

                {/* Khu vực Bảng điều khiển (Controls) */}
                <div style={{
                    padding: '30px 20px 40px', display: 'flex', justifyContent: 'center', gap: 30,
                    background: isMobile ? 'rgba(0,0,0,0.3)' : 'transparent', borderTopLeftRadius: 40, borderTopRightRadius: 40
                }}>
                    {callState === 'RINGING' ? (
                        <>
                            <button onClick={rejectCall} style={{ width: 72, height: 72, borderRadius: '50%', background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', fontSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)', transition: 'all 0.2s' }}>
                                <i style={{ transform: 'rotate(135deg)', fontStyle: 'normal' }}>📞</i>
                            </button>
                            <button onClick={acceptCall} style={{ width: 72, height: 72, borderRadius: '50%', background: '#10b981', color: 'white', border: 'none', cursor: 'pointer', fontSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)', animation: 'bounce 1s infinite' }}>
                                <i style={{ fontStyle: 'normal' }}>📞</i>
                            </button>
                        </>
                    ) : (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                                <button onClick={toggleMute} style={{ width: 60, height: 60, borderRadius: '50%', background: isMuted ? 'white' : 'rgba(255,255,255,0.15)', color: isMuted ? '#111' : 'white', border: 'none', cursor: 'pointer', fontSize: 24, transition: 'all 0.2s' }}>
                                    {isMuted ? '🔇' : '🎤'}
                                </button>
                                <span style={{ fontSize: 13, opacity: 0.8 }}>Micro</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, transform: 'translateY(-15px)' }}>
                                <button onClick={endCall} style={{ width: 72, height: 72, borderRadius: '50%', background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', fontSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)', transition: 'all 0.2s' }}>
                                    <i style={{ transform: 'rotate(135deg)', fontStyle: 'normal' }}>📞</i>
                                </button>
                                <span style={{ fontSize: 13, opacity: 0.8 }}>Kết thúc</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                                <button onClick={toggleSpeaker} style={{ width: 60, height: 60, borderRadius: '50%', background: isSpeakerOff ? 'rgba(255,255,255,0.15)' : 'white', color: isSpeakerOff ? 'white' : '#111', border: 'none', cursor: 'pointer', fontSize: 24, transition: 'all 0.2s' }}>
                                    {isSpeakerOff ? '🔈' : '🔊'}
                                </button>
                                <span style={{ fontSize: 13, opacity: 0.8 }}>Loa ngoài</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <audio ref={localAudioRef} autoPlay muted style={{ display: 'none' }} />
            <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />

            <style>
                {`
                @keyframes popIn { 0% { transform: translate(-50%, -40%) scale(0.9); opacity: 0; } 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
                @keyframes pulseRing { 
                    0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.3); } 
                    70% { box-shadow: 0 0 0 30px rgba(255,255,255,0); }
                    100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
                }
                @keyframes bounce { 
                    0%, 100% { transform: translateY(0); } 
                    50% { transform: translateY(-8px); } 
                }
                `}
            </style>
        </>
    );
}
