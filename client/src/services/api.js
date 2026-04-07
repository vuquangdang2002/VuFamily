// API service layer
import { Solar, Lunar } from '../utils/lunar.js';
import { ganZhiToViet } from '../utils/vietLunar.js';

const API_BASE = '/api';

async function request(url, options = {}) {
    const res = await fetch(`${API_BASE}${url}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi server');
    return data;
}

export const api = {
    getMembers: () => request('/members'),
    getMember: (id) => request(`/members/${id}`),
    searchMembers: (q) => request(`/members/search?q=${encodeURIComponent(q)}`),
    getChildren: (id) => request(`/members/${id}/children`),
    createMember: (data) => request('/members', { method: 'POST', body: JSON.stringify(data) }),
    updateMember: (id, data) => request(`/members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteMember: (id) => request(`/members/${id}`, { method: 'DELETE' }),
    getStats: () => request('/stats'),
    getAchievements: (id) => request(`/members/${id}/achievements`),
    addAchievement: (data) => request('/achievements', { method: 'POST', body: JSON.stringify(data) }),
    deleteAchievement: (id) => request(`/achievements/${id}`, { method: 'DELETE' }),
};

// ====================================
// LOCAL-ONLY mode (localStorage fallback)
// ====================================
const STORAGE_KEY = 'vuFamilyTree';
const ACH_KEY = 'vuFamilyAchievements';

function getLocalData() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; }
}
function saveLocalData(members) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ members, updatedAt: new Date().toISOString() }));
}
function getLocalAch() {
    try { return JSON.parse(localStorage.getItem(ACH_KEY)) || []; } catch { return []; }
}
function saveLocalAch(achs) {
    localStorage.setItem(ACH_KEY, JSON.stringify(achs));
}

// Edit history & pending requests
const HISTORY_KEY = 'vuFamilyEditHistory';
const REQUESTS_KEY = 'vuFamilyPendingRequests';

function getLocalHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
}
function saveLocalHistory(history) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}
function getLocalRequests() {
    try { return JSON.parse(localStorage.getItem(REQUESTS_KEY)) || []; } catch { return []; }
}
function saveLocalRequests(requests) {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
}

// Helper: extract year from date string
function yearFromDate(dateStr) {
    if (!dateStr) return null;
    const y = parseInt(dateStr);
    return isNaN(y) ? null : y;
}

// Format date for display
export function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
}

// Tính ngày âm lịch chuẩn bằng lunar-javascript
export function getLunarDateString(solarDateStr) {
    if (!solarDateStr) return null;
    const parts = solarDateStr.split('-');
    if (parts.length !== 3) return null;

    try {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

        const solar = Solar.fromYmd(year, month, day);
        const lunar = solar.getLunar();

        // Format: Ngày 15 tháng 08 năm Canh Tý (1960)
        const lDay = lunar.getDay() < 10 ? '0' + lunar.getDay() : lunar.getDay();
        const lMonth = lunar.getMonth() < 10 ? '0' + Math.abs(lunar.getMonth()) : Math.abs(lunar.getMonth());
        const isLeap = lunar.getMonth() < 0 ? ' (Nhuận)' : '';
        const canChiYear = ganZhiToViet(lunar.getYearInGanZhi());
        const lunarYear = lunar.getYear();

        return `${lDay}/${lMonth}/${lunarYear}-${isLeap}(năm ${canChiYear})`;
    } catch (e) {
        return null;
    }
}


