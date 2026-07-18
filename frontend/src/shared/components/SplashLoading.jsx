import React from 'react';
import { motion } from 'framer-motion';
import '../styles/SplashLoading.css';

export default function SplashLoading({ loadingProgress, loadingStatus }) {
    return (
        <div className="splash-container">
            {/* Tech Background */}
            <div className="splash-bg-layer">
                <div className="splash-bg-gradient"></div>
                {/* Accent Glows */}
                <div className="splash-glow-amber"></div>
                <div className="splash-glow-orange"></div>
            </div>

            <div className="splash-content-wrapper">
                {/* Glowing Logo */}
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="splash-logo-container"
                >
                    <div className="splash-logo-glow animate-pulse"></div>
                    <div className="splash-logo-box">
                        <div className="splash-logo-inner-glow"></div>
                        <img src="/logo.png" alt="Vu Gia Logo" className="splash-logo-image" />
                    </div>
                </motion.div>

                {/* App Title */}
                <div className="splash-text-container">
                    <motion.h1 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="splash-title"
                    >
                        Hệ sinh thái Vũ Gia
                    </motion.h1>
                    
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="splash-subtitle"
                    >
                        Kết nối tình thân, lưu truyền ngàn đời
                    </motion.p>
                </div>

                {/* Progress Bar Container */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="splash-progress-wrapper"
                >
                    <div className="splash-progress-header">
                        <span className="flex items-center gap-2">
                            <span className="splash-progress-dot animate-ping"></span>
                            {loadingStatus || "Đang kết nối hệ thống..."}
                        </span>
                        <span>{Math.round(loadingProgress || 0)}%</span>
                    </div>

                    <div className="splash-progress-track">
                        <div className="splash-progress-track-glow"></div>
                        <div 
                            className="splash-progress-fill"
                            style={{ width: `${loadingProgress}%` }}
                        >
                            <div className="splash-progress-fill-highlight"></div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
