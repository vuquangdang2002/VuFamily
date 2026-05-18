import React from 'react';
import './SplashLoading.css';

export default function SplashLoading({ loadingProgress, loadingStatus }) {
    return (
        <div className="splash-loading-container">
            <div className="splash-content">
                <div className="splash-logo">🏛️</div>
                <h1 className="splash-title">VuFamily</h1>
                
                <div className="progress-wrapper">
                    <div className="progress-bar-container">
                        <div 
                            className="progress-bar-fill" 
                            style={{ width: `${loadingProgress}%` }}
                        ></div>
                    </div>
                    <div className="progress-info">
                        <span className="status-text">{loadingStatus}</span>
                        <span className="percentage">{Math.round(loadingProgress)}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