const SAMPLE_MEMBERS = [
    { id: '1', name: 'Vũ Văn Tổ', gender: 1, birthDate: '1900-01-15', birthTime: null, deathDate: '1975-08-20', birthPlace: 'Hà Nam', deathPlace: 'Hà Nam', note: 'Cụ Tổ - Thế hệ thứ nhất', spouseId: '2', parentId: null, generation: 1, birthOrder: null, childType: 'biological', phone: '', email: '', address: '', occupation: 'Nông dân', photo: '' },
    { id: '2', name: 'Nguyễn Thị Tổ', gender: 0, birthDate: '1905-03-10', birthTime: null, deathDate: '1980-12-05', birthPlace: 'Hà Nam', deathPlace: 'Hà Nam', note: 'Cụ Bà', spouseId: '1', parentId: null, generation: 1, birthOrder: null, childType: 'biological', phone: '', email: '', address: '', occupation: '', photo: '' },
    { id: '3', name: 'Vũ Văn An', gender: 1, birthDate: '1930-05-20', birthTime: '06:30', deathDate: '2005-11-15', birthPlace: 'Hà Nam', deathPlace: 'Hà Nội', note: 'Con trưởng', spouseId: '4', parentId: '1', generation: 2, birthOrder: 1, childType: 'biological', phone: '', email: '', address: '', occupation: 'Giáo viên', photo: '' },
    { id: '4', name: 'Trần Thị Bình', gender: 0, birthDate: '1934-09-08', birthTime: null, deathDate: '2010-03-22', birthPlace: 'Nam Định', deathPlace: 'Hà Nội', note: '', spouseId: '3', parentId: null, generation: 2, birthOrder: null, childType: 'biological', phone: '', email: '', address: '', occupation: '', photo: '' },
    { id: '5', name: 'Vũ Văn Bảo', gender: 1, birthDate: '1935-07-12', birthTime: '08:00', deathDate: '2015-06-18', birthPlace: 'Hà Nam', deathPlace: 'Hà Nội', note: 'Con thứ hai', spouseId: '6', parentId: '1', generation: 2, birthOrder: 2, childType: 'biological', phone: '', email: '', address: '', occupation: 'Bộ đội', photo: '' },
    { id: '6', name: 'Lê Thị Cúc', gender: 0, birthDate: '1938-11-25', birthTime: null, deathDate: null, birthPlace: 'Hà Nội', deathPlace: '', note: '', spouseId: '5', parentId: null, generation: 2, birthOrder: null, childType: 'biological', phone: '', email: '', address: 'Hà Nội', occupation: '', photo: '' },
    { id: '7', name: 'Vũ Thị Chi', gender: 0, birthDate: '1940-04-03', birthTime: null, deathDate: null, birthPlace: 'Hà Nam', deathPlace: '', note: 'Con gái út', spouseId: null, parentId: '1', generation: 2, birthOrder: 3, childType: 'biological', phone: '', email: '', address: '', occupation: 'Y tá', photo: '' },
    { id: '8', name: 'Vũ Đăng Dũng', gender: 1, birthDate: '1958-02-14', birthTime: '05:15', deathDate: null, birthPlace: 'Hà Nội', deathPlace: '', note: '', spouseId: '9', parentId: '3', generation: 3, birthOrder: 1, childType: 'biological', phone: '0912345678', email: '', address: 'Hà Nội', occupation: 'Kỹ sư', photo: '' },
    { id: '9', name: 'Phạm Thị Hoa', gender: 0, birthDate: '1960-08-30', birthTime: null, deathDate: null, birthPlace: 'Hải Phòng', deathPlace: '', note: '', spouseId: '8', parentId: null, generation: 3, birthOrder: null, childType: 'biological', phone: '', email: '', address: 'Hà Nội', occupation: 'Kế toán', photo: '' },
    { id: '10', name: 'Vũ Văn Em', gender: 1, birthDate: '1962-12-01', birthTime: '07:45', deathDate: null, birthPlace: 'Hà Nội', deathPlace: '', note: '', spouseId: '11', parentId: '3', generation: 3, birthOrder: 2, childType: 'biological', phone: '', email: '', address: 'Hà Nội', occupation: 'Bác sĩ', photo: '' },
    { id: '11', name: 'Đỗ Thị Giang', gender: 0, birthDate: '1965-06-18', birthTime: null, deathDate: null, birthPlace: 'Hà Nội', deathPlace: '', note: '', spouseId: '10', parentId: null, generation: 3, birthOrder: null, childType: 'biological', phone: '', email: '', address: 'Hà Nội', occupation: 'Giáo viên', photo: '' },
    { id: '12', name: 'Vũ Minh Hoàng', gender: 1, birthDate: '1960-10-05', birthTime: '14:30', deathDate: null, birthPlace: 'Hà Nội', deathPlace: '', note: '', spouseId: '13', parentId: '5', generation: 3, birthOrder: 1, childType: 'biological', phone: '', email: '', address: 'TP.HCM', occupation: 'Doanh nhân', photo: '' },
    { id: '13', name: 'Ngô Thị Lan', gender: 0, birthDate: '1963-03-22', birthTime: null, deathDate: null, birthPlace: 'Bắc Ninh', deathPlace: '', note: '', spouseId: '12', parentId: null, generation: 3, birthOrder: null, childType: 'biological', phone: '', email: '', address: 'TP.HCM', occupation: '', photo: '' },
    { id: '14', name: 'Vũ Đăng Khoa', gender: 1, birthDate: '1985-09-15', birthTime: '10:20', deathDate: null, birthPlace: 'Hà Nội', deathPlace: '', note: '', spouseId: '15', parentId: '8', generation: 4, birthOrder: 1, childType: 'biological', phone: '0987654321', email: 'khoa@email.com', address: 'Hà Nội', occupation: 'Lập trình viên', photo: '' },
    { id: '15', name: 'Hoàng Thị Mai', gender: 0, birthDate: '1988-01-28', birthTime: null, deathDate: null, birthPlace: 'Hà Nội', deathPlace: '', note: '', spouseId: '14', parentId: null, generation: 4, birthOrder: null, childType: 'biological', phone: '', email: '', address: 'Hà Nội', occupation: 'Thiết kế', photo: '' },
    { id: '16', name: 'Vũ Thị Ngọc', gender: 0, birthDate: '1988-07-07', birthTime: '16:00', deathDate: null, birthPlace: 'Hà Nội', deathPlace: '', note: '', spouseId: null, parentId: '8', generation: 4, birthOrder: 2, childType: 'biological', phone: '', email: '', address: 'Hà Nội', occupation: 'Dược sĩ', photo: '' },
    { id: '17', name: 'Vũ Minh Phúc', gender: 1, birthDate: '1990-04-12', birthTime: null, deathDate: null, birthPlace: 'Hà Nội', deathPlace: '', note: '', spouseId: null, parentId: '10', generation: 4, birthOrder: 1, childType: 'biological', phone: '', email: '', address: 'Đà Nẵng', occupation: 'Kiến trúc sư', photo: '' },
    { id: '18', name: 'Vũ Hoàng Quân', gender: 1, birthDate: '1988-11-20', birthTime: null, deathDate: null, birthPlace: 'Hà Nội', deathPlace: '', note: '', spouseId: null, parentId: '12', generation: 4, birthOrder: 1, childType: 'biological', phone: '', email: '', address: 'TP.HCM', occupation: 'Luật sư', photo: '' },
    { id: '19', name: 'Vũ Gia Bảo', gender: 1, birthDate: '2015-06-01', birthTime: '09:30', deathDate: null, birthPlace: 'Hà Nội', deathPlace: '', note: '', spouseId: null, parentId: '14', generation: 5, birthOrder: 1, childType: 'biological', phone: '', email: '', address: 'Hà Nội', occupation: 'Học sinh', photo: '' },
];

