// guideData.js — Cấu trúc các mục hướng dẫn (CHỈ chứa key i18n, KHÔNG chứa text)
// Nội dung bản dịch nằm 100% trong locales/vi.json và locales/en.json

export const GUIDE_SECTIONS = [
    {
        id: 'tree',
        icon: '🌳',
        titleKey: 'guide.tree_title',
        descKey: 'guide.tree_desc',
        featureKeys: ['guide.tree_f1', 'guide.tree_f2', 'guide.tree_f3', 'guide.tree_f4'],
        adminKeys: ['guide.tree_a1', 'guide.tree_a2', 'guide.tree_a3']
    },
    {
        id: 'newsfeed',
        icon: '📰',
        titleKey: 'guide.newsfeed_title',
        descKey: 'guide.newsfeed_desc',
        featureKeys: ['guide.newsfeed_f1', 'guide.newsfeed_f2', 'guide.newsfeed_f3', 'guide.newsfeed_f4'],
        adminKeys: []
    },
    {
        id: 'chat',
        icon: '💬',
        titleKey: 'guide.chat_title',
        descKey: 'guide.chat_desc',
        featureKeys: ['guide.chat_f1', 'guide.chat_f2', 'guide.chat_f3', 'guide.chat_f4'],
        adminKeys: []
    },
    {
        id: 'calendar',
        icon: '📅',
        titleKey: 'guide.calendar_title',
        descKey: 'guide.calendar_desc',
        featureKeys: ['guide.calendar_f1', 'guide.calendar_f2', 'guide.calendar_f3'],
        adminKeys: []
    },
    {
        id: 'requests',
        icon: '📋',
        titleKey: 'guide.requests_title',
        descKey: 'guide.requests_desc',
        featureKeys: ['guide.requests_f1', 'guide.requests_f2', 'guide.requests_f3'],
        adminKeys: ['guide.requests_a1', 'guide.requests_a2']
    }
];
