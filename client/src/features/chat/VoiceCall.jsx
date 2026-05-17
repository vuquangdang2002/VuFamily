import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { APP_URL } from '../../config';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getToken = () => { try { return JSON.parse(localStorage.getItem('vuFamilyAuth') || '{}').token || ''; } catch { return ''; } };
const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

const AUDIO_CONSTRAINTS = {
    echoCancellation: { ideal: true },
    noiseSuppression: { ideal: true },
    autoGainControl: { ideal: true },
    sampleRate: { ideal: 48000 },
};

const VIDEO_CONSTRAINTS = {
    width: { ideal: 1280 }, height: { ideal: 720 },
    frameRate: { ideal: 30 }, facingMode: 'user',
};

/** Tăng bitrate trong SDP để chất lượng cao hơn */
function applyHighBitrate(sdp) {
    return sdp
        .replace(/a=fmtp:111 /g, 'a=fmtp:111 maxaveragebitrate=128000;stereo=1;useinbandfec=1;')
        .replace(/(m=video.*\r\n)/g, '$1b=AS:4000\r\n');
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function VideoCell({ stream, muted = false, label, isLocal = false, noVideo = false }) {
    const ref = useRef(null);
    const [hasVideo, setHasVideo] = useState(false);
    useEffect(() => {
        if (!ref.current || !stream) return;
        ref.current.srcObject = stream;
        if (!isLocal) ref.current.play().catch(() => {});
        const check = () => setHasVideo(stream.getVideoTracks().some(t => t.enabled));
        check();
        stream.addEventListener('addtrack', check);
        stream.addEventListener('removetrack', check);
        return () => { stream.removeEventListener('addtrack', check); stream.removeEventListener('removetrack', check); };
    }, [stream, isLocal]);

    return (
        <div className="vc-cell">
            {(!noVideo && (isLocal ? true : hasVideo))
                ? <video ref={ref} autoPlay playsInline muted={isLocal || muted} className="vc-video" />
                : <div className="vc-no-video"><div style={{fontSize:40}}>{isLocal ? '🎤' : '👤'}</div><small>{isLocal ? 'Audio only' : 'Chỉ nghe tiếng'}</small></div>
            }
            <span className="vc-cell-label">{label}</span>
        </div>
    );
}

function Btn({ icon, label, active, cls = '', onClick }) {
    return (
        <div className="vc-ctrl-item">
            <button className={`vc-btn ${active ? 'active' : ''} ${cls}`} onClick={onClick}>{icon}</button>
            <span>{label}</span>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VoiceCall({ user, activeCallRoom, onClearActiveCallRoom, addToast }) {
    const [phase, setPhase] = useState('IDLE'); // IDLE | RINGING | CALLING | CONNECTED
    const [callMeta, setCallMeta] = useState(null); // { callId, roomId, callType, caller, iceConfig }
    const [callType, setCallType] = useState('voice');
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({}); // { userId: MediaStream }
    const [duration, setDuration] = useState(0);
    const [muted, setMuted] = useState(false);
    const [camOff, setCamOff] = useState(false);
    const [spkOff, setSpkOff] = useState(false);

    const socketRef = useRef(null);
    const pcsRef = useRef({});               // { userId: RTCPeerConnection }
    const localRef = useRef(null);           // MediaStream ref (avoids stale closure)
    const phaseRef = useRef('IDLE');
    const metaRef = useRef(null);
    const processedRef = useRef(new Set());
    const queueRef = useRef({});             // ICE candidate queue before remote desc
    const timerRef = useRef(null);

    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { metaRef.current = callMeta; }, [callMeta]);

    // ── Socket.io connection ─────────────────────────────────────────────────
    useEffect(() => {
        if (!user?.token) return;
        const socket = io(APP_URL, {
            path: '/call-signal',
            auth: { token: getToken() },
            transports: ['websocket', 'polling'],
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });
        socketRef.current = socket;

        socket.on('call:incoming', (data) => {
            if (phaseRef.current !== 'IDLE') return;
            setCallMeta(data);
            setPhase('RINGING');
        });

        socket.on('call:accepted', ({ callId, by }) => {
            setPhase(p => p === 'CALLING' ? 'CONNECTED' : p);
        });

        socket.on('call:rejected', () => { cleanup(); addToast('Cuộc gọi bị từ chối.', 'info'); });
        socket.on('call:ended', () => { if (phaseRef.current !== 'IDLE') { cleanup(); addToast('Cuộc gọi kết thúc.', 'info'); } });

        socket.on('call:signal', async ({ fromUserId, signal }) => {
            await handleSignal(String(fromUserId), signal);
        });

        socket.on('connect_error', (e) => console.warn('[VoiceCall] Socket error:', e.message));

        return () => socket.disconnect();
    }, [user?.token]);

    // ── Media ─────────────────────────────────────────────────────────────────
    const getMedia = useCallback(async (type = 'voice') => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: AUDIO_CONSTRAINTS,
                video: type === 'video' ? VIDEO_CONSTRAINTS : false,
            });
            localRef.current = stream;
            setLocalStream(stream);
            setCallType(type);
            setCamOff(type === 'voice');
            return stream;
        } catch (e) {
            addToast('Không truy cập được micro/camera: ' + e.message, 'error');
            return null;
        }
    }, [addToast]);

    const stopMedia = useCallback(() => {
        localRef.current?.getTracks().forEach(t => t.stop());
        localRef.current = null;
        setLocalStream(null);
        setRemoteStreams({});
    }, []);

    // ── WebRTC Peer ───────────────────────────────────────────────────────────
    const createPeer = useCallback((targetId, iceConfig, stream) => {
        if (pcsRef.current[targetId]) return pcsRef.current[targetId];

        const pc = new RTCPeerConnection(iceConfig || { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });

        stream?.getTracks().forEach(t => pc.addTrack(t, stream));

        pc.ontrack = (ev) => {
            if (ev.streams?.[0]) setRemoteStreams(p => ({ ...p, [targetId]: ev.streams[0] }));
        };

        pc.onicecandidate = (ev) => {
            if (ev.candidate) {
                socketRef.current?.emit('call:signal', {
                    toUserId: targetId,
                    signal: { type: 'ice-candidate', candidate: ev.candidate },
                });
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') setPhase(p => p !== 'CONNECTED' ? 'CONNECTED' : p);
            if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
                setRemoteStreams(p => { const n = { ...p }; delete n[targetId]; return n; });
                pc.close();
                delete pcsRef.current[targetId];
            }
        };

        pcsRef.current[targetId] = pc;
        return pc;
    }, []);

    const handleSignal = useCallback(async (fromId, signal) => {
        const sigKey = `${fromId}-${signal.type}-${JSON.stringify(signal).slice(0,40)}`;
        if (processedRef.current.has(sigKey)) return;
        processedRef.current.add(sigKey);

        const meta = metaRef.current;
        const stream = localRef.current;
        const iceConfig = meta?.iceConfig;
        const pc = createPeer(fromId, iceConfig, stream);

        try {
            if (signal.type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(signal));
                for (const c of (queueRef.current[fromId] || [])) await pc.addIceCandidate(c).catch(() => {});
                delete queueRef.current[fromId];
                const answer = await pc.createAnswer();
                answer.sdp = applyHighBitrate(answer.sdp);
                await pc.setLocalDescription(answer);
                socketRef.current?.emit('call:signal', { toUserId: fromId, signal: answer });

            } else if (signal.type === 'answer') {
                await pc.setRemoteDescription(new RTCSessionDescription(signal));
                for (const c of (queueRef.current[fromId] || [])) await pc.addIceCandidate(c).catch(() => {});
                delete queueRef.current[fromId];

            } else if (signal.type === 'ice-candidate') {
                const cand = new RTCIceCandidate(signal.candidate);
                if (pc.remoteDescription) await pc.addIceCandidate(cand).catch(() => {});
                else { if (!queueRef.current[fromId]) queueRef.current[fromId] = []; queueRef.current[fromId].push(cand); }
            }
        } catch (e) { console.warn('[VoiceCall] handleSignal', signal.type, e.message); }
    }, [createPeer]);

    // ── Duration timer ────────────────────────────────────────────────────────
    useEffect(() => {
        if (phase === 'CONNECTED') {
            setDuration(0);
            timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
        } else clearInterval(timerRef.current);
        return () => clearInterval(timerRef.current);
    }, [phase]);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    const cleanup = useCallback(() => {
        setPhase('IDLE'); setCallMeta(null);
        stopMedia();
        Object.values(pcsRef.current).forEach(pc => pc.close());
        pcsRef.current = {};
        processedRef.current.clear();
        queueRef.current = {};
        clearInterval(timerRef.current);
        setDuration(0); setMuted(false); setCamOff(false); setSpkOff(false);
        onClearActiveCallRoom?.();
    }, [stopMedia, onClearActiveCallRoom]);

    // ── Outbound call (from ChatPage) ─────────────────────────────────────────
    useEffect(() => {
        if (!activeCallRoom || phaseRef.current !== 'IDLE') return;
        startCall(activeCallRoom);
        onClearActiveCallRoom?.();
    }, [activeCallRoom]);

    const startCall = async (room) => {
        const type = room.requestVideo ? 'video' : 'voice';
        const stream = await getMedia(type);
        if (!stream) return;

        setPhase('CALLING');
        setCallMeta({ roomId: room.id, room, caller: { displayName: room.display_name }, isInitiator: true });

        socketRef.current?.emit('call:start', { roomId: room.id, callType: type }, async (res) => {
            if (!res?.success) { cleanup(); addToast(res?.error || 'Lỗi bắt đầu cuộc gọi', 'error'); return; }
            const { call, iceConfig } = res;
            setCallMeta(p => ({ ...p, callId: call.id, iceConfig }));

            // Send offer to each member
            if (room.members) {
                for (const m of room.members) {
                    if (String(m.id) === String(user.id)) continue;
                    const pc = createPeer(String(m.id), iceConfig, stream);
                    const offer = await pc.createOffer();
                    offer.sdp = applyHighBitrate(offer.sdp);
                    await pc.setLocalDescription(offer);
                    socketRef.current?.emit('call:signal', { toUserId: m.id, signal: offer });
                }
            }
        });
    };

    const acceptCall = async () => {
        const meta = metaRef.current;
        const type = meta?.callType || 'voice';
        const stream = await getMedia(type);
        if (!stream) return;

        socketRef.current?.emit('call:accept', { callId: meta.callId }, (res) => {
            if (res?.success) setPhase('CONNECTED');
        });
    };

    const rejectCall = () => {
        const meta = metaRef.current;
        if (meta?.callId) socketRef.current?.emit('call:reject', { callId: meta.callId });
        cleanup();
    };

    const endCall = () => {
        const meta = metaRef.current;
        if (meta?.callId) {
            socketRef.current?.emit('call:end', { callId: meta.callId, roomId: meta.roomId || meta.room_id, duration });
        }
        cleanup();
    };

    const toggleMute = () => { localRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; }); setMuted(m => !m); };
    const toggleCam = () => {
        if (callType !== 'video') { addToast('Cuộc gọi thoại không có camera.', 'info'); return; }
        localRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
        setCamOff(c => !c);
    };

    // ─── Render ────────────────────────────────────────────────────────────────
    if (phase === 'IDLE') return null;

    const callerName = callMeta?.caller?.displayName || callMeta?.room?.display_name || 'Cuộc gọi';
    const remoteIds = Object.keys(remoteStreams);

    return (
        <div className="vc-overlay">
            <div className="vc-card">
                <div className="vc-head">
                    <span>{callType === 'video' ? '📹' : '📞'} VuFamily</span>
                    {phase === 'CONNECTED' && <span className="vc-timer">{fmt(duration)}</span>}
                </div>

                {phase === 'CONNECTED' ? (
                    <div className="vc-grid" style={{ gridTemplateColumns: remoteIds.length === 0 ? '1fr' : '1fr 1fr' }}>
                        <VideoCell stream={localStream} muted label={`Bạn${muted ? ' 🔇' : ''}`} isLocal noVideo={callType === 'voice' || camOff} />
                        {remoteIds.map(uid => (
                            <VideoCell key={uid} stream={remoteStreams[uid]} muted={spkOff} label="Thành viên" />
                        ))}
                    </div>
                ) : (
                    <div className="vc-avatar-area">
                        <div className={`vc-ring ${phase !== 'IDLE' ? 'pulse' : ''}`}>
                            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(callerName)}&background=334155&color=fff&size=120`} alt="" />
                        </div>
                        <h2 className="vc-name">{callerName}</h2>
                        <p className="vc-status">
                            {phase === 'RINGING' && 'Đang gọi cho bạn...'}
                            {phase === 'CALLING' && 'Đang đổ chuông...'}
                        </p>
                    </div>
                )}

                <div className="vc-controls">
                    {phase === 'RINGING' ? (
                        <>
                            <Btn icon="📵" label="Từ chối" cls="reject" onClick={rejectCall} />
                            <Btn icon="📞" label="Nghe" cls="accept pulse-btn" onClick={acceptCall} />
                        </>
                    ) : (
                        <>
                            <Btn icon={muted ? '🔇' : '🎤'} label={muted ? 'Bật micro' : 'Tắt micro'} active={muted} onClick={toggleMute} />
                            {callType === 'video' && <Btn icon={camOff ? '📷' : '📹'} label={camOff ? 'Bật cam' : 'Tắt cam'} active={camOff} onClick={toggleCam} />}
                            <Btn icon="📞" label="Kết thúc" cls="reject rot135" onClick={endCall} />
                            <Btn icon={spkOff ? '🔈' : '🔊'} label={spkOff ? 'Bật loa' : 'Tắt loa'} active={spkOff} onClick={() => setSpkOff(s => !s)} />
                        </>
                    )}
                </div>
            </div>
            <style>{CSS}</style>
        </div>
    );
}

const CSS = `
.vc-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);animation:vcFade .2s ease}
.vc-card{width:380px;max-width:96vw;background:linear-gradient(160deg,#1e293b,#0f172a);border-radius:24px;overflow:hidden;box-shadow:0 32px 64px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.06);display:flex;flex-direction:column;animation:vcSlide .3s cubic-bezier(.34,1.56,.64,1)}
.vc-head{padding:18px 20px 10px;display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:600;color:#94a3b8}
.vc-timer{color:#34d399;font-size:18px;font-variant-numeric:tabular-nums}
.vc-grid{display:grid;gap:8px;padding:8px;min-height:240px}
.vc-cell{position:relative;min-height:180px;background:#0f172a;border-radius:16px;overflow:hidden;display:flex;align-items:center;justify-content:center}
.vc-video{width:100%;height:100%;object-fit:cover}
.vc-no-video{display:flex;flex-direction:column;align-items:center;gap:8px;color:#94a3b8}
.vc-cell-label{position:absolute;bottom:10px;left:10px;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);padding:3px 10px;border-radius:12px;font-size:12px;color:#fff;z-index:2}
.vc-avatar-area{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px}
.vc-ring{width:120px;height:120px;border-radius:50%;border:3px solid #334155;margin-bottom:20px;overflow:hidden}
.vc-ring img{width:100%;height:100%;object-fit:cover}
.vc-ring.pulse{animation:ring 1.4s infinite}
.vc-name{font-size:22px;font-weight:700;color:#fff;margin:0 0 8px}
.vc-status{font-size:14px;color:#64748b;margin:0}
.vc-controls{padding:20px 16px 28px;display:flex;justify-content:center;gap:28px;background:rgba(15,23,42,.7);border-top:1px solid rgba(255,255,255,.05)}
.vc-ctrl-item{display:flex;flex-direction:column;align-items:center;gap:8px}
.vc-ctrl-item span{font-size:11px;color:#64748b}
.vc-btn{width:56px;height:56px;border-radius:50%;border:none;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.08);color:#fff;transition:transform .15s,background .15s}
.vc-btn:hover{transform:scale(1.08)}
.vc-btn.active{background:#fff;color:#0f172a}
.vc-btn.accept{background:#10b981;box-shadow:0 6px 20px rgba(16,185,129,.4)}
.vc-btn.reject{background:#e11d48;box-shadow:0 6px 20px rgba(225,29,72,.4)}
.vc-btn.rot135{transform:rotate(135deg)}
.vc-btn.rot135:hover{transform:rotate(135deg) scale(1.08)}
.vc-btn.pulse-btn{animation:ring 1.2s infinite}
@keyframes vcFade{from{opacity:0}to{opacity:1}}
@keyframes vcSlide{from{opacity:0;transform:translateY(20px) scale(.96)}to{opacity:1;transform:none}}
@keyframes ring{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.6)}50%{box-shadow:0 0 0 14px rgba(16,185,129,0)}}
@media(max-width:480px){.vc-card{width:100vw;height:100dvh;border-radius:0}}
`;
