import React, { useEffect, useRef, useCallback } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import { myLog } from '../../../shared/utils/logger';

const CALL_TIMEOUT_MS = 45000; // 45 seconds auto-timeout (Messenger-style)

export default function IncomingCallModal({ incomingCall, onAccept, onReject }) {
    const { t } = useTranslation();
    const audioCtxRef = useRef(null);
    const timeoutRef = useRef(null);
    const vibrationRef = useRef(null);

    // Messenger-style auto-timeout: if no answer in 45s, auto-reject
    const handleAutoTimeout = useCallback(() => {
        myLog('CALL', '[IncomingCallModal] ⏰ Auto-timeout reached (45s). Auto-rejecting call.');
        onReject?.();
    }, [onReject]);

    useEffect(() => {
        if (!incomingCall) return;

        myLog('CALL', '[IncomingCallModal] 🔔 Showing incoming call UI for:', incomingCall.callerName);

        // ── Auto-timeout (45s) ──
        timeoutRef.current = setTimeout(handleAutoTimeout, CALL_TIMEOUT_MS);

        // ── Vibration pattern (Messenger-style: ring-pause-ring) ──
        let vibrationLoop = null;
        try {
            if (navigator.vibrate) {
                const vibratePattern = () => navigator.vibrate([400, 300, 400, 300, 400, 1000]);
                vibratePattern();
                vibrationLoop = setInterval(vibratePattern, 2800);
                vibrationRef.current = vibrationLoop;
            }
        } catch (e) { /* vibration not supported */ }

        // ── Web Audio API Ringtone — realistic phone ring (dual-tone) ──
        let ringIntervalId = null;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                const ctx = new AudioContext();
                audioCtxRef.current = ctx;

                const playRing = () => {
                    if (ctx.state === 'closed') return;
                    if (ctx.state === 'suspended') ctx.resume();

                    // Dual-tone ring (440Hz + 480Hz) — standard phone ring
                    const createTone = (freq, startTime, duration) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sine';
                        osc.frequency.value = freq;
                        gain.gain.setValueAtTime(0.08, startTime);
                        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start(startTime);
                        osc.stop(startTime + duration);
                    };

                    const now = ctx.currentTime;
                    // Ring burst 1 (0.4s)
                    createTone(440, now, 0.4);
                    createTone(480, now, 0.4);
                    // Short pause, then ring burst 2 (0.4s)
                    createTone(440, now + 0.6, 0.4);
                    createTone(480, now + 0.6, 0.4);
                };

                playRing();
                // Repeat ring pattern every 2.5 seconds (ring-ring ... ring-ring ...)
                ringIntervalId = setInterval(playRing, 2500);
            }
        } catch (e) {
            myLog('CALL', 'Audio ringtone playback skipped:', e);
        }

        return () => {
            // Cleanup everything
            if (ringIntervalId) clearInterval(ringIntervalId);
            if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
                audioCtxRef.current.close().catch(() => {});
            }
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (vibrationRef.current) clearInterval(vibrationRef.current);
            if (navigator.vibrate) navigator.vibrate(0); // Stop vibration
        };
    }, [incomingCall, handleAutoTimeout]);

    if (!incomingCall) return null;

    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="w-full max-w-sm rounded-3xl bg-zinc-900/90 border border-white/10 p-6 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
                
                {/* Pulsating Glow Waves */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl animate-ping opacity-50 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl animate-pulse opacity-30 pointer-events-none" />

                {/* Avatar with Ringing Pulse */}
                <div className="relative mb-4">
                    <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-pulse scale-125" />
                    <div className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping scale-150" />
                    <div className="w-20 h-20 rounded-full bg-emerald-600 text-white flex items-center justify-center text-2xl font-bold border-2 border-emerald-400/50 relative shadow-lg overflow-hidden">
                        {incomingCall.callerAvatar ? (
                            <img src={incomingCall.callerAvatar} alt={incomingCall.callerName} className="w-full h-full object-cover" />
                        ) : (
                            (incomingCall.callerName || 'U').charAt(0).toUpperCase()
                        )}
                    </div>
                </div>

                {/* Caller Title & Info */}
                <h3 className="text-xl font-black text-white m-0 tracking-tight">
                    {incomingCall.callerName || t('call.member_label')}
                </h3>
                
                <p className="text-xs font-semibold text-emerald-400 mt-1 mb-6 flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    {incomingCall.requestVideo ? <Video size={14} /> : <Phone size={14} />}
                    {incomingCall.requestVideo ? (t('call.incoming_video') || 'Cuộc gọi Video đến...') : (t('call.incoming_voice') || 'Cuộc gọi thoại đến...')}
                </p>

                {/* Action Buttons */}
                <div className="flex items-center justify-center gap-6 w-full pt-2">
                    {/* Decline */}
                    <button
                        onClick={onReject}
                        className="flex-1 py-3 px-4 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold text-sm flex items-center justify-center gap-2 border border-rose-500/30 transition-all active:scale-95 shadow-md"
                    >
                        <PhoneOff size={18} />
                        {t('call.reject_btn') || 'Từ chối'}
                    </button>

                    {/* Accept */}
                    <button
                        onClick={onAccept}
                        className="flex-1 py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/30 animate-bounce"
                    >
                        <Phone size={18} />
                        {t('call.accept_btn') || 'Nghe máy'}
                    </button>
                </div>
            </div>
        </div>
    );
}
