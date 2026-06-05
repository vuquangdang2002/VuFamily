import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { HUB_URL } from '../../../config';
import { AuthHelper } from '../../../shared/services/AuthHelper';
import { TrackingHelper } from '../../../shared/services/TrackingHelper';
import { myLog, myError } from '../../../shared/utils/logger';

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

function applyHighBitrate(sdp) {
    return sdp
        .replace(/a=fmtp:111 /g, 'a=fmtp:111 maxaveragebitrate=128000;stereo=1;useinbandfec=1;')
        .replace(/(m=video.*\r\n)/g, '$1b=AS:4000\r\n');
}

function classifyQuality(rttMs, lossPercent) {
    if (rttMs === null) return { level: 'unknown', rtt: null, loss: null };
    if (rttMs <= 100 && lossPercent <= 2) return { level: 'good', rtt: rttMs, loss: lossPercent };
    if (rttMs <= 250 && lossPercent <= 8) return { level: 'medium', rtt: rttMs, loss: lossPercent };
    return { level: 'poor', rtt: rttMs, loss: lossPercent };
}

async function measurePeerQuality(pc) {
    if (!pc || pc.connectionState === 'closed') return { level: 'unknown', rtt: null, loss: null };
    try {
        const stats = await pc.getStats();
        let rtt = null;
        let sent = 0, lost = 0;
        stats.forEach(s => {
            if (s.type === 'candidate-pair' && s.state === 'succeeded' && s.currentRoundTripTime != null) {
                rtt = Math.round(s.currentRoundTripTime * 1000);
            }
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

export default function useVoiceCall({ user, activeCallRoom, onClearActiveCallRoom, addToast, t }) {
    const [phase, setPhase] = useState('IDLE');
    const [callMeta, setCallMeta] = useState(null);
    const [callType, setCallType] = useState('voice');
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});
    const [duration, setDuration] = useState(0);
    const [muted, setMuted] = useState(false);
    const [camOff, setCamOff] = useState(false);
    const [speakerMode, setSpeakerMode] = useState('speaker');
    const [netQuality, setNetQuality] = useState({});
    const [hubConnected, setHubConnected] = useState(false);

    const socketRef = useRef(null);
    const pcsRef = useRef({});
    const rawStreamRef = useRef(null);
    const localRef = useRef(null);
    const audioCtxRef = useRef(null);
    const filterNodeRef = useRef(null);
    const gainNodeRef = useRef(null);
    const gateNodeRef = useRef(null);
    const gateRafRef = useRef(null);
    const vuMeterRef = useRef(null);
    const phaseRef = useRef('IDLE');
    const metaRef = useRef(null);
    const processedRef = useRef(new Set());
    const queueRef = useRef({});
    const timerRef = useRef(null);
    const qualityTimerRef = useRef(null);
    const cleanupRef = useRef(null);
    const incomingSignalsRef = useRef([]);

    const [showSettings, setShowSettings] = useState(false);
    const [noiseLevel, setNoiseLevel] = useState(0);
    const [micSensitivity, setMicSensitivity] = useState(100);
    const [noiseGate, setNoiseGate] = useState(10);
    const noiseGateRef = useRef(noiseGate);

    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { metaRef.current = callMeta; }, [callMeta]);
    useEffect(() => { noiseGateRef.current = noiseGate; }, [noiseGate]);

    useEffect(() => {
        if (filterNodeRef.current) {
            filterNodeRef.current.frequency.value = noiseLevel * 10;
        }
    }, [noiseLevel]);

    useEffect(() => {
        if (gainNodeRef.current && audioCtxRef.current) {
            gainNodeRef.current.gain.setTargetAtTime(micSensitivity / 100, audioCtxRef.current.currentTime, 0.1);
        }
    }, [micSensitivity]);

    // Socket.io Connection
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
            reconnectionAttempts: 3,
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
            myError('CALL', '[VoiceCall] Hub offline. Call feature will not work.');
            addToast?.(t('chat.hub_unavailable'), 'warning');
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

        socket.on('call:rejected', () => { cleanup(); addToast(t('call.rejected'), 'info'); });
        socket.on('call:ended', () => { if (phaseRef.current !== 'IDLE') { cleanup(); addToast(t('call.ended'), 'info'); } });

        socket.on('call:signal', async ({ fromUserId, signal }) => {
            if (phaseRef.current === 'RINGING') {
                incomingSignalsRef.current.push({ fromUserId, signal });
                return;
            }
            await handleSignal(String(fromUserId), signal);
        });

        return () => socket.disconnect();
    }, [user?.token, t, addToast]);

    // Media Processing (DSP)
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
                addToast(t('call.no_camera'), 'warning');
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        audio: AUDIO_CONSTRAINTS,
                        video: false,
                    });
                    finalType = 'voice';
                } catch (err2) {
                    addToast(t('call.no_mic') + ' ' + err2.message, 'error');
                    return null;
                }
            } else {
                addToast(t('call.no_mic') + ' ' + e.message, 'error');
                return null;
            }
        }

        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            audioCtxRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);

            const gainNode = audioCtx.createGain();
            gainNode.gain.value = micSensitivity / 100;
            gainNodeRef.current = gainNode;

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

                if (vuMeterRef.current) {
                    const percent = Math.min(100, (avg / 128) * 100);
                    vuMeterRef.current.style.width = `${percent}%`;
                    vuMeterRef.current.style.backgroundColor = avg >= threshold ? '#10b981' : '#f59e0b';
                }

                if (avg < threshold) {
                    gateNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.1);
                } else {
                    gateNode.gain.setTargetAtTime(1, audioCtx.currentTime, 0.05);
                }
                gateRafRef.current = requestAnimationFrame(gateLoop);
            };
            gateLoop();

            const highpassFilter = audioCtx.createBiquadFilter();
            highpassFilter.type = 'highpass';
            highpassFilter.frequency.value = noiseLevel * 10;
            filterNodeRef.current = highpassFilter;

            const compressor = audioCtx.createDynamicsCompressor();
            compressor.threshold.value = -40;
            compressor.knee.value = 30;
            compressor.ratio.value = 10;
            compressor.attack.value = 0.005;
            compressor.release.value = 0.25;

            const destination = audioCtx.createMediaStreamDestination();

            source.connect(gainNode);
            gainNode.connect(analyser);
            gainNode.connect(gateNode);
            gateNode.connect(highpassFilter);
            highpassFilter.connect(compressor);
            compressor.connect(destination);

            const processedStream = new MediaStream([
                ...destination.stream.getAudioTracks(),
                ...stream.getVideoTracks()
            ]);

            rawStreamRef.current = stream;
            localRef.current = processedStream;
            setLocalStream(processedStream);
            setCallType(finalType);
            setCamOff(finalType === 'voice');
            return processedStream;
        } catch (e) {
            addToast(t('call.audio_error') + ' ' + e.message, 'error');
            return null;
        }
    }, [addToast, t, noiseLevel, micSensitivity]);

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

    // WebRTC connection
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

                if (Object.keys(pcsRef.current).length === 0) {
                    addToast(t('call.peer_left'), 'info');
                    cleanupRef.current?.();
                }
            }
        };

        pcsRef.current[targetId] = pc;
        return pc;
    }, [t, addToast]);

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
                else {
                    if (!queueRef.current[fromId]) queueRef.current[fromId] = [];
                    queueRef.current[fromId].push(cand);
                }
            }
        } catch (e) {
            myError('CALL', '[VoiceCall] handleSignal', signal.type, e.message);
        }
    }, [createPeer]);

    // Duration timer
    useEffect(() => {
        if (phase === 'CONNECTED') {
            setDuration(0);
            timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
        } else clearInterval(timerRef.current);
        return () => clearInterval(timerRef.current);
    }, [phase]);

    // Network Quality Polling
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
        poll();
        qualityTimerRef.current = setInterval(poll, 3000);
        return () => clearInterval(qualityTimerRef.current);
    }, [phase]);

    // Cleanup function
    const cleanup = useCallback(() => {
        myLog('CALL', '[VoiceCall] Performing cleanup and ending call.');
        if (duration > 0) {
            TrackingHelper.trackEndVoiceCall(duration);
        }
        setPhase('IDLE');
        setCallMeta(null);
        stopMedia();
        Object.values(pcsRef.current).forEach(pc => pc.close());
        pcsRef.current = {};
        processedRef.current.clear();
        queueRef.current = {};
        clearInterval(timerRef.current);
        clearInterval(qualityTimerRef.current);
        incomingSignalsRef.current = [];
        setDuration(0);
        setMuted(false);
        setCamOff(false);
        setSpeakerMode('speaker');
        setNetQuality({});
        onClearActiveCallRoom?.();
    }, [duration, stopMedia, onClearActiveCallRoom]);

    useEffect(() => { cleanupRef.current = cleanup; }, [cleanup]);

    // Trigger Outbound call
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
            if (!res?.success) {
                cleanup();
                addToast(res?.error || t('call.start_error'), 'error');
                return;
            }
            const { call, iceConfig } = res;
            setCallMeta(p => ({ ...p, callId: call.id, iceConfig }));

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
        if (!stream) {
            rejectCall();
            return;
        }

        socketRef.current?.emit('call:accept', { callId: meta.callId }, async (res) => {
            if (res?.success) {
                setPhase('CONNECTED');
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

    const toggleMute = () => {
        localRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
        setMuted(m => !m);
    };

    const toggleCam = () => {
        if (callType !== 'video') {
            addToast(t('call.no_camera_voice'), 'info');
            return;
        }
        localRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
        setCamOff(c => !c);
    };

    const toggleSpeaker = async () => {
        const nextMode = speakerMode === 'speaker' ? 'earpiece' : 'speaker';

        if (window.AudioToggle) {
            window.AudioToggle.setAudioMode(nextMode === 'speaker' ? window.AudioToggle.SPEAKER : window.AudioToggle.EARPIECE);
            setSpeakerMode(nextMode);
            return;
        }

        if (!navigator.mediaDevices?.enumerateDevices) {
            addToast(t('call.no_speaker_switch'), 'info');
            return;
        }

        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioOutputs = devices.filter(d => d.kind === 'audiooutput');

            if (audioOutputs.length <= 1) {
                addToast(t('call.single_output'), 'warning');
                return;
            }

            setSpeakerMode(nextMode);
            addToast(nextMode === 'speaker' ? t('call.switched_speaker') : t('call.switched_earpiece'), 'success');
        } catch (e) {
            addToast(t('call.switch_error') + ' ' + e.message, 'error');
        }
    };

    return {
        phase,
        callMeta,
        callType,
        localStream,
        remoteStreams,
        duration,
        muted,
        camOff,
        speakerMode,
        netQuality,
        hubConnected,
        showSettings,
        noiseLevel,
        micSensitivity,
        noiseGate,
        vuMeterRef,
        setShowSettings,
        setNoiseLevel,
        setMicSensitivity,
        setNoiseGate,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleCam,
        toggleSpeaker,
        cleanup
    };
}
