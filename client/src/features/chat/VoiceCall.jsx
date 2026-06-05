import React from 'react';
import { useTranslation } from '../../shared/hooks/useTranslation';
import useVoiceCall from './hooks/useVoiceCall';
import VideoCell from './components/VideoCell';
import './VoiceCall.css';

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

function Btn({ icon, label, active, cls = '', onClick }) {
    return (
        <div className="vc-ctrl-item">
            <button className={`vc-btn ${active ? 'active' : ''} ${cls}`} onClick={onClick}>{icon}</button>
            <span>{label}</span>
        </div>
    );
}

export default function VoiceCall({ user, activeCallRoom, onClearActiveCallRoom, addToast }) {
    const { t } = useTranslation();
    const {
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
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleCam,
        toggleSpeaker
    } = useVoiceCall({ user, activeCallRoom, onClearActiveCallRoom, addToast, t });

    if (phase === 'IDLE') return null;

    const callerName = callMeta?.caller?.displayName || callMeta?.room?.display_name || t('call.call_label');
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
                        <VideoCell stream={localStream} muted label={`${t('call.you_label')}${muted ? ' 🔇' : ''}`} isLocal noVideo={callType === 'voice' || camOff} t={t} />
                        {remoteIds.map(uid => (
                            <VideoCell key={uid} stream={remoteStreams[uid]}
                                label={t('call.member_label')} quality={netQuality[uid]} t={t} />
                        ))}
                    </div>
                ) : (
                    <div className="vc-avatar-area">
                        <div className={`vc-ring ${phase !== 'IDLE' ? 'pulse' : ''}`}>
                            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(callerName)}&background=334155&color=fff&size=120`} alt="" />
                        </div>
                        <h2 className="vc-name">{callerName}</h2>
                        <p className="vc-status">
                            {phase === 'RINGING' && (callMeta?.callType === 'video' ? t('call.incoming_video') : t('call.incoming_voice'))}
                            {phase === 'CALLING' && t('call.dialing')}
                        </p>
                    </div>
                )}

                <div className="vc-controls">
                    {phase === 'RINGING' ? (
                        <>
                            <Btn icon="📵" label={t('call.reject_btn')} cls="reject" onClick={rejectCall} />
                            <Btn icon={callMeta?.callType === 'video' ? '📹' : '📞'} label={t('call.accept_btn')} cls="accept pulse-btn" onClick={acceptCall} />
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, padding: '16px 0' }}>
                                <Btn icon={muted ? '🔇' : '🎤'} label={muted ? t('call.mute_on') : t('call.mute_off')} active={muted} onClick={toggleMute} />
                                {callType === 'video' && <Btn icon={camOff ? '📷' : '📹'} label={camOff ? t('call.cam_on') : t('call.cam_off')} active={camOff} onClick={toggleCam} />}
                                <Btn icon="📞" label={t('call.end_btn')} cls="reject rot135" onClick={endCall} />
                                <Btn icon={speakerMode === 'speaker' ? '🔊' : '🔉'} label={speakerMode === 'speaker' ? t('call.speaker') : t('call.earpiece')} active={speakerMode === 'speaker'} onClick={toggleSpeaker} />
                                <Btn icon="⚙️" label={t('call.audio_settings_btn')} active={showSettings} onClick={() => setShowSettings(!showSettings)} />
                            </div>

                            {/* Bảng Cài đặt Âm thanh (Discord Style) */}
                            {showSettings && (
                                <div className="vc-dsp-panel">
                                    <div className="dsp-title">{t('call.audio_settings_title')}</div>

                                    {/* Chặn tiếng vọng (Noise Gate) */}
                                    <div className="dsp-group">
                                        <label>{t('call.noise_gate_label')}</label>
                                        <div className="dsp-desc">{t('call.noise_gate_desc')}</div>
                                        <div className="vu-meter-container">
                                            <div ref={vuMeterRef} className="vu-meter-fill" />
                                            <input type="range" min="0" max="100" value={noiseGate} onChange={e => setNoiseGate(Number(e.target.value))} className="dsp-slider gate-slider" />
                                        </div>
                                    </div>

                                    {/* Độ nhạy Mic */}
                                    <div className="dsp-group">
                                        <label>{t('call.mic_gain_label')} {micSensitivity}%</label>
                                        <div className="dsp-desc">{t('call.mic_gain_desc')}</div>
                                        <input type="range" min="10" max="200" value={micSensitivity} onChange={e => setMicSensitivity(Number(e.target.value))} className="dsp-slider blue" />
                                    </div>

                                    {/* Lọc tiếng gió (Highpass) */}
                                    <div className="dsp-group">
                                        <label>{t('call.wind_filter_label')} {noiseLevel}%</label>
                                        <div className="dsp-desc">{t('call.wind_filter_desc')}</div>
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
