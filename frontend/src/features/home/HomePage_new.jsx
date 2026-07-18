import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from '../../shared/hooks/useTranslation';
import { Solar } from '../../shared/utils/lunar.js';
import { ganZhiToViet, lunarMonthName } from '../../shared/utils/vietLunar.js';
import { request } from '../../shared/services/api/request';
import { Network, Newspaper, MessageSquare, Calendar, Wallet, Users, LayoutList, HelpCircle, ChevronRight, Cake, Flame, Quote, Sparkles, LogIn, UserPlus, Image, Heart, Award, ArrowRight } from 'lucide-react';

export default function HomePage({ user, members, onNavigate, addToast }) {
    const { t } = useTranslation();

    // ── PUBLIC GUEST LANDING VIEW (FinancialManagement / SaaS Style) ──
    if (!user) {
        return (
            <div className="min-h-screen w-full bg-[#0d1117] text-[#c9d1d9] font-sans overflow-x-hidden selection:bg-[#fe6e00]/30">
                {/* Header */}
                <header className="sticky top-0 z-50 w-full border-b border-[#30363d] bg-[#0d1117]/80 backdrop-blur-md">
                    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {/* Shield Logo inspired by FinancialManagement */}
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#161b22] border border-[#30363d] shadow-sm">
                                <span className="font-bold text-[#fe6e00] text-lg leading-none">族</span>
                            </div>
                            <span className="font-semibold text-lg tracking-tight text-white">Vũ Tộc</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => onNavigate('login')}
                                className="text-sm font-medium text-[#c9d1d9] hover:text-white transition-colors"
                            >
                                {t('login.sign_in') || 'Đăng nhập'}
                            </button>
                            <button 
                                onClick={() => { onNavigate('login'); /* trigger register mode if needed */ }}
                                className="text-sm font-medium bg-[#fe6e00] text-white px-4 py-2 rounded-md hover:bg-[#e06100] transition-colors shadow-sm"
                            >
                                {t('login.sign_up') || 'Đăng ký'}
                            </button>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="w-full">
                    {/* Hero Section */}
                    <section className="relative max-w-7xl mx-auto px-6 pt-24 pb-32 flex flex-col items-center text-center">
                        <div className="inline-flex items-center rounded-full border border-[#30363d] bg-[#161b22] px-3 py-1 text-sm font-medium text-[#8b949e] mb-8">
                            <Sparkles className="mr-2 h-4 w-4 text-[#fe6e00]" />
                            <span>Hệ thống Gia Phả Số Thế Hệ Mới</span>
                        </div>
                        
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mb-6">
                            Kết Nối <span className="text-[#fe6e00]">Cội Nguồn</span><br />
                            Gìn Giữ Gia Phong
                        </h1>
                        
                        <p className="text-lg md:text-xl text-[#8b949e] max-w-2xl mb-10 leading-relaxed">
                            Không gian số kết nối các thế hệ dòng họ Vũ. Nơi lưu giữ phả đồ số hóa, chia sẻ khoảnh khắc sum vầy và minh bạch tài chính gia tộc.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
                            <button 
                                onClick={() => onNavigate('login')}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#fe6e00] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#e06100] transition-all shadow-lg shadow-[#fe6e00]/20"
                            >
                                Trải nghiệm ngay <ArrowRight size={18} />
                            </button>
                            <button 
                                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#161b22] text-[#c9d1d9] border border-[#30363d] px-8 py-3.5 rounded-lg font-medium hover:bg-[#21262d] transition-all"
                            >
                                Tìm hiểu thêm
                            </button>
                        </div>
                    </section>

                    {/* Dashboard-style Stats / Features Preview */}
                    <section id="features" className="max-w-7xl mx-auto px-6 py-20 border-t border-[#30363d]">
                        <div className="mb-12">
                            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Tính năng nổi bật</h2>
                            <p className="text-[#8b949e]">Quản lý toàn diện các hoạt động của dòng họ trên một nền tảng duy nhất.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Card 1 */}
                            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 hover:border-[#8b949e]/50 transition-colors">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm font-medium text-[#8b949e]">Phả Hệ Trực Quan</span>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                                        <Network className="h-5 w-5" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">Cây Gia Phả Số</h3>
                                <p className="text-sm text-[#8b949e] leading-relaxed">Sơ đồ phả hệ thông minh, dễ dàng tra cứu và cập nhật thông tin các thành viên qua nhiều thế hệ.</p>
                            </div>

                            {/* Card 2 */}
                            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 hover:border-[#8b949e]/50 transition-colors">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm font-medium text-[#8b949e]">Quản Lý Thu Chi</span>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                                        <Wallet className="h-5 w-5" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">Minh Bạch Quỹ</h3>
                                <p className="text-sm text-[#8b949e] leading-relaxed">Công khai sổ cái thu chi, đóng góp quỹ dòng họ, hiếu hỉ với hệ thống báo cáo chi tiết theo tháng.</p>
                            </div>

                            {/* Card 3 */}
                            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 hover:border-[#8b949e]/50 transition-colors">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm font-medium text-[#8b949e]">Lễ & Kỷ Niệm</span>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
                                        <Calendar className="h-5 w-5" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">Nhắc Nhở Sự Kiện</h3>
                                <p className="text-sm text-[#8b949e] leading-relaxed">Theo dõi ngày giỗ tết (Âm lịch), mừng thọ, họp họ và các sự kiện quan trọng trong dòng họ.</p>
                            </div>

                            {/* Card 4 */}
                            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 hover:border-[#8b949e]/50 transition-colors">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm font-medium text-[#8b949e]">Kết Nối Nội Bộ</span>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                                        <MessageSquare className="h-5 w-5" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2">Trò Chuyện & Gọi Nhóm</h3>
                                <p className="text-sm text-[#8b949e] leading-relaxed">Hệ thống chat và gọi video trực tuyến bảo mật cao, kết nối các gia đình xa xứ mọi lúc mọi nơi.</p>
                            </div>
                        </div>
                    </section>

                    {/* Moments Section */}
                    <section className="max-w-7xl mx-auto px-6 py-20 border-t border-[#30363d]">
                        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Khoảnh khắc gia tộc</h2>
                                <p className="text-[#8b949e] max-w-2xl">Những sự kiện, kỷ niệm đẹp được lưu lại và chia sẻ cùng con cháu.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden group">
                                <div className="h-48 bg-[#21262d] flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#fe6e00]/20 to-transparent"></div>
                                    <Award size={48} className="text-[#fe6e00]/40 group-hover:scale-110 transition-transform" />
                                </div>
                                <div className="p-6">
                                    <h3 className="text-lg font-bold text-white mb-2">Lễ Tế Tổ & Khuyến Học</h3>
                                    <p className="text-sm text-[#8b949e]">Họp mặt tế lễ Tổ tiên thường niên và trao quỹ khuyến học nâng bước con cháu đỗ đạt thành tài.</p>
                                </div>
                            </div>

                            <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden group">
                                <div className="h-48 bg-[#21262d] flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 to-transparent"></div>
                                    <Heart size={48} className="text-rose-500/40 group-hover:scale-110 transition-transform" />
                                </div>
                                <div className="p-6">
                                    <h3 className="text-lg font-bold text-white mb-2">Mừng Thọ Các Cụ Cao Niên</h3>
                                    <p className="text-sm text-[#8b949e]">Lễ chúc thọ ấm cúng thể hiện lòng hiếu thảo, cầu mong vạn sự bình an cho ông bà cha mẹ dòng tộc.</p>
                                </div>
                            </div>

                            <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden group">
                                <div className="h-48 bg-[#21262d] flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent"></div>
                                    <Users size={48} className="text-blue-500/40 group-hover:scale-110 transition-transform" />
                                </div>
                                <div className="p-6">
                                    <h3 className="text-lg font-bold text-white mb-2">Hội Ngộ Chi Nhánh</h3>
                                    <p className="text-sm text-[#8b949e]">Dịp gặp mặt kết nối các gia đình xa xứ, chia sẻ câu chuyện cuộc sống và cùng hướng về nguồn cội.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* CTA Section */}
                    <section className="max-w-7xl mx-auto px-6 py-24 mb-20 border border-[#30363d] bg-[#161b22] rounded-2xl text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(254,110,0,0.1)_0%,transparent_70%)]"></div>
                        <div className="relative z-10">
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Sẵn sàng trải nghiệm?</h2>
                            <p className="text-[#8b949e] mb-8 max-w-xl mx-auto">Tham gia ngay không gian số dành riêng cho dòng họ Vũ, bảo mật tuyệt đối và dễ dàng sử dụng.</p>
                            <button 
                                onClick={() => onNavigate('login')}
                                className="bg-[#fe6e00] text-white px-8 py-3 rounded-lg font-medium hover:bg-[#e06100] transition-colors"
                            >
                                Đăng nhập Hệ thống
                            </button>
                        </div>
                    </section>
                </main>

                {/* Footer */}
                <footer className="border-t border-[#30363d] bg-[#0d1117] py-8">
                    <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-[#8b949e]">
                            <span className="font-semibold text-white">Vũ Tộc</span>
                            <span>© 2026. All rights reserved.</span>
                        </div>
                        <div className="flex gap-6 text-sm text-[#8b949e]">
                            <a href="#" className="hover:text-white transition-colors">Về chúng tôi</a>
                            <a href="#" className="hover:text-white transition-colors">Bảo mật</a>
                            <a href="#" className="hover:text-white transition-colors">Điều khoản</a>
                        </div>
                    </div>
                </footer>
            </div>
        );
    }

    // Authenticated View / Internal Pages (Kept the same for when logged in)
    return (
        <div className="p-8">
            <h1 className="text-2xl text-white">Loading...</h1>
        </div>
    );
}
