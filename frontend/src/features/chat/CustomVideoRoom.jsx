import React, { useState } from 'react';
import { 
    useTracks, 
    ControlBar, 
    GridLayout, 
    CarouselLayout, 
    ParticipantTile, 
    LayoutContextProvider,
    RoomAudioRenderer,
    ConnectionStateToast,
    FocusLayout,
    usePinnedTracks,
    useLayoutContext
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { LayoutGrid, Sidebar, Maximize } from 'lucide-react';
import { useTranslation } from '../../shared/hooks/useTranslation';

function LayoutManager({ layout }) {
    const tracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: true },
            { source: Track.Source.ScreenShare, withPlaceholder: false },
        ],
        { onlySubscribed: false },
    );

    const layoutContext = useLayoutContext();
    const pinnedTracks = usePinnedTracks(layoutContext);
    const focusTrack = pinnedTracks.length > 0 ? pinnedTracks[0] : (tracks.length > 0 ? tracks[0] : null);

    return (
        <div className="flex-1 min-h-0 relative p-2 md:p-4">
            {layout === 'grid' && (
                <GridLayout tracks={tracks} />
            )}
            {layout === 'sidebar' && (
                <div className="flex flex-col md:flex-row h-full w-full gap-4">
                    <div className="flex-1 min-w-0 h-full">
                        {focusTrack ? (
                            <FocusLayout trackRef={focusTrack} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-500 animate-pulse">Đang kết nối...</div>
                        )}
                    </div>
                    <div className="w-full md:w-1/4 h-[120px] md:h-full md:min-w-[200px] md:max-w-[300px]">
                        <CarouselLayout tracks={tracks} />
                    </div>
                </div>
            )}
            {layout === 'spotlight' && (
                <div className="w-full h-full">
                    {focusTrack ? (
                        <FocusLayout trackRef={focusTrack} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500 animate-pulse">Đang kết nối...</div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function CustomVideoRoom() {
    const { t } = useTranslation();
    const [layout, setLayout] = useState('grid'); // grid, sidebar, spotlight

    return (
        <LayoutContextProvider>
            <div className="flex flex-col h-full w-full relative bg-zinc-950">
                {/* Layout Switcher */}
                <div className="absolute top-4 right-4 z-[100] flex gap-2 bg-zinc-900/80 p-1.5 rounded-xl border border-white/10 backdrop-blur-md shadow-2xl">
                    <button 
                        onClick={() => setLayout('grid')}
                        className={`p-2 rounded-lg transition-all ${layout === 'grid' ? 'bg-emerald-500 text-white' : 'text-zinc-400 hover:bg-white/10'}`}
                        title={t('call.layout_grid') || "Dạng Lưới"}
                    ><LayoutGrid size={18} /></button>
                    <button 
                        onClick={() => setLayout('sidebar')}
                        className={`p-2 rounded-lg transition-all ${layout === 'sidebar' ? 'bg-emerald-500 text-white' : 'text-zinc-400 hover:bg-white/10'}`}
                        title={t('call.layout_sidebar') || "Thanh Bên"}
                    ><Sidebar size={18} /></button>
                    <button 
                        onClick={() => setLayout('spotlight')}
                        className={`p-2 rounded-lg transition-all ${layout === 'spotlight' ? 'bg-emerald-500 text-white' : 'text-zinc-400 hover:bg-white/10'}`}
                        title={t('call.layout_spotlight') || "Tiêu Điểm"}
                    ><Maximize size={18} /></button>
                </div>

                <LayoutManager layout={layout} />

                <div className="shrink-0 p-4 bg-zinc-900/50 border-t border-white/5 flex justify-center z-10 backdrop-blur-md">
                    <ControlBar variation="minimal" />
                </div>
                
                <RoomAudioRenderer />
                <ConnectionStateToast />
            </div>
        </LayoutContextProvider>
    );
}
