import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from './GlassCard';

/**
 * GlassModal: Modal cao cấp với nền kính mờ và viền sáng nhẹ, hỗ trợ Framer Motion.
 */
export const GlassModal = ({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    className,
    maxWidth = 'max-w-2xl',
    hideCloseButton = false
}) => {

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={cn(
                            "relative w-full max-h-[90vh] flex flex-col",
                            "bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl overflow-hidden",
                            maxWidth,
                            className
                        )}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        {title && (
                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
                                <h3 className="text-lg font-bold text-white">{title}</h3>
                                {!hideCloseButton && (
                                    <button 
                                        onClick={onClose}
                                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                            </div>
                        )}
                        
                        {!title && !hideCloseButton && (
                            <button 
                                onClick={onClose}
                                className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors bg-black/20 backdrop-blur-md"
                            >
                                <X size={20} />
                            </button>
                        )}

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
