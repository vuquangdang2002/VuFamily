import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { HUB_URL } from '../../config';
import './VoiceCall.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getToken = () => { try { return JSON.parse(localStorage.getItem('vuFamilyAuth') || '{}').token || ''; } catch { return ''; } };
const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

const AUDIO_CONSTRAINTS = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    googEchoCancellation: true,
    googNoiseSuppression: true,
    googHighpassFilter: true
};

const VIDEO_CONSTRAINTS = {
    width: { ideal: 1280 }, height: { ideal: 720 },
    frameRate: { ideal: 30 }, facingMode: 'user',
};

/** Tăng bitrate trong SDP */
function applyHighBitrate(sdp) {
    return sdp
        .replace(/a=fmtp:111 /g, 'a=fmtp:111 maxaveragebitrate=128000;stereo=1;useinbandfec=1;')
        .replace(/(m=video.*\r\n)/g, '$1b=AS:4000\r\n');
}

// ─── Network Quality ──────────────────────────────────────────────────────────
// { level: 'good'|'medium'|'poor'|'unknown', rtt: number, loss: number }
function classifyQuality(rttMs, lossPercent) {
    if (rttMs === null) return { level: 'unknown', rtt: null, loss: null };
    if (rttMs <= 100 && lossPercent <= 2)  return { level: 'good',    rtt: rttMs, loss: lossPercent };
    if (rttMs <= 250 && lossPercent <= 8)  return { level: 'medium',  rtt: rttMs, loss: lossPercent };
    return                                        { level: 'poor',    rtt: rttMs, loss: lossPercent };
}

/** Đo RTT + packet loss từ RTCPeerConnection.getStats() */
async function measurePeerQuality(pc) {
    if (!pc || pc.connectionState === 'closed') return { level: 'unknown', rtt: null, loss: null };
    try {
        const stats = await pc.getStats();
        let rtt = null;
        let sent = 0, lost = 0;
        stats.forEach(s => {
            // candidatePair cho RTT
            if (s.type === 'candidate-pair' && s.state === 'succeeded' && s.currentRoundTripTime != null) {
                rtt = Math.round(s.currentRoundTripTime * 1000); // seconds → ms
            }
            // outbound-rtp cho packet loss
            if (s.type === 'outbound-rtp') {
                sent += s.packetsSent || 0;
            }
            if (s.type === 'remote-inbound-rtp') {
                lost += s.packetsLost || 0;
                if (s.roundTripTime != null && rtt === null) {
                    rtt = Math.round(s.roundTripTime * 1000);
                }
            }
        });
        const lossPercent = sent > 0 ? Math.round((lost / (sent + lost)) * 100) : 0;
        return classifyQuality(rtt, lossPercent);
    } catch {
        return { level: 'unknown', rtt: null, loss: null };
    }
}

// ─── SignalBars component ─────────────────────────────────────────────────────
const QUALITY_META = {
    good:    { bars: 3, color: '#10b981', label: 'Tốt' },
    medium:  { bars: 2, color: '#f59e0b', label: 'TB' },
    poor:    { bars: 1, color: '#ef4444', label: 'Yếu' },
    unknown: { bars: 0, color: '#64748b', label: '?' },
};

