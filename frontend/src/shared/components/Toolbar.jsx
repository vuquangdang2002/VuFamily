import { useTranslation } from '../hooks/useTranslation.js';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Toolbar({ theme, setTheme }) {
    const { t } = useTranslation();

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 p-1.5 bg-white/80 dark:bg-[#111111]/80 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-full shadow-lg pointer-events-auto"
        >
            <div className="flex items-center gap-1 px-1">
                <button 
                    className="w-10 h-10 flex items-center justify-center rounded-full text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors" 
                    onClick={() => window.__treeCanvas?.zoomIn()} 
                    title={t('toolbar.zoom_in') || 'Phóng to'}
                >
                    <ZoomIn size={18} />
                </button>
                <button 
                    className="w-10 h-10 flex items-center justify-center rounded-full text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors" 
                    onClick={() => window.__treeCanvas?.zoomOut()} 
                    title={t('toolbar.zoom_out') || 'Thu nhỏ'}
                >
                    <ZoomOut size={18} />
                </button>
                <div className="w-px h-6 bg-black/10 dark:bg-white/10 mx-1" />
                <button 
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors" 
                    onClick={() => window.__treeCanvas?.fitView()} 
                    title={t('toolbar.fit_view') || 'Vừa màn hình'}
                >
                    <Maximize size={16} /> <span className="hidden sm:inline">{t('toolbar.fit_text') || 'Vừa màn hình'}</span>
                </button>
            </div>
            
            <div className="hidden md:flex items-center gap-2 pl-3 pr-4 border-l border-black/10 dark:border-white/10">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {t('toolbar.hint') || 'Cuộn chuột để thu phóng, Kéo để di chuyển'}
                </span>
            </div>
        </motion.div>
    );
}
