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

    // --- Poller for Incoming Calls ---
    useEffect(() => {
        if (!user) return;
        const interval = setInterval(async () => {
            if (callState !== 'IDLE') return; // Don't block polling if busy, actually we should refuse other calls, but simplified:

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
        }, 3000);
        return () => clearInterval(interval);
    }, [user, callState]);

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
                                body: JSON.stringify({ content: '📞 Cuộc gọi bật đầu.' })
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

    return (
        <>
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99998, backdropFilter: 'blur(2px)' }} />
            <div className="voice-call-overlay" style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%', maxWidth: 350,
                background: 'var(--bg-secondary)', borderRadius: 24,
                boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px var(--border-subtle)',
                zIndex: 99999, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
                <div style={{ padding: 20, textAlign: 'center' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        {callData?.caller?.avatar ? <img src={callData.caller.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : '📞'}
                    </div>
                    <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>{callState === 'CALLING' ? 'Đang gọi...' : (callData?.caller?.display_name || callData?.caller?.username || 'Người lạ')}</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
                        {callState === 'RINGING' && 'Đang gọi cho bạn...'}
                        {callState === 'CALLING' && 'Chờ nhấc máy...'}
                        {callState === 'CONNECTED' && formatDuration(duration)}
                    </p>
                </div>

                {['CALLING', 'CONNECTED'].includes(callState) && (
                    <div style={{ display: 'flex', justifyContent: 'space-evenly', padding: '10px 0', borderTop: '1px solid var(--border-subtle)' }}>
                        <button title="Bật/tắt Micro" onClick={toggleMute} style={{ cursor: 'pointer', borderRadius: '50%', width: 44, height: 44, padding: 0, background: isMuted ? '#fecaca' : 'var(--bg-primary)', color: isMuted ? '#ef4444' : 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: 20 }}>
                            {isMuted ? '🔇' : '🎤'}
                        </button>
                        <button title="Bật/tắt Loa" onClick={toggleSpeaker} style={{ cursor: 'pointer', borderRadius: '50%', width: 44, height: 44, padding: 0, background: isSpeakerOff ? '#fecaca' : 'var(--bg-primary)', color: isSpeakerOff ? '#ef4444' : 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: 20 }}>
                            {isSpeakerOff ? '🔇' : '🔊'}
                        </button>
                    </div>
                )}

                <div style={{ display: 'flex', borderTop: '1px solid var(--border-subtle)' }}>
                    {callState === 'RINGING' ? (
                        <>
                            <button style={{ flex: 1, padding: 16, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }} onClick={rejectCall}>Từ chối</button>
                            <button style={{ flex: 1, padding: 16, background: '#10b981', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }} onClick={acceptCall}>Nghe máy</button>
                        </>
                    ) : (
                        <button style={{ flex: 1, padding: 16, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }} onClick={endCall}>Kết thúc</button>
                    )}
                </div>

                <audio ref={localAudioRef} autoPlay muted style={{ display: 'none' }} />
                <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />

                <style>
                    {`@keyframes popIn { 0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; } 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } }`}
                </style>
            </div>
        </>
    );
}