function SignalBars({ quality }) {
    const meta = QUALITY_META[quality?.level || 'unknown'];
    return (
        <div title={quality?.rtt != null ? `RTT: ${quality.rtt}ms · Loss: ${quality.loss}%` : 'Đang đo...'}
             style={{ display: 'flex', alignItems: 'flex-end', gap: 2, cursor: 'default' }}>
            {[1, 2, 3].map(i => (
                <div key={i} style={{
                    width: 4,
                    height: 4 + i * 4,
                    borderRadius: 2,
                    background: i <= meta.bars ? meta.color : 'rgba(255,255,255,0.2)',
                    transition: 'background 0.4s',
                }} />
            ))}
            <span style={{ fontSize: 10, color: meta.color, marginLeft: 3, lineHeight: 1 }}>
                {quality?.rtt != null ? `${quality.rtt}ms` : meta.label}
            </span>
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function useAudioLevel(stream) {
    const [isTalking, setIsTalking] = useState(false);
    useEffect(() => {
        if (!stream || !stream.getAudioTracks().some(t => t.enabled)) return;
        let audioCtx, analyser, source, rafId;
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const checkLevel = () => {
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                const avg = sum / dataArray.length;
                setIsTalking(avg > 10); // Ngưỡng âm lượng phát hiện giọng nói
                rafId = requestAnimationFrame(checkLevel);
            };
            checkLevel();
        } catch (e) {
            console.error('Lỗi đo âm lượng (AudioContext):', e);
        }
        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            if (source) source.disconnect();
            if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
        };
    }, [stream]);
    return isTalking;
}

