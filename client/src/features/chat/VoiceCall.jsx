import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../../shared/services/api';
import { LocalNotifications } from '@capacitor/local-notifications';

function getToken() {
    try { return JSON.parse(localStorage.getItem('vuFamilyAuth') || '{}').token || ''; }
    catch { return ''; }
}

export default function VoiceCall({ user, activeCallRoom, onClearActiveCallRoom, addToast }) {
    const [callState, setCallState] = useState('IDLE'); // IDLE, RINGING, CONNECTED
    const [callData, setCallData] = useState(null); // { id, caller, room }
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({}); // { [userId]: stream }
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOff, setIsSpeakerOff] = useState(false);

    const pcsRef = useRef({}); // { [userId]: RTCPeerConnection }
    const localAudioRef = useRef(null);
    const pollIntervalRef = useRef(null);
    const durationIntervalRef = useRef(null);
    const candidatePollRef = useRef(null);
    const processedSignalsRef = useRef(new Set());
    const processedCandidatesRef = useRef(new Set());

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
        setRemoteStreams({});
        if (localAudioRef.current) localAudioRef.current.srcObject = null;
    };

    // --- WebRTC Peer Creation ---
    const createPeer = (targetUserId, callId, stream) => {
        if (pcsRef.current[targetUserId]) return pcsRef.current[targetUserId];

        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]
        });

        if (stream) {
            stream.getTracks().forEach(track => pc.addTrack(track, stream));
        }

        pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                setRemoteStreams(prev => ({ ...prev, [targetUserId]: event.streams[0] }));
            }
        };

        pc.onicecandidate = async (e) => {
            if (e.candidate) {
                await fetch(`${API_BASE}/calls/${callId}/candidates`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                    body: JSON.stringify({ toUserId: targetUserId, candidate: JSON.stringify(e.candidate) })
                }).catch(() => { });
            }
        };

        pcsRef.current[targetUserId] = pc;
        return pc;
    };

    // --- Outbound Call (Triggered from ChatPage) ---
    useEffect(() => {
        if (activeCallRoom && callState === 'IDLE') {
            startCall(activeCallRoom);
            onClearActiveCallRoom();
        }
    }, [activeCallRoom]);

    const startCall = async (room) => {
        const stream = await getMedia();
        if (!stream) { onClearActiveCallRoom(); return; }

        setCallState('CONNECTED'); // Go straight to connected mentally
        setCallData({ room_id: room.id, caller: { display_name: room.display_name || 'Nhóm' }, isInitiator: true });

        try {
            // Initiate or join group call
            const res = await fetch(`${API_BASE}/calls`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                body: JSON.stringify({ roomId: room.id, offer: 'mesh' }) // Dummy offer for legacy calls table
            });
            const json = await res.json();
            if (json.success) {
                const newCallData = { ...json.data, id: json.data.id, room: room };
                setCallData(newCallData);

                // Immediately update status to ongoing if it's a group
                if (room.type === 'group') {
                    await fetch(`${API_BASE}/calls/${json.data.id}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                        body: JSON.stringify({ status: 'ongoing' })
                    }).catch(() => { });
                }

                // Send Offer to ALL members
                if (room.members) {
                    for (let member of room.members) {
                        if (member.id !== user.id) {
                            const pc = createPeer(member.id, json.data.id, stream);
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);
                            await fetch(`${API_BASE}/calls/${json.data.id}/signals`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                                body: JSON.stringify({ toUserId: member.id, type: 'offer', payload: JSON.stringify(offer) })
                            }).catch(() => { });
                        }
                    }
                }
                startMeshPolling(json.data.id, stream);
            } else {
                cleanupCall();
                addToast(json.error, 'error');
            }
        } catch (e) {
            cleanupCall();
            addToast('Lỗi mạng', 'error');
        }
    };

    // --- Poller for Incoming Calls ---
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
                    }
                } catch (e) { }
            } else if (callState === 'RINGING' && callData?.id) {
                try {
                    const res = await fetch(`${API_BASE}/calls/${callData.id}`, { headers: { 'x-auth-token': getToken() } });
                    const json = await res.json();
                    if (json.success && json.data && ['ended', 'rejected', 'missed'].includes(json.data.status)) {
                        cleanupCall();
                        addToast('Cuộc gọi kết thúc.', 'info');
                    }
                } catch (e) { }
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [user, callState, callData]);

    const acceptCall = async () => {
        if (!callData) return;
        const stream = await getMedia();
        if (!stream) return;

        setCallState('CONNECTED');
        startMeshPolling(callData.id, stream);

        // Tell server I am joining/ongoing (if it was calling)
        await fetch(`${API_BASE}/calls/${callData.id}/answer`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
            body: JSON.stringify({ answer: 'meshJoined' })
        }).catch(() => { });
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
            // Only the original caller ends the whole call room technically, but lets allow anyone to drop status
            if (callData.caller?.id === user.id || callData.caller_id === user.id) {
                await fetch(`${API_BASE}/calls/${callData.id}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                    body: JSON.stringify({ status: 'ended' })
                }).catch(() => { });
                await fetch(`${API_BASE}/chats/${callData.room_id}/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                    body: JSON.stringify({ content: \`📞 Cuộc gọi đã kết thúc (\${formatDuration(duration)}).\` })
                }).catch(() => { });
            }
        }
        cleanupCall();
    };

    // --- Multi-peer Signal & Candidate Poller ---
    const startMeshPolling = (callId, stream) => {
        pollIntervalRef.current = setInterval(async () => {
            try {
                // Poll for signals and candidates targeting me
                const res = await fetch(`${ API_BASE } / calls / ${ callId } / signals`, { headers: { 'x-auth-token': getToken() } });
                const json = await res.json();
                if (json.success && json.data) {
                    
                    // Process Signals (Offers / Answers)
                    for (let sig of json.data.signals) {
                        if (processedSignalsRef.current.has(sig.id)) continue;
                        processedSignalsRef.current.add(sig.id);

                        const targetUserId = sig.from_user_id;
                        const pc = createPeer(targetUserId, callId, stream);

                        if (sig.type === 'offer') {
                            await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(sig.payload)));
                            const answer = await pc.createAnswer();
                            await pc.setLocalDescription(answer);
                            
                            // Send Answer back
                            await fetch(`${ API_BASE } / calls / ${ callId } / signals`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'x-auth-token': getToken() },
                                body: JSON.stringify({ toUserId: targetUserId, type: 'answer', payload: JSON.stringify(answer) })
                            }).catch(()=>{});

                        } else if (sig.type === 'answer') {
                            await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(sig.payload)));
                        }
                    }

                    // Process ICE Candidates
                    for (let c of json.data.candidates) {
                        if (processedCandidatesRef.current.has(c.id)) continue;
                        processedCandidatesRef.current.add(c.id);

                        const targetUserId = c.sender_id;
                        const pc = pcsRef.current[targetUserId];
                        if (pc) {
                            await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(c.candidate))).catch(()=>{});
                        }
                    }

                }

                // Poll check if call was force ended by creator
                const statusRes = await fetch(`${ API_BASE } / calls / ${ callId }`, { headers: { 'x-auth-token': getToken() } });
                const statusJson = await statusRes.json();
                if (statusJson.success && statusJson.data && ['ended'].includes(statusJson.data.status)) {
                    cleanupCall();
                    addToast('Cuộc gọi kết thúc.', 'info');
                }

            } catch (e) { console.warn(e); }
        }, 2000);
    };

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
            setIsMuted(!localStream.getAudioTracks()[0]?.enabled);
        }
    };

    const cleanupCall = () => {
        setCallState('IDLE');
        setCallData(null);
        stopMedia();
        Object.values(pcsRef.current).forEach(pc => pc.close());
        pcsRef.current = {};
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
        processedSignalsRef.current.clear();
        processedCandidatesRef.current.clear();
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
        return \`\${m < 10 ? '0' : ''}\${m}:\${s < 10 ? '0' : ''}\${s}\`;
    };

    if (callState === 'IDLE') return null;

    const callerName = callData?.caller?.display_name || callData?.room?.display_name || 'Nhóm Trò Chuyện';

    // RENDER: Grid logic
    const activeRemoteKeys = Object.keys(remoteStreams);
    const totalParticipants = 1 + activeRemoteKeys.length; // Local + Remotes

    return (
        <React.Fragment>
            <div className={\`voice-call-wrapper \${callState}\`}>
                <div className="vc-ui">
                    <div className="vc-header">
                        Hệ thống Cuộc gọi VuFamily
                        <div style={{ color: '#34d399', fontSize: 16, marginTop: 4 }}>
                            {callState === 'CONNECTED' ? formatDuration(duration) : 'Đang kết nối...'}
                        </div>
                    </div>

                    {/* MESH GRID AREA */}
                    {callState === 'CONNECTED' ? (
                        <div className="vc-grid-area" style={{ flex: 1, padding: 16 }}>
                            <div className={\`vc-grid grid-\${Math.min(totalParticipants, 4)}\`} style={{ 
                                display: 'grid', 
                                gap: '12px', 
                                height: '100%',
                                gridTemplateColumns: totalParticipants === 1 ? '1fr' : (totalParticipants === 2 ? '1fr' : '1fr 1fr'),
                                gridTemplateRows: totalParticipants <= 2 ? '1fr' : '1fr 1fr'
                            }}>
                                {/* Local User */}
                                <div className="vc-grid-cell">
                                    <img src={user?.avatar || \`https://ui-avatars.com/api/?name=ME\`} />
                                    <div className="vc-cell-name">Bạn {isMuted ? '🔇' : ''}</div>
                                </div>
                                
                                {/* Remote Users */}
                                {activeRemoteKeys.map(uid => (
                                    <div key={uid} className="vc-grid-cell">
                                        <div className="pulse-anim-small" style={{ width: '100%', height: '100%', borderRadius: 16, border: '2px solid rgba(255,255,255,0.2)' }}>
                                            <img src={\`https://ui-avatars.com/api/?name=USER\`} />
                                        </div>
                                        <div className="vc-cell-name">Thành viên</div>
                                        <audio 
                                            ref={el => { if (el && remoteStreams[uid]) el.srcObject = remoteStreams[uid]; }} 
                                            autoPlay 
                                            muted={isSpeakerOff}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="vc-avatar-area">
                            <div className="vc-avatar-wrapper">
                                <img src={\`https://ui-avatars.com/api/?name=\${encodeURIComponent(callerName)}&background=random\`} className={['CALLING', 'RINGING'].includes(callState) ? 'pulse-anim' : ''} />
                            </div>
                            <h2 className="vc-title">{callerName}</h2>
                            <div className="vc-status">
                                {callState === 'RINGING' && 'Đang gọi cho bạn...'}
                            </div>
                        </div>
                    )}

                    {/* Controls Area */}
                    <div className="vc-controls">
                        {callState === 'RINGING' ? (
                            <>
                                <button onClick={rejectCall} className="vc-btn reject">
                                    <i style={{ transform: 'rotate(135deg)', fontStyle: 'normal' }}>📞</i>
                                </button>
                                <button onClick={acceptCall} className="vc-btn accept pulse-btn">
                                    <i style={{ fontStyle: 'normal' }}>📞</i>
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="vc-control-item">
                                    <button onClick={toggleMute} className={\`vc-btn small \${isMuted ? 'muted' : ''}\`}>
                                        {isMuted ? '🔇' : '🎤'}
                                    </button>
                                    <span>Micro</span>
                                </div>
                                <div className="vc-control-item">
                                    <button onClick={endCall} className="vc-btn reject drop-down">
                                        <i style={{ transform: 'rotate(135deg)', fontStyle: 'normal' }}>📞</i>
                                    </button>
                                    <span>Kết thúc</span>
                                </div>
                                <div className="vc-control-item">
                                    <button onClick={() => setIsSpeakerOff(!isSpeakerOff)} className={\`vc-btn small \${isSpeakerOff ? 'muted' : ''}\`}>
                                        {isSpeakerOff ? '🔈' : '🔊'}
                                    </button>
                                    <span>Loa ngoài</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <audio ref={localAudioRef} autoPlay muted style={{ display: 'none' }} />

                <style>{\`
                    .vc-ui {
                        position: fixed; z-index: 99999; display: flex; flex-direction: column;
                        background: linear-gradient(to bottom, #1f2937, #111827); color: white;
                        animation: vcPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    }
                    .vc-header { padding: 20px 20px 10px; text-align: center; font-weight: 500; font-size: 15px; }
                    
                    /* Grid Mode */
                    .vc-grid-cell {
                        position: relative; background: #374151; border-radius: 16px; display: flex; align-items: center; justify-content: center; overflow: hidden;
                    }
                    .vc-grid-cell img { width: 100%; height: 100%; object-fit: cover; opacity: 0.8; }
                    .vc-cell-name {
                        position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.6); padding: 4px 10px; border-radius: 12px; font-size: 13px; font-weight: 500;
                    }

                    .vc-avatar-area { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                    .vc-avatar-wrapper { position: relative; width: 140px; height: 140px; margin-bottom: 24px; }
                    .vc-avatar-wrapper > img { width: 100%; height: 100%; border-radius: 50%; border: 4px solid #374151; }
                    .vc-title { font-size: 26px; font-weight: 600; margin-bottom: 8px; }
                    .vc-status { opacity: 0.8; }
                    .vc-controls { padding: 20px 20px 40px; display: flex; justify-content: center; gap: 30px; background: rgba(0,0,0,0.2); border-radius: 30px 30px 0 0; }
                    .vc-control-item { display: flex; flex-direction: column; align-items: center; gap: 8px; font-size: 13px; opacity: 0.8; }
                    .vc-btn { border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
                    .vc-btn.reject { width: 72px; height: 72px; background: #ef4444; color: white; font-size: 32px; }
                    .vc-btn.accept { width: 72px; height: 72px; background: #10b981; color: white; font-size: 32px; }
                    .vc-btn.small { width: 60px; height: 60px; background: rgba(255,255,255,0.15); color: white; font-size: 24px; }
                    .vc-btn.small.muted { background: white; color: #111; }
                    
                    @media (min-width: 601px) {
                        .vc-ui { bottom: 30px; right: 30px; width: 380px; height: 600px; border-radius: 32px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
                        .voice-call-wrapper.RINGING .vc-ui { top: 50%; left: 50%; transform: translate(-50%, -50%); bottom: auto; right: auto; }
                    }
                    @media (max-width: 600px) {
                        .voice-call-wrapper::before { content: ""; position: fixed; inset: 0; background: #1f2937; z-index: 99998; }
                        .vc-ui { top: 0; left: 0; width: 100%; height: 100%; border-radius: 0; }
                    }
                    @keyframes vcPopIn { 0% { opacity: 0; transform: scale(0.9) translateY(20px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
                    @keyframes pulseRing { 0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.3); } 70% { box-shadow: 0 0 0 30px rgba(255,255,255,0); } 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); } }
                    .pulse-anim { animation: pulseRing 1.5s infinite; }
                    .pulse-anim-small { animation: pulseRing 1s infinite alternate; }
                \`}</style>
            </div>
        </React.Fragment>
    );
}
