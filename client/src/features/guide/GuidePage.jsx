import React, { useState } from 'react';
import './GuidePage.css';

const GUIDE_SECTIONS = [
    {
        id: 'tree',
        icon: '🌳',
        title: 'Sơ đồ Gia Phả',
        desc: 'Trái tim của hệ thống, nơi hiển thị toàn bộ cây phả hệ của dòng họ.',
        features: [
            'Vuốt, kéo và thu phóng để xem toàn bộ sơ đồ gia phả một cách bao quát.',
            'Bấm vào hình đại diện của một thành viên để xem thông tin chi tiết (ngày sinh, nghề nghiệp, nơi ở...).',
            'Sử dụng thanh công cụ bên phải màn hình để phóng to, thu nhỏ hoặc tự động căn chỉnh sơ đồ.',
            'Bấm vào khung "Tìm kiếm thành viên..." trên thanh điều hướng để tra cứu nhanh họ tên hoặc nghề nghiệp của bất kỳ ai.',
        ],
        adminFeatures: [
            'Bấm nút "Cập nhật" trong bảng chi tiết để sửa thông tin thành viên.',
            'Nút "Thêm con" / "Thêm vợ/chồng" để mở rộng nhánh gia đình.',
            'Thao tác sẽ được áp dụng ngay lập tức trên hệ thống.'
        ]
    },
    {
        id: 'newsfeed',
        icon: '📰',
        title: 'Bảng tin (Newsfeed)',
        desc: 'Không gian sinh hoạt số của dòng họ, tương tự như mạng xã hội nội bộ.',
        features: [
            'Cập nhật các thông báo quan trọng, chia sẻ tin vui, lời hỏi thăm đến toàn thể gia đình.',
            'Bấm nút "Thích", "Thả tim", "Haha"... và để lại bình luận để tương tác với bài viết của người khác.',
            'Xem danh sách các thành viên sắp đến sinh nhật ở góc phải màn hình để gửi lời chúc sớm.',
            'Chuyển sang tab "Liên hệ" để lưu trữ và truy cập nhanh Zalo/Facebook/Số điện thoại của các thành viên.'
        ],
        adminFeatures: []
    },
    {
        id: 'chat',
        icon: '💬',
        title: 'Trò chuyện & Gọi thoại',
        desc: 'Hệ thống liên lạc thời gian thực nội bộ bảo mật 100%.',
        features: [
            'Nhắn tin tức thời (Real-time Chat) với bất kỳ thành viên nào hoặc chat trong nhóm chung của dòng họ.',
            'Gửi hình ảnh, tệp tin và emoji nhanh chóng.',
            'Nhấn nút 📞 (Gọi thoại) hoặc 📹 (Gọi video) góc phải khung chat để gọi điện trực tiếp miễn phí chất lượng cao.',
            'Khi có người gọi đến, màn hình sẽ hiển thị chuông báo, bạn có thể nghe hoặc từ chối dễ dàng.'
        ],
        adminFeatures: []
    },
    {
        id: 'calendar',
        icon: '📅',
        title: 'Lịch & Sự kiện',
        desc: 'Theo dõi ngày giỗ, ngày lễ, sinh nhật.',
        features: [
            'Lịch hiển thị tổng hợp tự động tất cả ngày sinh nhật (dương lịch) và ngày giỗ (âm lịch/dương lịch) của các thành viên.',
            'Bấm vào một ngày được tô màu để xem chi tiết danh sách sự kiện trong ngày đó.',
            'Giúp bạn không bao giờ bỏ lỡ các dịp kỷ niệm hoặc giỗ chạp quan trọng của dòng họ.'
        ],
        adminFeatures: []
    },
    {
        id: 'requests',
        icon: '📋',
        title: 'Quyền hạn & Chỉnh sửa',
        desc: 'Cơ chế đóng góp thông tin an toàn.',
        features: [
            'Người dùng với quyền "Khách xem" (Viewer) không thể sửa dữ liệu trực tiếp để tránh làm hỏng sơ đồ.',
            'Nếu thấy thông tin sai sót hoặc muốn thêm người mới, hãy bấm "Cập nhật" -> điền thông tin và "Gửi yêu cầu".',
            'Ban quản trị sẽ nhận được thông báo yêu cầu của bạn, họ sẽ xem xét và bấm "Duyệt" để áp dụng lên gia phả.'
        ],
        adminFeatures: [
            'Quản trị viên và Biên tập viên có thể sửa trực tiếp mà không cần duyệt.',
            'Tab "Yêu cầu chỉnh sửa" sẽ hiện lên số thông báo đỏ khi có người gửi đề xuất. Hãy vào đó để duyệt (Accept) hoặc từ chối (Reject).'
        ]
    }
];

export default function GuidePage({ user, onNavigate }) {
    const isAdminOrEditor = user?.role === 'admin' || user?.role === 'editor';
    const [activeSection, setActiveSection] = useState('tree');

    return (
        <div className="page-container" style={{ padding: '32px' }}>
            <div className="guide-header">
                <h1>📚 Hướng dẫn sử dụng VuFamily</h1>
                <p>Khám phá các tính năng và cách tương tác với hệ thống Gia phả Điện tử chuyên nghiệp.</p>
            </div>

            <div className="guide-layout">
                {/* Sidebar Menu */}
                <div className="guide-sidebar">
                    {GUIDE_SECTIONS.map(sec => (
                        <button
                            key={sec.id}
                            className={`guide-nav-btn ${activeSection === sec.id ? 'active' : ''}`}
                            onClick={() => setActiveSection(sec.id)}
                        >
                            <span className="guide-nav-icon">{sec.icon}</span>
                            <span>{sec.title}</span>
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="guide-content">
                    {GUIDE_SECTIONS.map(sec => (
                        <div
                            key={sec.id}
                            className={`guide-section ${activeSection === sec.id ? 'active' : ''}`}
                        >
                            <div className="guide-section-header">
                                <h2>{sec.icon} {sec.title}</h2>
                                <p className="guide-section-desc">{sec.desc}</p>
                            </div>

                            <div className="guide-card">
                                <h3>✨ Tính năng chính</h3>
                                <ul className="guide-list">
                                    {sec.features.map((f, i) => (
                                        <li key={i}>{f}</li>
                                    ))}
                                </ul>

                                {isAdminOrEditor && sec.adminFeatures.length > 0 && (
                                    <div className="guide-admin-block">
                                        <h4>👑 Dành riêng cho Quản trị viên / Biên tập viên</h4>
                                        <ul className="guide-list admin">
                                            {sec.adminFeatures.map((f, i) => (
                                                <li key={i}>{f}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            
                            <div className="guide-action">
                                <button className="btn btn-primary" onClick={() => onNavigate(sec.id)}>
                                    Mở tính năng này ngay ➔
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
