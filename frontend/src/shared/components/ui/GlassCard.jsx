import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * GlassCard: Thẻ giao diện theo phong cách Glassmorphism sang trọng.
 * Hỗ trợ các biến thể (variants) và hoạt ảnh khi được chỉ định.
 */
export const GlassCard = React.forwardRef(({ 
    children, 
    className, 
    interactive = false,
    gradient = false,
    animate = true,
    ...props 
}, ref) => {
    const baseClasses = cn(
        "rounded-2xl border border-white/10 dark:border-white/5",
        "bg-white/70 dark:bg-black/40 backdrop-blur-xl",
        "shadow-[0_8px_32px_0_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]",
        "overflow-hidden transition-all duration-300",
        interactive && "hover:border-[#fe6e00]/50 hover:shadow-[0_8px_32px_0_rgba(254,110,0,0.15)] cursor-pointer",
        gradient && "bg-gradient-to-br from-white/80 to-white/40 dark:from-white/10 dark:to-white/5",
        className
    );

    if (animate) {
        return (
            <motion.div
                ref={ref}
                whileHover={interactive ? { scale: 1.01, y: -2 } : {}}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={baseClasses}
                {...props}
            >
                {children}
            </motion.div>
        );
    }

    return (
        <div ref={ref} className={baseClasses} {...props}>
            {children}
        </div>
    );
});

GlassCard.displayName = "GlassCard";