const SAMPLE_ACHIEVEMENTS = [
    { id: '1', memberId: '3', category: 'education', title: 'Tốt nghiệp Đại học Sư phạm', organization: 'Đại học Sư phạm Hà Nội', startYear: 1948, endYear: 1952, description: 'Bằng giỏi' },
    { id: '2', memberId: '5', category: 'work', title: 'Phục vụ trong quân đội', organization: 'QĐND Việt Nam', startYear: 1955, endYear: 1975, description: 'Đại úy' },
    { id: '3', memberId: '5', category: 'award', title: 'Huân chương chiến sĩ vẻ vang', organization: 'Nhà nước', startYear: 1975, endYear: null, description: 'Hạng Nhất' },
    { id: '4', memberId: '8', category: 'education', title: 'Tốt nghiệp Kỹ sư Xây dựng', organization: 'ĐH Xây dựng HN', startYear: 1976, endYear: 1981, description: '' },
    { id: '5', memberId: '8', category: 'work', title: 'Kỹ sư trưởng', organization: 'Công ty XD Số 1', startYear: 1981, endYear: 2018, description: '' },
    { id: '6', memberId: '8', category: 'social', title: 'Bí thư chi bộ', organization: 'Đảng CSVN', startYear: 1990, endYear: 2010, description: '' },
    { id: '7', memberId: '10', category: 'education', title: 'Tiến sĩ Y khoa', organization: 'ĐH Y Hà Nội', startYear: 1980, endYear: 1992, description: 'Chuyên khoa Ngoại' },
    { id: '8', memberId: '14', category: 'education', title: 'Cử nhân CNTT', organization: 'ĐH Bách Khoa HN', startYear: 2003, endYear: 2008, description: 'Bằng giỏi' },
    { id: '9', memberId: '14', category: 'work', title: 'Tech Lead', organization: 'Startup ABC', startYear: 2015, endYear: null, description: 'Đồng sáng lập' },
    { id: '10', memberId: '14', category: 'social', title: 'Bí thư chi đoàn', organization: 'Đoàn TNCS HCM', startYear: 2003, endYear: 2008, description: 'Đoàn viên ưu tú' },
];

