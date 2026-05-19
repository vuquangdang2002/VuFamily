import React, { useState, useEffect, useRef, useCallback } from 'react';
import { myLog, myError } from '../../shared/utils/logger';
import { AuthHelper } from '../../shared/services/AuthHelper';
import { TrackingHelper } from '../../shared/services/TrackingHelper';
import { io } from 'socket.io-client';
import { HUB_URL } from '../../config';
import './VoiceCall.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

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
    frameRate: { ideal: 60 }, facingMode: { ideal: 'user' },
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
    if (rttMs <= 100 && lossPercent <= 2) return { level: 'good', rtt: rttMs, loss: lossPercent };
    if (rttMs <= 250 && lossPercent <= 8) return { level: 'medium', rtt: rttMs, loss: lossPercent };
    return { level: 'poor', rtt: rttMs, loss: lossPercent };
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
    good: { bars: 3, color: '#10b981', label: 'Tốt' },
    medium: { bars: 2, color: '#f59e0b', label: 'TB' },
    poor: { bars: 1, color: '#ef4444', label: 'Yếu' },
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
            myError('CALL', 'Audio volume measurement error (AudioContext):', e);
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
        if (!isLocal) ref.current.play().catch(() => { });
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
                <span className="vc-cell-label" style={{ position: 'static', background: 'none', padding: 0 }}>{label}</span>
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
    const gainNodeRef = useRef(null);        // Căn chỉnh độ nhạy mic
    const gateNodeRef = useRef(null);        // Đóng/mở âm thanh (Noise Gate)
    const gateRafRef = useRef(null);         // Request Animation Frame cho Gate
    const vuMeterRef = useRef(null);         // Ref trực tiếp đến thanh đo âm lượng (Discord style)
    const phaseRef = useRef('IDLE');
    const metaRef = useRef(null);
    const processedRef = useRef(new Set());
    const queueRef = useRef({});             // ICE candidate queue before remote desc
    const timerRef = useRef(null);
    const qualityTimerRef = useRef(null);    // Network quality polling
    const cleanupRef = useRef(null);         // Giữ ref tới hàm cleanup để gọi từ bên trong event handler
    const incomingSignalsRef = useRef([]);   // Hàng đợi tín hiệu chờ khi đang RINGING

    const [showSettings, setShowSettings] = useState(false); // Bật tắt bảng Cài đặt Âm thanh
    const [noiseLevel, setNoiseLevel] = useState(0); // 0 -> 100 (Lọc gió/ồn trầm)
    const [micSensitivity, setMicSensitivity] = useState(100); // 10 -> 200 (Độ nhạy Mic)
    const [noiseGate, setNoiseGate] = useState(10); // 0 -> 100 (Chặn tiếng vọng/ngưỡng mở Mic)
    const noiseGateRef = useRef(noiseGate);

    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { metaRef.current = callMeta; }, [callMeta]);
    useEffect(() => { noiseGateRef.current = noiseGate; }, [noiseGate]);

    // Điều chỉnh Bộ lọc tiếng gió (Highpass)
    useEffect(() => {
        if (filterNodeRef.current) {
            filterNodeRef.current.frequency.value = noiseLevel * 10;
        }
    }, [noiseLevel]);

    // Điều chỉnh Độ nhạy (Gain)
    useEffect(() => {
        if (gainNodeRef.current && audioCtxRef.current) {
            gainNodeRef.current.gain.setTargetAtTime(micSensitivity / 100, audioCtxRef.current.currentTime, 0.1);
        }
    }, [micSensitivity]);

    // ── Socket.io connection ─────────────────────────────────────────────────
    useEffect(() => {
        if (!user?.token) return;
        const socket = io(HUB_URL, {
            path: '/hub',
            auth: { token: AuthHelper.getToken() },
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
            myLog('CALL', `[VoiceCall] ✅ Hub connected (${socket.io.engine.transport.name})`);
        });

        socket.on('disconnect', () => setHubConnected(false));

        socket.on('connect_error', (err) => {
            myError('CALL', '[VoiceCall] Hub connect error:', err.message);
        });

        socket.on('reconnect_failed', () => {
            // Im lặng sau khi thử hết — không spam thêm
            myError('CALL', '[VoiceCall] Hub offline. Call feature will not work.');
            addToast?.('⚠️ Cannot connect to Hub — call feature is temporarily unavailable', 'warning');
        });

        socket.on('call:incoming', (data) => {
            myLog('CALL', '[VoiceCall] RECEIVED call:incoming', data, 'Current phase:', phaseRef.current);
            if (phaseRef.current !== 'IDLE') {
                myLog('CALL', '[VoiceCall] Ignored call:incoming because phase is not IDLE');
                return;
            }
            setCallMeta(data);
            setPhase('RINGING');
        });

        socket.on('call:accepted', ({ callId, by }) => {
            setPhase(p => p === 'CALLING' ? 'CONNECTED' : p);
        });

        socket.on('call:rejected', () => { cleanup(); addToast('Call was rejected.', 'info'); });
        socket.on('call:ended', () => { if (phaseRef.current !== 'IDLE') { cleanup(); addToast('Call ended.', 'info'); } });

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
        let stream;
        let finalType = type;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: AUDIO_CONSTRAINTS,
                video: finalType === 'video' ? VIDEO_CONSTRAINTS : false,
            });
        } catch (e) {
            if (finalType === 'video') {
                addToast('Cannot open camera. Switching to voice call...', 'warning');
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        audio: AUDIO_CONSTRAINTS,
                        video: false,
                    });
                    finalType = 'voice';
                } catch (err2) {
                    addToast('Cannot access microphone: ' + err2.message, 'error');
                    return null;
                }
            } else {
                addToast('Cannot access microphone: ' + e.message, 'error');
                return null;
            }
        }

        try {

            // --- LỌC TẠP ÂM ĐỘNG BẰNG WEB AUDIO API (DSP) ---
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            audioCtxRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);

            // 0. Độ nhạy Mic (GainNode)
            const gainNode = audioCtx.createGain();
            gainNode.gain.value = micSensitivity / 100;
            gainNodeRef.current = gainNode;

            // 1. Noise Gate (Chặn tiếng vọng/ngưỡng mở Mic)
            const gateNode = audioCtx.createGain();
            gateNode.gain.value = 1;
            gateNodeRef.current = gateNode;

            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const gateLoop = () => {
                if (!audioCtxRef.current) return;
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                const avg = sum / dataArray.length;

                const threshold = noiseGateRef.current;

                // --- DISCORD VU METER ---
                // Cập nhật DOM trực tiếp 60fps siêu mượt, không làm lag React
                if (vuMeterRef.current) {
                    const percent = Math.min(100, (avg / 128) * 100);
                    vuMeterRef.current.style.width = `${percent}%`;
                    vuMeterRef.current.style.backgroundColor = avg >= threshold ? '#10b981' : '#f59e0b'; // Xanh lá nếu Mic mở, Cam nếu Mic đóng
                }

                // Nếu âm thanh quá nhỏ (dưới ngưỡng) -> Bóp âm lượng về 0 (Mute) để chặn tiếng vọng từ loa
                if (avg < threshold) {
                    gateNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1); // Fade out mềm
                } else {
                    gateNode.gain.setTargetAtTime(1, audioCtx.currentTime, 0.05); // Fade in nhanh để bắt kịp giọng nói
                }
                gateRafRef.current = requestAnimationFrame(gateLoop);
            };
            gateLoop();

            // 2. Highpass Filter: Cắt dải âm trầm (tiếng xe cộ, tiếng gió ù ù)
            const highpassFilter = audioCtx.createBiquadFilter();
            highpassFilter.type = 'highpass';
            highpassFilter.frequency.value = noiseLevel * 10;
            filterNodeRef.current = highpassFilter;

            // 3. Dynamics Compressor: Cân bằng giọng nói (Giảm hú, chống chói tai khi nói to)
            const compressor = audioCtx.createDynamicsCompressor();
            compressor.threshold.value = -40;
            compressor.knee.value = 30;
            compressor.ratio.value = 10;
            compressor.attack.value = 0.005;
            compressor.release.value = 0.25;

            const destination = audioCtx.createMediaStreamDestination();

            // Kết nối chuỗi DSP: Mic -> Gain -> [Analyser & Gate] -> Highpass -> Compressor -> Output
            source.connect(gainNode);
            gainNode.connect(analyser); // Analyser đọc âm thanh trước khi qua Gate để biết khi nào mở Gate
            gainNode.connect(gateNode);
            gateNode.connect(highpassFilter);
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
            setCallType(finalType);
            setCamOff(finalType === 'voice');
            return processedStream;
        } catch (e) {
            addToast('Audio processing error: ' + e.message, 'error');
            return null;
        }
    }, [addToast, noiseLevel, micSensitivity]);

    const stopMedia = useCallback(() => {
        if (gateRafRef.current) cancelAnimationFrame(gateRafRef.current);
        rawStreamRef.current?.getTracks().forEach(t => t.stop());
        localRef.current?.getTracks().forEach(t => t.stop());
        rawStreamRef.current = null;
        localRef.current = null;
        setLocalStream(null);
        setRemoteStreams({});
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
            audioCtxRef.current.close().catch(() => { });
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
                myLog('CALL', `[VoiceCall] Peer ${targetId} disconnected: ${pc.connectionState}`);
                setRemoteStreams(p => { const n = { ...p }; delete n[targetId]; return n; });
                pc.close();
                delete pcsRef.current[targetId];

                // Nếu không còn ai trong cuộc gọi (1-1), tự động kết thúc luôn
                if (Object.keys(pcsRef.current).length === 0) {
                    addToast('The other party has left the call.', 'info');
                    cleanupRef.current?.();
                }
            }
        };

        pcsRef.current[targetId] = pc;
        return pc;
    }, []);

    const handleSignal = useCallback(async (fromId, signal) => {
        const sigKey = `${fromId}-${signal.type}-${JSON.stringify(signal).slice(0, 40)}`;
        if (processedRef.current.has(sigKey)) return;
        processedRef.current.add(sigKey);

        const meta = metaRef.current;
        const stream = localRef.current;
        const iceConfig = meta?.iceConfig;
        const pc = createPeer(fromId, iceConfig, stream);

        try {
            if (signal.type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(signal));
                for (const c of (queueRef.current[fromId] || [])) await pc.addIceCandidate(c).catch(() => { });
                delete queueRef.current[fromId];
                const answer = await pc.createAnswer();
                answer.sdp = applyHighBitrate(answer.sdp);
                await pc.setLocalDescription(answer);
                socketRef.current?.emit('call:signal', { toUserId: fromId, signal: answer });

            } else if (signal.type === 'answer') {
                await pc.setRemoteDescription(new RTCSessionDescription(signal));
                for (const c of (queueRef.current[fromId] || [])) await pc.addIceCandidate(c).catch(() => { });
                delete queueRef.current[fromId];

            } else if (signal.type === 'ice-candidate') {
                const cand = new RTCIceCandidate(signal.candidate);
                if (pc.remoteDescription) await pc.addIceCandidate(cand).catch(() => { });
                else { if (!queueRef.current[fromId]) queueRef.current[fromId] = []; queueRef.current[fromId].push(cand); }
            }
        } catch (e) { myError('CALL', '[VoiceCall] handleSignal', signal.type, e.message); }
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
        myLog('CALL', '[VoiceCall] Performing cleanup and ending call.');
        if (duration > 0) {
            TrackingHelper.trackEndVoiceCall(duration);
        }
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
        TrackingHelper.trackStartVoiceCall(room.type === 'group' || room.members?.length > 2 ? 'group' : '1-1');

        socketRef.current?.emit('call:start', { roomId: room.id, callType: type }, async (res) => {
            if (!res?.success) { cleanup(); addToast(res?.error || 'Error starting call', 'error'); return; }
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
        if (callType !== 'video') { addToast('Voice call does not have camera.', 'info'); return; }
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
            addToast('Browser does not support speaker switching.', 'info');
            return;
        }

        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioOutputs = devices.filter(d => d.kind === 'audiooutput');

            if (audioOutputs.length <= 1) {
                // Đa số trình duyệt Web (nhất là iOS Safari) không cho phép tự chọn loa đầu ra (API bị khóa)
                addToast('Current browser only supports default audio output.', 'warning');
                return;
            }

            // Nếu có nhiều ngõ ra, cập nhật state (cần tích hợp logic setSinkId vào VideoCell nếu muốn chạy thật trên Web)
            setSpeakerMode(nextMode);
            addToast(`Switched to ${nextMode === 'speaker' ? 'Speaker' : 'Earpiece'}`, 'success');
        } catch (e) {
            addToast('Error switching speaker: ' + e.message, 'error');
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
                    <span>{callType === 'video' || callMeta?.callType === 'video' ? '📹' : '📞'} VuFamily</span>
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
                            {phase === 'RINGING' && `Đang gọi ${callMeta?.callType === 'video' ? 'video ' : ''}cho bạn...`}
                            {phase === 'CALLING' && 'Đang đổ chuông...'}
                        </p>
                    </div>
                )}

                <div className="vc-controls">
                    {phase === 'RINGING' ? (
                        <>
                            <Btn icon="📵" label="Từ chối" cls="reject" onClick={rejectCall} />
                            <Btn icon={callMeta?.callType === 'video' ? '📹' : '📞'} label="Nghe" cls="accept pulse-btn" onClick={acceptCall} />
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, padding: '16px 0' }}>
                                <Btn icon={muted ? '🔇' : '🎤'} label={muted ? 'Bật micro' : 'Tắt micro'} active={muted} onClick={toggleMute} />
                                {callType === 'video' && <Btn icon={camOff ? '📷' : '📹'} label={camOff ? 'Bật cam' : 'Tắt cam'} active={camOff} onClick={toggleCam} />}
                                <Btn icon="📞" label="Kết thúc" cls="reject rot135" onClick={endCall} />
                                <Btn icon={speakerMode === 'speaker' ? '🔊' : '🔉'} label={speakerMode === 'speaker' ? 'Loa ngoài' : 'Loa trong'} active={speakerMode === 'speaker'} onClick={toggleSpeaker} />
                                <Btn icon="⚙️" label="Âm thanh" active={showSettings} onClick={() => setShowSettings(!showSettings)} />
                            </div>

                            {/* Bảng Cài đặt Âm thanh (Discord Style) */}
                            {showSettings && (
                                <div className="vc-dsp-panel">
                                    <div className="dsp-title">Cài đặt Âm thanh & Giọng nói</div>

                                    {/* Chặn tiếng vọng (Noise Gate) */}
                                    <div className="dsp-group">
                                        <label>Ngưỡng thu âm thanh (Noise Gate)</label>
                                        <div className="dsp-desc">Thanh màu nhảy vượt qua mốc trắng thì Mic mới mở. Hãy kéo mốc trắng lên cao hơn dải màu vàng lúc bạn ĐANG KHÔNG NÓI để chặn sạch tiếng ồn nền/tiếng vọng.</div>
                                        <div className="vu-meter-container">
                                            <div ref={vuMeterRef} className="vu-meter-fill" />
                                            <input type="range" min="0" max="100" value={noiseGate} onChange={e => setNoiseGate(Number(e.target.value))} className="dsp-slider gate-slider" />
                                        </div>
                                    </div>

                                    {/* Độ nhạy Mic */}
                                    <div className="dsp-group">
                                        <label>Khuếch đại Mic (Gain): {micSensitivity}%</label>
                                        <div className="dsp-desc">Tăng nếu bạn nói nhỏ hoặc điện thoại ở xa. Giảm nếu tiếng quá chói.</div>
                                        <input type="range" min="10" max="200" value={micSensitivity} onChange={e => setMicSensitivity(Number(e.target.value))} className="dsp-slider blue" />
                                    </div>

                                    {/* Lọc tiếng gió (Highpass) */}
                                    <div className="dsp-group">
                                        <label>Khử tiếng ù ù (Wind/Rumble): {noiseLevel}%</label>
                                        <div className="dsp-desc">Cắt bỏ âm thanh trầm của gió tạt hoặc động cơ xe máy ngoài đường.</div>
                                        <input type="range" min="0" max="100" value={noiseLevel} onChange={e => setNoiseLevel(Number(e.target.value))} className="dsp-slider green" />
                                    </div>
                                </div>
                            )}
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
