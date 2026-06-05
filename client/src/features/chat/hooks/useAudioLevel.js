import { useState, useEffect } from 'react';
import { myError } from '../../../shared/utils/logger';

export default function useAudioLevel(stream) {
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
