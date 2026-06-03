// localApi.js - Local-only mode (localStorage fallback simulator)
import { Solar, Lunar } from '../utils/lunar.js';
import { ganZhiToViet } from '../utils/vietLunar.js';
import { 
    SAMPLE_MEMBERS, SAMPLE_ACHIEVEMENTS, 
    SAMPLE_POSTS, SAMPLE_REQUESTS, SAMPLE_HISTORY 
} from './sampleData.js';

const STORAGE_KEY = 'vuFamilyTree';
const ACH_KEY = 'vuFamilyAchievements';
const HISTORY_KEY = 'vuFamilyEditHistory';
const REQUESTS_KEY = 'vuFamilyPendingRequests';

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
function getLocalHistory() {
    try {
        const hist = JSON.parse(localStorage.getItem(HISTORY_KEY));
        if (hist && hist.length > 0) return hist;
    } catch (e) {}
    if (!localStorage.getItem(HISTORY_KEY)) saveLocalHistory(SAMPLE_HISTORY);
    return [...SAMPLE_HISTORY];
}
function saveLocalHistory(history) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}
function getLocalRequests() {
    try {
        const reqs = JSON.parse(localStorage.getItem(REQUESTS_KEY));
        if (reqs && reqs.length > 0) return reqs;
    } catch (e) {}
    if (!localStorage.getItem(REQUESTS_KEY)) saveLocalRequests(SAMPLE_REQUESTS);
    return [...SAMPLE_REQUESTS];
}
function saveLocalRequests(requests) {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
}

export function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
}

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
        const lDay = lunar.getDay() < 10 ? '0' + lunar.getDay() : lunar.getDay();
        const lMonth = lunar.getMonth() < 10 ? '0' + Math.abs(lunar.getMonth()) : Math.abs(lunar.getMonth());
        const isLeap = lunar.getMonth() < 0 ? ' (Nhuận)' : '';
        const canChiYear = ganZhiToViet(lunar.getYearInGanZhi());
        const lunarYear = lunar.getYear();

        return `${lDay}/${lMonth}/${lunarYear}-${isLeap}(năm ${canChiYear})`;
    } catch (e) { return null; }
}

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
        if (user) {
            this.addHistory({
                memberId: id, memberName: member.name, action: 'create',
                before: null, after: { ...member },
                editedById: user.id || null, editedByUsername: user.username, editedByName: user.displayName || user.username,
            });
        }
        return member;
    },

    update(id, data, user) {
        const members = this.getMembers();
        const idx = members.findIndex(m => m.id === String(id));
        if (idx === -1) return null;
        const old = { ...members[idx] };
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
        if (user) {
            this.addHistory({
                memberId: String(id), memberName: members[idx].name, action: 'update',
                before: old, after: { ...members[idx] },
                editedById: user.id || null, editedByUsername: user.username, editedByName: user.displayName || user.username,
            });
        }
        return members[idx];
    },

    delete(id, user) {
        let members = this.getMembers();
        const member = members.find(m => m.id === String(id));
        if (!member) return false;
        const snapshot = { ...member };
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
        if (user) {
            this.addHistory({
                memberId: String(id), memberName: snapshot.name, action: 'delete',
                before: snapshot, after: null,
                editedById: user.id || null, editedByUsername: user.username, editedByName: user.displayName || user.username,
            });
        }
        return true;
    },

    addHistory(entry) {
        const history = getLocalHistory();
        history.unshift({
            id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            ...entry,
            editedAt: new Date().toISOString(),
        });
        if (history.length > 200) history.length = 200;
        saveLocalHistory(history);
    },

    getEditHistory() { return getLocalHistory(); },

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
            requestedById: user.id || null,
            requestedByUsername: user.username,
            requestedByName: user.displayName || user.username,
            requestedAt: new Date().toISOString(),
            note,
            status: 'pending',
        };
        requests.unshift(req);
        saveLocalRequests(requests);
        return { success: true, message: `Đã gửi yêu cầu cập nhật "${member.name}" cho Admin duyệt.`, request: req };
    },

    getPendingRequests() { return getLocalRequests().filter(r => r.status === 'pending'); },
    getAllRequests() { return getLocalRequests(); },

    approveRequest(requestId, adminUser) {
        const requests = getLocalRequests();
        const req = requests.find(r => r.id === requestId);
        if (!req) return { success: false, message: 'Không tìm thấy yêu cầu.' };
        if (req.status !== 'pending') return { success: false, message: 'Yêu cầu này đã được xử lý.' };

        this.update(req.memberId, req.changes, {
            id: adminUser?.id || null,
            username: req.requestedByUsername || req.requestedBy,
            displayName: `${req.requestedByName} (duyệt bởi ${adminUser?.displayName || adminUser?.username || 'Admin'})`,
        });
        req.status = 'approved';
        req.reviewedById = adminUser?.id || null;
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
                if (e.name === 'AbortError') return;
            }
        }

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

    getPosts() {
        try {
            const posts = JSON.parse(localStorage.getItem('vuFamilyPosts'));
            if (posts && posts.length > 0) return posts;
        } catch (e) {}
        if (!localStorage.getItem('vuFamilyPosts')) this.savePosts(SAMPLE_POSTS);
        return [...SAMPLE_POSTS];
    },
    savePosts(posts) {
        localStorage.setItem('vuFamilyPosts', JSON.stringify(posts));
    },
    createPost(data, user) {
        const posts = this.getPosts();
        const post = {
            id: `p_${Date.now()}`,
            content: data.content,
            authorId: user.id || null,
            authorName: user.displayName || user.username,
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

    getContacts() {
        const CONTACTS_KEY = 'vuFamilyContacts';
        const defaultMap = {
            c_zalo: { type: 'zalo', name: 'Nhóm Zalo', url: 'https://www.facebook.com/dangvq.it' },
            c_facebook: { type: 'facebook', name: 'Nhóm Facebook', url: 'https://www.facebook.com/dangvq.it' },
            c_messenger: { type: 'messenger', name: 'Nhóm Messenger', url: 'https://www.facebook.com/dangvq.it' },
        };
        try {
            let data = JSON.parse(localStorage.getItem(CONTACTS_KEY)) || [];
            const seenTypes = new Set();
            data = data.filter(c => {
                if (seenTypes.has(c.type)) return false;
                seenTypes.add(c.type);
                return true;
            });
            const existingTypes = new Set(data.map(c => c.type));
            for (const [id, def] of Object.entries(defaultMap)) {
                if (!existingTypes.has(def.type)) {
                    data.push({ id, ...def });
                }
            }
            localStorage.setItem(CONTACTS_KEY, JSON.stringify(data));
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
