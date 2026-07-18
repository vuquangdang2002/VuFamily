import React from 'react';
import { Network, Newspaper, Calendar, Landmark, ShieldCheck, Database, ArrowRight, Check, Sparkles, User } from 'lucide-react';
import '../styles/GuestView.css';

export default function GuestView({ onNavigate }) {
    return (
        <div className="guest-container">
            {/* Tech & Family Background */}
            <div className="guest-bg-layer">
                <img src="/tech_bg.png" alt="Background" className="guest-bg-img" />
                <div className="guest-bg-gradient"></div>
                {/* Glowing Orbs */}
                <div className="guest-glow-orange"></div>
                <div className="guest-glow-blue"></div>
            </div>

            {/* Header */}
            <header className="guest-header">
                <div className="flex items-center gap-3">
                    <div className="guest-logo-container group" onClick={() => window.location.reload()}>
                        <div className="absolute inset-0 bg-gradient-to-br from-[#fe6e00]/20 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
                        <img src="/logo.png" alt="Vu Gia Logo" className="w-8 h-8 object-contain relative z-10 drop-shadow-[0_0_8px_rgba(254,110,0,0.8)]" />
                    </div>
                    <span className="font-bold text-2xl tracking-tight text-white cursor-pointer" onClick={() => window.location.reload()}>Vũ Gia</span>
                </div>

                <div className="hidden md:flex items-center gap-8"></div>
                
                <button onClick={() => onNavigate('login')} className="guest-btn-login">
                    Đăng nhập
                </button>
            </header>

            <main className="guest-main">
                {/* Pill */}
                <div className="guest-pill">
                    <Sparkles size={14} className="animate-pulse" /> Nền tảng số hoá gia phả tiên tiến nhất Việt Nam
                </div>

                {/* Hero Section */}
                <div className="guest-hero-container">
                    {/* Left Content */}
                    <div className="flex flex-col items-start">
                        <h1 className="guest-hero-title">
                            Khơi nguồn <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fe6e00] to-amber-400">gia phong,</span><br/>
                            kết nối thế hệ.
                        </h1>
                        <p className="guest-hero-desc">
                            Giải pháp toàn diện giúp dòng họ quản lý gia phả thông minh, minh bạch quỹ tài chính và không bao giờ bỏ lỡ các sự kiện quan trọng.
                        </p>
                        
                        <ul className="flex flex-col gap-5 mb-12">
                            <li className="guest-hero-list-item">
                                <div className="guest-hero-check-icon"><Check size={14} strokeWidth={3} /></div>
                                Giao diện thân thiện, đa nền tảng
                            </li>
                            <li className="guest-hero-list-item">
                                <div className="guest-hero-check-icon"><Check size={14} strokeWidth={3} /></div>
                                Dữ liệu bảo mật cấp doanh nghiệp
                            </li>
                            <li className="guest-hero-list-item">
                                <div className="guest-hero-check-icon"><Check size={14} strokeWidth={3} /></div>
                                Chuyển đổi số hoàn toàn sổ sách họ tộc
                            </li>
                        </ul>

                        <button onClick={() => onNavigate('login')} className="guest-btn-primary group" style={{ marginTop: '40px' }}>
                            <span className="relative z-10">Truy cập hệ thống</span>
                            <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    {/* Right Content - Visual Mockup */}
                    <div className="guest-mockup-container">
                        <img src="/hero_family_tree.png" alt="Phả hệ gia tộc Vũ Gia" className="w-full h-full object-cover rounded-2xl shadow-2xl transition-transform duration-700 hover:scale-[1.03]" />
                    </div>
                </div>

                {/* Features Grid */}
                <div className="guest-features-section">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-extrabold text-white mb-4">Mọi thứ bạn cần cho dòng họ</h2>
                        <p className="text-zinc-400 max-w-2xl mx-auto text-lg">Hệ sinh thái số hóa toàn diện được thiết kế chuyên biệt để gìn giữ, phát huy truyền thống và kết nối tình thân gia tộc.</p>
                    </div>
                    <div className="guest-features-grid">
                        {/* Feature Card 1 */}
                        <div className="guest-feature-card group hover:border-[#fe6e00]/30">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#fe6e00]/5 blur-3xl rounded-full group-hover:bg-[#fe6e00]/10 transition-colors"></div>
                            <div className="relative z-10 p-8 sm:p-10">
                                <div className="guest-feature-icon-wrapper bg-[#fe6e00]/10 border border-[#fe6e00]/20 text-[#fe6e00]">
                                    <Network size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#fe6e00] transition-colors">Cây gia phả trực quan</h3>
                                <p className="text-zinc-400 leading-relaxed">
                                    Vẽ sơ đồ phả hệ thông minh, kéo thả dễ dàng. Hiển thị chi tiết từng đời, từng nhánh với đồ họa đẹp mắt và dễ hiểu cho mọi lứa tuổi.
                                </p>
                            </div>
                        </div>

                        {/* Feature Card 2 */}
                        <div className="guest-feature-card group hover:border-emerald-500/30">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full group-hover:bg-emerald-500/10 transition-colors"></div>
                            <div className="relative z-10 p-8 sm:p-10">
                                <div className="guest-feature-icon-wrapper bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                                    <Landmark size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors">Quản lý quỹ họ minh bạch</h3>
                                <p className="text-zinc-400 leading-relaxed">
                                    Ghi chép và thống kê tự động các khoản thu chi. Hiển thị báo cáo tài chính rõ ràng, minh bạch cho toàn bộ thành viên dòng họ.
                                </p>
                            </div>
                        </div>

                        {/* Feature Card 3 */}
                        <div className="guest-feature-card group hover:border-blue-500/30">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full group-hover:bg-blue-500/10 transition-colors"></div>
                            <div className="relative z-10 p-8 sm:p-10">
                                <div className="guest-feature-icon-wrapper bg-blue-500/10 border border-blue-500/20 text-blue-500">
                                    <Calendar size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">Nhắc nhở sự kiện & Giỗ chạp</h3>
                                <p className="text-zinc-400 leading-relaxed">
                                    Tự động chuyển đổi ngày Âm - Dương. Gửi thông báo nhắc nhở ngày giỗ, sinh nhật, sự kiện họp họ trước thời gian thực.
                                </p>
                            </div>
                        </div>

                        {/* Feature Card 4 */}
                        <div className="guest-feature-card group hover:border-purple-500/30">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-3xl rounded-full group-hover:bg-purple-500/10 transition-colors"></div>
                            <div className="relative z-10 p-8 sm:p-10">
                                <div className="guest-feature-icon-wrapper bg-purple-500/10 border border-purple-500/20 text-purple-400">
                                    <Newspaper size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-400 transition-colors">Bảng tin gắn kết tình thân</h3>
                                <p className="text-zinc-400 leading-relaxed">
                                    Mạng xã hội riêng biệt của dòng họ. Nơi chia sẻ hình ảnh, lưu giữ kỷ niệm và các thông báo quan trọng đến từng thành viên.
                                </p>
                            </div>
                        </div>

                        {/* Feature Card 5 */}
                        <div className="guest-feature-card group hover:border-pink-500/30">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 blur-3xl rounded-full group-hover:bg-pink-500/10 transition-colors"></div>
                            <div className="relative z-10 p-8 sm:p-10">
                                <div className="guest-feature-icon-wrapper bg-pink-500/10 border border-pink-500/20 text-pink-400">
                                    <ShieldCheck size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-pink-400 transition-colors">Phân quyền đa tầng chặt chẽ</h3>
                                <p className="text-zinc-400 leading-relaxed">
                                    Hệ thống phân quyền linh hoạt theo vai vế: Trưởng họ, Trưởng chi, Thành viên thường. Đảm bảo dữ liệu được cập nhật đúng thẩm quyền.
                                </p>
                            </div>
                        </div>

                        {/* Feature Card 6 */}
                        <div className="guest-feature-card group hover:border-cyan-500/30">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full group-hover:bg-cyan-500/10 transition-colors"></div>
                            <div className="relative z-10 p-8 sm:p-10">
                                <div className="guest-feature-icon-wrapper bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                                    <Database size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors">Lưu trữ vĩnh cửu an toàn</h3>
                                <p className="text-zinc-400 leading-relaxed">
                                    Dữ liệu gia phả được số hóa và sao lưu trên hệ thống đám mây bảo mật cao, đảm bảo lưu truyền toàn vẹn cho muôn đời sau.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            
            <footer className="guest-footer">
                <div className="flex items-center justify-center mb-4">
                    <img src="/logo.png" className="w-6 h-6 opacity-50 mr-2" />
                    <span className="font-bold text-zinc-500">Vũ Gia</span>
                </div>
                <p className="text-sm text-zinc-500 font-medium tracking-wide">Copyright © 2026 by DangVQ - Kiến tạo tương lai dòng họ</p>
            </footer>
        </div>
    );
}