function VideoCell({ stream, muted = false, label, isLocal = false, noVideo = false, quality }) {
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

    const isTalking = useAudioLevel(stream);
    const showVideo = !noVideo && (isLocal ? true : hasVideo);

    return (
        <div className="vc-cell" style={{ boxShadow: isTalking ? '0 0 0 3px #10b981' : 'none', transition: 'box-shadow 0.2s' }}>
            {/* LUÔN RENDER thẻ video/audio để phát tiếng. Nếu ẩn UI, dùng opacity thay vì display:none để không bị trình duyệt tối ưu hóa ngắt tiếng */}
            <video 
                ref={ref} 
                autoPlay 
                playsInline 
                muted={isLocal || muted} 
                className="vc-video" 
                style={showVideo ? {} : { opacity: 0, position: 'absolute', width: 1, height: 1, pointerEvents: 'none' }} 
            />
            
            {!showVideo && (
                <div className="vc-no-video">
                    <div style={{
                        fontSize: 40,
                        transform: isTalking ? 'scale(1.2)' : 'scale(1)',
                        transition: 'transform 0.1s ease-out'
                    }}>
                        {isLocal ? '🎤' : '🔊'}
                    </div>
                    <small>{isLocal ? 'Micro của bạn' : 'Đang nghe...'}</small>
                </div>
            )}
            <div className="vc-cell-footer">
                <span className="vc-cell-label" style={{position:'static',background:'none',padding:0}}>{label}</span>
                {quality && <SignalBars quality={quality} />}
            </div>
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
    const [speakerMode, setSpeakerMode] = useState('speaker'); // 'speaker' | 'earpiece'
    // { [userId]: { level, rtt, loss } }
    const [netQuality, setNetQuality] = useState({});
    const [hubConnected, setHubConnected] = useState(false);

    const socketRef = useRef(null);
    const pcsRef = useRef({});               // { userId: RTCPeerConnection }
    const rawStreamRef = useRef(null);       // MediaStream gốc từ mic
    const localRef = useRef(null);           // MediaStream đã qua xử lý lọc ồn
    const audioCtxRef = useRef(null);        // Web Audio Context
    const filterNodeRef = useRef(null);      // BiquadFilter (lọc tiếng gió, ồn xe)
    const phaseRef = useRef('IDLE');
    const metaRef = useRef(null);
    const processedRef = useRef(new Set());
    const queueRef = useRef({});             // ICE candidate queue before remote desc
    const timerRef = useRef(null);
    const qualityTimerRef = useRef(null);    // Network quality polling
    const cleanupRef = useRef(null);         // Giữ ref tới hàm cleanup để gọi từ bên trong event handler
    const incomingSignalsRef = useRef([]);   // Hàng đợi tín hiệu chờ khi đang RINGING

    const [noiseLevel, setNoiseLevel] = useState(0); // 0 -> 100

    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { metaRef.current = callMeta; }, [callMeta]);

    // Khi người dùng kéo thanh trượt, điều chỉnh dải tần số bị cắt bỏ (Highpass)
    // 0% = Cắt 0Hz (Không lọc). 100% = Cắt 1000Hz (Lọc cực mạnh, giọng mỏng đi nhưng sạch tiếng gió)
    useEffect(() => {
        if (filterNodeRef.current) {
            filterNodeRef.current.frequency.value = noiseLevel * 10;
        }
    }, [noiseLevel]);

    // ── Socket.io connection ─────────────────────────────────────────────────
    useEffect(() => {
        if (!user?.token) return;
        const socket = io(HUB_URL, {
            path: '/hub',
            auth: { token: getToken() },
            transports: ['websocket', 'polling'],
            upgrade: true,
            rememberUpgrade: true,
            reconnectionDelay: 2000,
            reconnectionDelayMax: 10000,
            reconnectionAttempts: 3,   // Chỉ thử 3 lần — sau đó dừng, không spam
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setHubConnected(true);
            console.log(`[VoiceCall] ✅ Hub connected (${socket.io.engine.transport.name})`);
        });

        socket.on('disconnect', () => setHubConnected(false));

        socket.on('connect_error', (err) => {
            console.warn('[VoiceCall] Hub connect error:', err.message);
        });

        socket.on('reconnect_failed', () => {
            // Im lặng sau khi thử hết — không spam thêm
            console.warn('[VoiceCall] Hub offline. Tính năng gọi điện sẽ không hoạt động.');
            addToast?.('⚠️ Không kết nối được Hub — tính năng gọi điện tạm thời không khả dụng', 'warning');
        });

        socket.on('call:incoming', (data) => {
            console.log('[VoiceCall] RECEIVED call:incoming', data, 'Current phase:', phaseRef.current);
            if (phaseRef.current !== 'IDLE') {
                console.log('[VoiceCall] Ignored call:incoming because phase is not IDLE');
                return;
            }
            setCallMeta(data);
            setPhase('RINGING');
        });

        socket.on('call:accepted', ({ callId, by }) => {
            setPhase(p => p === 'CALLING' ? 'CONNECTED' : p);
        });

        socket.on('call:rejected', () => { cleanup(); addToast('Cuộc gọi bị từ chối.', 'info'); });
        socket.on('call:ended', () => { if (phaseRef.current !== 'IDLE') { cleanup(); addToast('Cuộc gọi kết thúc.', 'info'); } });

        socket.on('call:signal', async ({ fromUserId, signal }) => {
            if (phaseRef.current === 'RINGING') {
                incomingSignalsRef.current.push({ fromUserId, signal });
                return;
            }
            await handleSignal(String(fromUserId), signal);
        });

        // Đã xử lý connect_error ở trên, không duplicate

        return () => socket.disconnect();
    }, [user?.token]);

    // ── Media ─────────────────────────────────────────────────────────────────
    const getMedia = useCallback(async (type = 'voice') => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: AUDIO_CONSTRAINTS,
                video: type === 'video' ? VIDEO_CONSTRAINTS : false,
            });

            // --- LỌC TẠP ÂM ĐỘNG BẰNG WEB AUDIO API (DSP) ---
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            audioCtxRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);
            
            // 1. Highpass Filter: Cắt dải âm trầm (tiếng xe cộ, tiếng gió ù ù)
            const highpassFilter = audioCtx.createBiquadFilter();
            highpassFilter.type = 'highpass';
            highpassFilter.frequency.value = noiseLevel * 10; 
            filterNodeRef.current = highpassFilter;

            // 2. Dynamics Compressor: Cân bằng giọng nói (Giảm hú, chống chói tai khi nói to)
            const compressor = audioCtx.createDynamicsCompressor();
            compressor.threshold.value = -40;
            compressor.knee.value = 30;
            compressor.ratio.value = 10;
            compressor.attack.value = 0.005;
            compressor.release.value = 0.25;

            const destination = audioCtx.createMediaStreamDestination();
            
            source.connect(highpassFilter);
            highpassFilter.connect(compressor);
            compressor.connect(destination);

            // 3. Ghép Audio sạch với Video gốc
            const processedStream = new MediaStream([
                ...destination.stream.getAudioTracks(),
                ...stream.getVideoTracks()
            ]);
            
            rawStreamRef.current = stream; // Giữ lại luồng gốc để tắt phần cứng sau này
            
            localRef.current = processedStream;
            setLocalStream(processedStream);
            setCallType(type);
            setCamOff(type === 'voice');
            return processedStream;
        } catch (e) {
            addToast('Không truy cập được micro/camera: ' + e.message, 'error');
            return null;
        }
    }, [addToast, noiseLevel]);

    const stopMedia = useCallback(() => {
        rawStreamRef.current?.getTracks().forEach(t => t.stop());
        localRef.current?.getTracks().forEach(t => t.stop());
        rawStreamRef.current = null;
        localRef.current = null;
        setLocalStream(null);
        setRemoteStreams({});
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
            audioCtxRef.current.close().catch(() => {});
        }
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
                console.log(`[VoiceCall] Peer ${targetId} ngắt kết nối: ${pc.connectionState}`);
                setRemoteStreams(p => { const n = { ...p }; delete n[targetId]; return n; });
                pc.close();
                delete pcsRef.current[targetId];
                
                // Nếu không còn ai trong cuộc gọi (1-1), tự động kết thúc luôn
                if (Object.keys(pcsRef.current).length === 0) {
                    addToast('Người kia đã rời khỏi cuộc gọi.', 'info');
                    cleanupRef.current?.();
                }
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

    // ── Network quality polling (every 3s when CONNECTED) ────────────────
    useEffect(() => {
        if (phase !== 'CONNECTED') {
            clearInterval(qualityTimerRef.current);
            return;
        }
        const poll = async () => {
            const entries = Object.entries(pcsRef.current);
            if (entries.length === 0) return;
            const results = await Promise.all(
                entries.map(async ([uid, pc]) => [uid, await measurePeerQuality(pc)])
            );
            setNetQuality(Object.fromEntries(results));
        };
        poll(); // immediate first measure
        qualityTimerRef.current = setInterval(poll, 3000);
        return () => clearInterval(qualityTimerRef.current);
    }, [phase]);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    const cleanup = useCallback(() => {
        console.log('[VoiceCall] Thực hiện dọn dẹp (cleanup) và kết thúc cuộc gọi.');
        setPhase('IDLE'); setCallMeta(null);
        stopMedia();
        Object.values(pcsRef.current).forEach(pc => pc.close());
        pcsRef.current = {};
        processedRef.current.clear();
        queueRef.current = {};
        clearInterval(timerRef.current);
        clearInterval(qualityTimerRef.current);
        incomingSignalsRef.current = [];
        setDuration(0); setMuted(false); setCamOff(false); setSpeakerMode('speaker');
        setNetQuality({});
        onClearActiveCallRoom?.();
    }, [stopMedia, onClearActiveCallRoom]);

    // Gán ref để các hàm bất đồng bộ có thể gọi
    useEffect(() => { cleanupRef.current = cleanup; }, [cleanup]);

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
        
        // Xin quyền mic/cam
        const stream = await getMedia(type);
        if (!stream) {
            rejectCall();
            return;
        }

        socketRef.current?.emit('call:accept', { callId: meta.callId }, async (res) => {
            if (res?.success) {
                setPhase('CONNECTED');
                
                // Bây giờ mới xử lý các tín hiệu (Offer) bị kẹt lại trong lúc chuông reo
                // Lúc này getMedia đã xong => localRef.current ĐÃ CÓ audio track => addTrack thành công!
                for (const { fromUserId, signal } of incomingSignalsRef.current) {
                    await handleSignal(String(fromUserId), signal);
                }
                incomingSignalsRef.current = [];
            }
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

    const toggleSpeaker = async () => {
        const nextMode = speakerMode === 'speaker' ? 'earpiece' : 'speaker';
        
        // 1. Logic dành cho App Android/iOS (Capacitor/Cordova) sau này
        if (window.AudioToggle) {
            window.AudioToggle.setAudioMode(nextMode === 'speaker' ? window.AudioToggle.SPEAKER : window.AudioToggle.EARPIECE);
            setSpeakerMode(nextMode);
            return;
        }

        // 2. Logic dành cho Web (Chrome)
        if (!navigator.mediaDevices?.enumerateDevices) {
            addToast('Trình duyệt không hỗ trợ chuyển loa.', 'info');
            return;
        }

        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
            
            if (audioOutputs.length <= 1) {
                // Đa số trình duyệt Web (nhất là iOS Safari) không cho phép tự chọn loa đầu ra (API bị khóa)
                addToast('Trình duyệt Web hiện tại chỉ hỗ trợ 1 đầu ra mặc định.', 'warning');
                return;
            }
            
            // Nếu có nhiều ngõ ra, cập nhật state (cần tích hợp logic setSinkId vào VideoCell nếu muốn chạy thật trên Web)
            setSpeakerMode(nextMode);
            addToast(`Đã chuyển sang ${nextMode === 'speaker' ? 'Loa ngoài' : 'Loa trong'}`, 'success');
        } catch (e) {
            addToast('Lỗi khi chuyển loa: ' + e.message, 'error');
        }
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
                            <VideoCell key={uid} stream={remoteStreams[uid]}
                                label="Thành viên" quality={netQuality[uid]} />
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
                        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                                <Btn icon={muted ? '🔇' : '🎤'} label={muted ? 'Bật micro' : 'Tắt micro'} active={muted} onClick={toggleMute} />
                                {callType === 'video' && <Btn icon={camOff ? '📷' : '📹'} label={camOff ? 'Bật cam' : 'Tắt cam'} active={camOff} onClick={toggleCam} />}
                                <Btn icon="📞" label="Kết thúc" cls="reject rot135" onClick={endCall} />
                                <Btn icon={speakerMode === 'speaker' ? '🔊' : '🔉'} label={speakerMode === 'speaker' ? 'Loa ngoài' : 'Loa trong'} active={speakerMode === 'speaker'} onClick={toggleSpeaker} />
                            </div>
                            
                            {/* Thanh trượt lọc tiếng ồn DSP */}
                            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.5)', padding: '8px 16px', borderRadius: 20, margin: '0 auto', gap: 12 }}>
                                <span style={{ fontSize: 12, color: '#fff', whiteSpace: 'nowrap' }}>Lọc ồn: {noiseLevel}%</span>
                                <input type="range" min="0" max="100" value={noiseLevel} onChange={e => setNoiseLevel(Number(e.target.value))} style={{ width: 120, accentColor: '#10b981' }} />
                                <span style={{ fontSize: 16 }}>{noiseLevel > 50 ? '🏍️' : '🛋️'}</span>
                            </div>
                        </div>
                    )}
                </div>
                <HubDebug phase={phase} callMeta={callMeta} isConnected={hubConnected} />
            </div>
        </div>
    );
}

function HubDebug({ phase, callMeta, isConnected }) {
    if (!window.location.hostname.includes('dangvq')) return null;
    return (
        <div style={{ position: 'fixed', bottom: 10, left: 10, zIndex: 99999, background: 'rgba(0,0,0,0.8)', color: isConnected ? '#0f0' : '#f00', padding: '4px 8px', borderRadius: 4, fontSize: 10, pointerEvents: 'none' }}>
            Hub: {isConnected ? 'ON' : 'OFF'} | Phase: {phase} | Room: {callMeta?.roomId || 'none'}
        </div>
    );
}
