import React, { useMemo } from 'react';
import { useTranslation } from '../../shared/hooks/useTranslation';
import { Solar } from '../../shared/utils/lunar.js';
import { ganZhiToViet, lunarMonthName } from '../../shared/utils/vietLunar.js';
import { getUpcomingBirthdays, getUpcomingAnniversaries } from '../calendar/utils/calendarHelpers';
import './HomePage.css';

export default function HomePage({ user, members, onNavigate, addToast }) {
    const { t } = useTranslation();

    // ── Time & Date Greetings ──
    const greetingText = useMemo(() => {
        const hr = new Date().getHours();
        if (hr < 12) return t('home.greeting_morning') || 'Chào buổi sáng';
        if (hr < 18) return t('home.greeting_afternoon') || 'Chào buổi chiều';
        return t('home.greeting_evening') || 'Chào buổi tối';
    }, [t]);

    const dateDisplay = useMemo(() => {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const solarStr = today.toLocaleDateString('vi-VN', options);
        
        let lunarStr = '';
        try {
            const solar = Solar.fromYmd(today.getFullYear(), today.getMonth() + 1, today.getDate());
            const lunar = solar.getLunar();
            const day = lunar.getDay();
            const month = lunar.getMonth();
            const yearGanZhi = ganZhiToViet(lunar.getYearInGanZhi());
            const monthName = lunarMonthName(month);
            lunarStr = `Ngày ${day} tháng ${monthName} năm ${yearGanZhi}`;
        } catch (e) {
            console.error('Error generating lunar date greeting:', e);
        }
        
        return { solar: solarStr, lunar: lunarStr };
    }, []);

    // ── Tree Stats ──
    const totalMembers = members.length;
    const totalGenerations = useMemo(() => {
        if (members.length === 0) return 0;
        return Math.max(...members.map(m => m.generation || 0), 0);
    }, [members]);

    // ── Upcoming Events ──
    const upcomingBirthdays = useMemo(() => getUpcomingBirthdays(members, 30), [members]);
    const upcomingAnniversaries = useMemo(() => getUpcomingAnniversaries(members, 30), [members]);

    const hasEvents = upcomingBirthdays.length > 0 || upcomingAnniversaries.length > 0;

    return (
        <div className="page-container home-page">
            {/* ── Welcome Hero Banner ── */}
            <div className="home-hero">
                <div className="home-hero-content">
                    <span className="home-hero-badge">🏛️ Gia tộc Vũ tộc</span>
                    <h1 className="home-hero-title">
                        {greetingText}, <span className="highlight">{user?.displayName || user?.username}</span>!
                    </h1>
                    <p className="home-hero-subtitle">
                        Chào mừng bạn trở lại không gian sinh hoạt số của Dòng Họ Vũ.
                    </p>
                    {dateDisplay.lunar && (
                        <div className="home-date-box">
                            <span className="solar-date">📅 {dateDisplay.solar}</span>
                            <span className="date-separator">|</span>
                            <span className="lunar-date">🌙 Âm lịch: {dateDisplay.lunar}</span>
                        </div>
                    )}
                </div>
                <div className="home-hero-decoration">
                    <div className="circle-glow glow-1"></div>
                    <div className="circle-glow glow-2"></div>
                </div>
            </div>

            {/* ── Quick Navigation Dashboard Grid ── */}
            <div className="home-section">
                <h3 className="section-title">✨ Tính năng chính</h3>
                <div className="home-grid">
                    <div className="home-card card-tree" onClick={() => onNavigate('tree')}>
                        <div className="card-icon">🌳</div>
                        <div className="card-body">
                            <h4>Phả đồ Dòng họ</h4>
                            <p>Khám phá sơ đồ phả hệ dòng họ Vũ, tra cứu nguồn cội và các nhánh gia tộc.</p>
                        </div>
                        <div className="card-action">Mở phả đồ →</div>
                    </div>

                    <div className="home-card card-newsfeed" onClick={() => onNavigate('newsfeed')}>
                        <div className="card-icon">📰</div>
                        <div className="card-body">
                            <h4>Bản tin Gia đình</h4>
                            <p>Cập nhật tin tức, hoạt động, thông báo quan trọng từ hội đồng dòng họ.</p>
                        </div>
                        <div className="card-action">Xem bản tin →</div>
                    </div>

                    <div className="home-card card-chat" onClick={() => onNavigate('chat')}>
                        <div className="card-icon">💬</div>
                        <div className="card-body">
                            <h4>Trò chuyện trực tuyến</h4>
                            <p>Nhắn tin tức thời, chia sẻ hình ảnh và gọi thoại/video nhóm miễn phí.</p>
                        </div>
                        <div className="card-action">Vào phòng chat →</div>
                    </div>

                    <div className="home-card card-calendar" onClick={() => onNavigate('calendar')}>
                        <div className="card-icon">📅</div>
                        <div className="card-body">
                            <h4>Lịch & Sự kiện</h4>
                            <p>Theo dõi ngày giỗ, sinh nhật thành viên và các sự kiện chung sắp diễn ra.</p>
                        </div>
                        <div className="card-action">Xem lịch →</div>
                    </div>

                    <div className="home-card card-finance" onClick={() => onNavigate('finance')}>
                        <div className="card-icon">💰</div>
                        <div className="card-body">
                            <h4>Quỹ Tài chính</h4>
                            <p>Quản lý các khoản đóng góp, báo cáo thu chi minh bạch của dòng họ.</p>
                        </div>
                        <div className="card-action">Xem tài chính →</div>
                    </div>
                </div>
            </div>

            {/* ── Bottom Section with Events and Stats ── */}
            <div className="home-bottom-layout">
                {/* Upcoming Events Column */}
                <div className="home-panel panel-events">
                    <div className="panel-header">
                        <h3>📅 Sự kiện gia tộc sắp tới (30 ngày)</h3>
                        <button className="panel-header-btn" onClick={() => onNavigate('calendar')}>Xem tất cả</button>
                    </div>
                    <div className="panel-body">
                        {!hasEvents ? (
                            <div className="empty-panel-state">
                                <span>🎉</span>
                                <p>Không có sự kiện quan trọng nào trong 30 ngày tới.</p>
                            </div>
                        ) : (
                            <div className="events-list">
                                {/* Anniversaries (Ngày Giỗ) */}
                                {upcomingAnniversaries.map((ann, i) => (
                                    <div key={`ann-${i}`} className="event-item type-anniversary">
                                        <div className="event-emoji">🕯️</div>
                                        <div className="event-info">
                                            <div className="event-name">
                                                Ngày giỗ <strong>{ann.member.name}</strong>
                                            </div>
                                            <div className="event-meta">
                                                <span>Âm lịch: {ann.lunarStr}</span>
                                                <span className="meta-dot">•</span>
                                                <span>Dương lịch: {ann.solarAnniversary}</span>
                                            </div>
                                        </div>
                                        <div className="event-countdown">
                                            {ann.daysUntil === 0 ? (
                                                <span className="badge badge-today">Hôm nay</span>
                                            ) : (
                                                <span className="badge badge-pending">Còn {ann.daysUntil} ngày</span>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Birthdays (Sinh Nhật) */}
                                {upcomingBirthdays.map((bd, i) => (
                                    <div key={`bd-${i}`} className="event-item type-birthday">
                                        <div className="event-emoji">🎂</div>
                                        <div className="event-info">
                                            <div className="event-name">
                                                Sinh nhật <strong>{bd.member.name}</strong>
                                            </div>
                                            <div className="event-meta">
                                                <span>Ngày sinh: {bd.fullDate}</span>
                                                {bd.age !== null && (
                                                    <>
                                                        <span className="meta-dot">•</span>
                                                        <span>Tuổi: {bd.age}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="event-countdown">
                                            {bd.daysUntil === 0 ? (
                                                <span className="badge badge-today">Hôm nay</span>
                                            ) : (
                                                <span className="badge badge-pending">Còn {bd.daysUntil} ngày</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Family Stats Column */}
                <div className="home-panel panel-stats">
                    <div className="panel-header">
                        <h3>📊 Thống kê Gia tộc</h3>
                    </div>
                    <div className="panel-body">
                        <div className="stats-metric-container">
                            <div className="metric-box">
                                <span className="metric-icon">👥</span>
                                <div className="metric-info">
                                    <span className="metric-value">{totalMembers}</span>
                                    <span className="metric-label">Thành viên gia phả</span>
                                </div>
                            </div>
                            <div className="metric-box">
                                <span className="metric-icon">🪜</span>
                                <div className="metric-info">
                                    <span className="metric-value">{totalGenerations}</span>
                                    <span className="metric-label">Thế hệ dòng họ</span>
                                </div>
                            </div>
                        </div>

                        <div className="stats-quote-box">
                            <span className="quote-mark">“</span>
                            <p className="quote-text">
                                Con người có tổ có tông,<br />
                                Như cây có cội, như sông có nguồn.
                            </p>
                            <span className="quote-author">— Ca dao Việt Nam</span>
                        </div>

                        <div className="stats-quick-guide" onClick={() => onNavigate('guide')}>
                            <span className="guide-icon">❓</span>
                            <div className="guide-body">
                                <h5>Hướng dẫn sử dụng hệ thống</h5>
                                <p>Xem ngay cách tương tác, chỉnh sửa gia phả, tạo phòng chat hoặc quỹ tài chính.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
