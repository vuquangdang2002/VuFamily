import React from 'react';
import { motion } from 'framer-motion';
import { cn } from './GlassCard';

/**
 * GlowingButton: Nút bấm mang phong cách "Vũ Gia" với màu nhấn Vàng/Cam và hiệu ứng phát sáng.
 */
export const GlowingButton = React.forwardRef(({ 
    children, 
    className, 
    variant = 'primary', // primary | secondary | ghost | danger
    size = 'md', // sm | md | lg
    icon,
    fullWidth = false,
    ...props 
}, ref) => {
    
    const sizeClasses = {
        sm: "px-3 py-1.5 text-xs gap-1.5",
        md: "px-4 py-2.5 text-sm gap-2",
        lg: "px-6 py-3.5 text-base gap-3"
    };

    const variantClasses = {
        primary: cn(
            "bg-gradient-to-r from-[#fe6e00] to-amber-500 text-white font-semibold",
            "border border-transparent",
            "shadow-[0_0_15px_rgba(254,110,0,0.3)] hover:shadow-[0_0_25px_rgba(254,110,0,0.6)]"
        ),
        secondary: cn(
            "bg-white/10 dark:bg-white/5 text-zinc-900 dark:text-zinc-100 font-medium",
            "border border-white/20 dark:border-white/10 backdrop-blur-md",
            "hover:bg-white/20 dark:hover:bg-white/10 hover:border-[#fe6e00]/50 hover:text-[#fe6e00]"
        ),
        ghost: cn(
            "bg-transparent text-zinc-600 dark:text-zinc-400 font-medium",
            "hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-zinc-100"
        ),
        danger: cn(
            "bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium",
            "border border-rose-500/20",
            "hover:bg-rose-500 hover:text-white hover:shadow-[0_0_15px_rgba(244,63,94,0.4)]"
        )
    };

    const baseClasses = cn(
        "relative inline-flex items-center justify-center rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#fe6e00]/50",
        sizeClasses[size],
        variantClasses[variant],
        fullWidth ? "w-full" : "",
        className
    );

    return (
        <motion.button
            ref={ref}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={baseClasses}
            {...props}
        >
            {icon && <span className="shrink-0 flex items-center justify-center">{icon}</span>}
            <span>{children}</span>
        </motion.button>
    );
});

GlowingButton.displayName = "GlowingButton";
