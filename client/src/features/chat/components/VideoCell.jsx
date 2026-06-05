import React, { useState, useEffect, useRef } from 'react';
import useAudioLevel from '../hooks/useAudioLevel';
import SignalBars from './SignalBars';

export default function VideoCell({ stream, muted = false, label, isLocal = false, noVideo = false, quality, t }) {
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
        return () => { 
            stream.removeEventListener('addtrack', check); 
            stream.removeEventListener('removetrack', check); 
        };
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
                    <small>{isLocal ? t('call.your_mic') : t('call.listening')}</small>
                </div>
            )}
            <div className="vc-cell-footer">
                <span className="vc-cell-label" style={{ position: 'static', background: 'none', padding: 0 }}>{label}</span>
                {quality && <SignalBars quality={quality} t={t} />}
            </div>
        </div>
    );
}
