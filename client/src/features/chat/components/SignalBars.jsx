import React from 'react';

const QUALITY_META = {
    good: { bars: 3, color: '#10b981', labelKey: 'call.quality_good' },
    medium: { bars: 2, color: '#f59e0b', labelKey: 'call.quality_medium' },
    poor: { bars: 1, color: '#ef4444', labelKey: 'call.quality_poor' },
    unknown: { bars: 0, color: '#64748b', labelKey: null },
};

export default function SignalBars({ quality, t }) {
    const meta = QUALITY_META[quality?.level || 'unknown'];
    const label = meta.labelKey ? t(meta.labelKey) : '?';
    return (
        <div title={quality?.rtt != null ? `RTT: ${quality.rtt}ms · Loss: ${quality.loss}%` : t('call.measuring')}
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
                {quality?.rtt != null ? `${quality.rtt}ms` : label}
            </span>
        </div>
    );
}
