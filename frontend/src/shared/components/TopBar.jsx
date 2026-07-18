import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { Search, Bell, HelpCircle, PenTool, User as UserIcon } from 'lucide-react';
import '../styles/TopBar.css';

export default function TopBar({ user, onSearch }) {
    const { t } = useTranslation();

    return (
        <div className="topbar-container">
            {/* Search Bar */}
            <div className="topbar-search-wrapper">
                <Search size={18} className="topbar-search-icon" />
                <input 
                    type="text" 
                    placeholder="Tìm kiếm chức năng, nhân viên..." 
                    className="topbar-search-input"
                    onChange={(e) => onSearch && onSearch(e.target.value)}
                />
            </div>

            {/* Right Icons */}
            <div className="topbar-actions-group">
                <button className="topbar-action-btn">
                    <HelpCircle size={20} />
                </button>
                <button className="topbar-action-btn">
                    <Bell size={20} />
                    <span className="topbar-action-badge"></span>
                </button>
                <button className="topbar-action-btn">
                    <PenTool size={20} />
                </button>
                <div className="topbar-avatar">
                    {user?.avatar ? (
                        <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
                    ) : (
                        <UserIcon size={16} />
                    )}
                </div>
            </div>
        </div>
    );
}