let _nextId = 20;
let _nextAchId = 11;

export const localApi = {
    getMembers() {
        const data = getLocalData();
        const baseMembers = data?.members || SAMPLE_MEMBERS;
        return baseMembers.map(m => ({
            ...m,
            deathDateLunar: getLunarDateString(m.deathDate)
        }));
    },

    getMember(id) {
        return this.getMembers().find(m => m.id === String(id)) || null;
    },

    search(query) {
        const q = query.toLowerCase();
        return this.getMembers().filter(m =>
            m.name.toLowerCase().includes(q) ||
            (m.birthPlace && m.birthPlace.toLowerCase().includes(q)) ||
            (m.note && m.note.toLowerCase().includes(q)) ||
            (m.occupation && m.occupation.toLowerCase().includes(q))
        );
    },

    getChildren(parentId) {
        return this.getMembers().filter(m => m.parentId === String(parentId));
    },

    getSpouse(member) {
        if (!member?.spouseId) return null;
        return this.getMember(member.spouseId);
    },

    create(data, user) {
        const members = this.getMembers();
        const id = String(_nextId++);
        const member = { ...data, id };
        members.push(member);
        if (member.spouseId) {
            const spouse = members.find(m => m.id === member.spouseId);
            if (spouse) spouse.spouseId = id;
        }
        saveLocalData(members);
        // Record history
        if (user) {
            this.addHistory({
                memberId: id, memberName: member.name, action: 'create',
                before: null, after: { ...member },
                editedBy: user.username, editedByName: user.displayName || user.username,
            });
        }
        return member;
    },

    update(id, data, user) {
        const members = this.getMembers();
        const idx = members.findIndex(m => m.id === String(id));
        if (idx === -1) return null;
        const old = { ...members[idx] }; // snapshot before
        if (old.spouseId && old.spouseId !== data.spouseId) {
            const oldSpouse = members.find(m => m.id === old.spouseId);
            if (oldSpouse) oldSpouse.spouseId = null;
        }
        members[idx] = { ...old, ...data, id: String(id) };
        if (data.spouseId) {
            const spouse = members.find(m => m.id === data.spouseId);
            if (spouse) spouse.spouseId = String(id);
        }
        saveLocalData(members);
        // Record history
        if (user) {
            this.addHistory({
                memberId: String(id), memberName: members[idx].name, action: 'update',
                before: old, after: { ...members[idx] },
                editedBy: user.username, editedByName: user.displayName || user.username,
            });
        }
        return members[idx];
    },

    delete(id, user) {
        let members = this.getMembers();
        const member = members.find(m => m.id === String(id));
        if (!member) return false;
        const snapshot = { ...member }; // snapshot before delete
        if (member.spouseId) {
            const spouse = members.find(m => m.id === member.spouseId);
            if (spouse) spouse.spouseId = null;
        }
        members.forEach(m => { if (m.parentId === String(id)) m.parentId = null; });
        members = members.filter(m => m.id !== String(id));
        let achs = this.getAchievements();
        achs = achs.filter(a => a.memberId !== String(id));
        saveLocalAch(achs);
        saveLocalData(members);
        // Record history
        if (user) {
            this.addHistory({
                memberId: String(id), memberName: snapshot.name, action: 'delete',
                before: snapshot, after: null,
                editedBy: user.username, editedByName: user.displayName || user.username,
            });
        }
        return true;
    },

    // ════════════ EDIT HISTORY ════════════

    addHistory(entry) {
        const history = getLocalHistory();
        history.unshift({
            id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            ...entry,
            editedAt: new Date().toISOString(),
        });
        // Keep max 200 entries
        if (history.length > 200) history.length = 200;
        saveLocalHistory(history);
    },

    getEditHistory() {
        return getLocalHistory();
    },

    revertHistory(historyId, user) {
        const history = getLocalHistory();
        const entry = history.find(h => h.id === historyId);
        if (!entry) return { success: false, message: 'Không tìm thấy bản ghi lịch sử.' };

        if (entry.action === 'update') {
            if (!entry.before) return { success: false, message: 'Không có dữ liệu trước đó để hoàn tác.' };
            this.update(entry.memberId, entry.before, user ? { ...user, displayName: `${user.displayName} (hoàn tác)` } : null);
            return { success: true, message: `Đã hoàn tác thay đổi của "${entry.memberName}".` };
        }
        if (entry.action === 'create') {
            this.delete(entry.memberId, user ? { ...user, displayName: `${user.displayName} (hoàn tác)` } : null);
            return { success: true, message: `Đã hoàn tác việc thêm "${entry.memberName}".` };
        }
        if (entry.action === 'delete') {
            if (!entry.before) return { success: false, message: 'Không có dữ liệu để khôi phục.' };
            const members = this.getMembers();
            members.push(entry.before);
            saveLocalData(members);
            if (user) {
                this.addHistory({
                    memberId: entry.memberId, memberName: entry.memberName, action: 'create',
                    before: null, after: entry.before,
                    editedBy: user.username, editedByName: `${user.displayName} (hoàn tác)`,
                });
            }
            return { success: true, message: `Đã khôi phục "${entry.memberName}".` };
        }
        return { success: false, message: 'Loại thao tác không hợp lệ.' };
    },

    // ════════════ PENDING REQUESTS ════════════

    submitRequest(memberId, changes, user, note = '') {
        const member = this.getMember(memberId);
        if (!member) return { success: false, message: 'Không tìm thấy thành viên.' };
        const requests = getLocalRequests();
        const req = {
            id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            memberId: String(memberId),
            memberName: member.name,
            before: { ...member },
            changes,
            requestedBy: user.username,
            requestedByName: user.displayName || user.username,
            requestedAt: new Date().toISOString(),
            note,
            status: 'pending',
        };
        requests.unshift(req);
        saveLocalRequests(requests);
        return { success: true, message: `Đã gửi yêu cầu cập nhật "${member.name}" cho Admin duyệt.`, request: req };
    },

    getPendingRequests() {
        return getLocalRequests().filter(r => r.status === 'pending');
    },

    getAllRequests() {
        return getLocalRequests();
    },

    approveRequest(requestId, adminUser) {
        const requests = getLocalRequests();
        const req = requests.find(r => r.id === requestId);
        if (!req) return { success: false, message: 'Không tìm thấy yêu cầu.' };
        if (req.status !== 'pending') return { success: false, message: 'Yêu cầu này đã được xử lý.' };

        // Apply changes
        this.update(req.memberId, req.changes, {
            username: req.requestedBy,
            displayName: `${req.requestedByName} (duyệt bởi ${adminUser?.displayName || adminUser?.username || 'Admin'})`,
        });
        req.status = 'approved';
        req.reviewedBy = adminUser?.username || 'admin';
        req.reviewedAt = new Date().toISOString();
        saveLocalRequests(requests);
        return { success: true, message: `Đã duyệt yêu cầu của ${req.requestedByName} cho "${req.memberName}".` };
    },

    rejectRequest(requestId, adminUser, reason = '') {
        const requests = getLocalRequests();
        const req = requests.find(r => r.id === requestId);
        if (!req) return { success: false, message: 'Không tìm thấy yêu cầu.' };
        if (req.status !== 'pending') return { success: false, message: 'Yêu cầu này đã được xử lý.' };

        req.status = 'rejected';
        req.reviewedBy = adminUser?.username || 'admin';
        req.reviewedAt = new Date().toISOString();
        req.rejectReason = reason;
        saveLocalRequests(requests);
        return { success: true, message: `Đã từ chối yêu cầu của ${req.requestedByName} cho "${req.memberName}".` };
    },

    // Achievements
    getAchievements(memberId) {
        const all = getLocalAch();
        if (all.length === 0 && !localStorage.getItem(ACH_KEY)) {
            saveLocalAch(SAMPLE_ACHIEVEMENTS);
            return memberId ? SAMPLE_ACHIEVEMENTS.filter(a => a.memberId === String(memberId)) : SAMPLE_ACHIEVEMENTS;
        }
        return memberId ? all.filter(a => a.memberId === String(memberId)) : all;
    },

    addAchievement(data) {
        const achs = this.getAchievements();
        const id = String(_nextAchId++);
        const ach = { ...data, id };
        achs.push(ach);
        saveLocalAch(achs);
        return ach;
    },

    deleteAchievement(id) {
        let achs = this.getAchievements();
        achs = achs.filter(a => a.id !== String(id));
        saveLocalAch(achs);
        return true;
    },

    getStats() {
        const members = this.getMembers();
        const maxGen = Math.max(...members.map(m => m.generation || 0), 0);
        return { totalMembers: members.length, totalGenerations: maxGen };
    },

    async exportJSON() {
        const members = this.getMembers();
        const achievements = this.getAchievements();
        const data = { meta: { familyName: 'Vũ', exportedAt: new Date().toISOString() }, members, achievements };
        const jsonStr = JSON.stringify(data, null, 2);
        const fileName = `gia-pha-vu-${new Date().toISOString().slice(0, 10)}.json`;

        // Modern: show native save dialog
        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{ description: 'JSON File', accept: { 'application/json': ['.json'] } }],
                });
                const writable = await handle.createWritable();
                await writable.write(jsonStr);
                await writable.close();
                return;
            } catch (e) {
                if (e.name === 'AbortError') return; // User cancelled
            }
        }

        // Fallback: auto download
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    async importJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (!data.members || !Array.isArray(data.members)) return reject(new Error('Dữ liệu không hợp lệ'));
                    saveLocalData(data.members);
                    if (data.achievements) saveLocalAch(data.achievements);
                    resolve(data.members);
                } catch { reject(new Error('File JSON không hợp lệ')); }
            };
            reader.onerror = () => reject(new Error('Không thể đọc file'));
            reader.readAsText(file);
        });
    },

    resetData() {
        saveLocalData(SAMPLE_MEMBERS);
        saveLocalAch(SAMPLE_ACHIEVEMENTS);
        return SAMPLE_MEMBERS;
    },

    // ════════════ NEWSFEED POSTS ════════════
    getPosts() {
        try { return JSON.parse(localStorage.getItem('vuFamilyPosts')) || []; } catch { return []; }
    },
    savePosts(posts) {
        localStorage.setItem('vuFamilyPosts', JSON.stringify(posts));
    },
    createPost(data, user) {
        const posts = this.getPosts();
        const post = {
            id: `p_${Date.now()}`,
            content: data.content,
            author: user.displayName || user.username,
            authorRole: user.role,
            createdAt: new Date().toISOString(),
        };
        posts.unshift(post);
        this.savePosts(posts);
        return post;
    },
    deletePost(postId) {
        const posts = this.getPosts().filter(p => p.id !== postId);
        this.savePosts(posts);
    },

    // ════════════ CONTACT LINKS ════════════
    // ⬇️ Giá trị mặc định — sửa tại đây nếu cần ⬇️
    _DEFAULT_ZALO_URL: 'https://www.facebook.com/dangvq.it',
    _DEFAULT_FACEBOOK_URL: 'https://www.facebook.com/dangvq.it',
    _DEFAULT_MESSENGER_URL: 'https://www.facebook.com/dangvq.it',

    getContacts() {
        const CONTACTS_KEY = 'vuFamilyContacts';
        const defaultMap = {
            c_zalo: { type: 'zalo', name: 'Nhóm Zalo', url: this._DEFAULT_ZALO_URL },
            c_facebook: { type: 'facebook', name: 'Nhóm Facebook', url: this._DEFAULT_FACEBOOK_URL },
            c_messenger: { type: 'messenger', name: 'Nhóm Messenger', url: this._DEFAULT_MESSENGER_URL },
        };
        try {
            let data = JSON.parse(localStorage.getItem(CONTACTS_KEY)) || [];
            // Deduplicate by type first
            const seenTypes = new Set();
            data = data.filter(c => {
                if (seenTypes.has(c.type)) return false;
                seenTypes.add(c.type);
                return true;
            });
            // Ensure all 3 defaults exist (by type, not just id)
            const existingTypes = new Set(data.map(c => c.type));
            for (const [id, def] of Object.entries(defaultMap)) {
                if (!existingTypes.has(def.type)) {
                    data.push({ id, ...def });
                }
            }
            localStorage.setItem(CONTACTS_KEY, JSON.stringify(data));
            // Fill empty URLs with defaults
            return data.map(c => ({
                ...c,
                url: c.url || (defaultMap[c.id]?.url || ''),
            }));
        } catch { return Object.entries(defaultMap).map(([id, v]) => ({ id, ...v })); }
    },
    saveContacts(contacts) {
        localStorage.setItem('vuFamilyContacts', JSON.stringify(contacts));
    },
    createContact(data) {
        const contacts = this.getContacts();
        const contact = { id: `c_${Date.now()}`, ...data };
        contacts.push(contact);
        this.saveContacts(contacts);
        return contact;
    },
    updateContact(id, data) {
        const contacts = this.getContacts();
        const idx = contacts.findIndex(c => c.id === id);
        if (idx === -1) return null;
        contacts[idx] = { ...contacts[idx], ...data };
        this.saveContacts(contacts);
        return contacts[idx];
    },
    deleteContact(id) {
        const contacts = this.getContacts().filter(c => c.id !== id);
        this.saveContacts(contacts);
    },
};
