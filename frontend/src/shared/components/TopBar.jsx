import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { Search, Bell, HelpCircle, PenTool, User as UserIcon } from 'lucide-react';

export default function TopBar({ user, onSearch }) {
    const { t } = useTranslation();

    return (
        <div className="flex items-center justify-between bg-white rounded-2xl px-6 py-3 mb-6 shadow-sm shrink-0">
            {/* Search Bar */}
            <div className="flex items-center bg-gray-50 rounded-full px-4 py-2 w-96 border border-gray-100">
                <Search size={18} className="text-gray-400 mr-2" />
                <input 
                    type="text" 
                    placeholder="Tìm kiếm chức năng, nhân viên..." 
                    className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder-gray-400"
                    onChange={(e) => onSearch && onSearch(e.target.value)}
                />
            </div>

            {/* Right Icons */}
            <div className="flex items-center gap-4">
                <button className="text-gray-500 hover:text-blue-600 transition-colors">
                    <HelpCircle size={20} />
                </button>
                <button className="text-gray-500 hover:text-blue-600 transition-colors relative">
                    <Bell size={20} />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
                <button className="text-gray-500 hover:text-blue-600 transition-colors">
                    <PenTool size={20} />
                </button>
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold overflow-hidden cursor-pointer">
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
