import { useState, useCallback, useEffect } from 'react';
import { myLog, myError } from '../utils/logger';
import { api, localApi } from '../services/api';
import { AuthHelper } from '../services/AuthHelper';
import { offlineCache } from '../utils/offlineCache';
import { encryptAndCompress, decryptAndDecompress } from '../utils/offlineSecurity';
import { scheduleOfflineNotifications } from '../utils/localNotifications';
import { TrackingHelper } from '../services/TrackingHelper';
import { I18nHelper } from '../services/i18n.js';

export default function useMemberSystem(user, addToast) {
    const [members, setMembers] = useState([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(true);
    const [selected, setSelected] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [searchResults, setSearchResults] = useState([]);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editMember, setEditMember] = useState(null);
    const [modalParentId, setModalParentId] = useState(null);
    const [modalSpouseOfId, setModalSpouseOfId] = useState(null);

    const isAdmin = user?.role === 'admin';
    const canEdit = user?.role === 'admin' || user?.role === 'editor';

    const refresh = async () => {
        try {
            const res = await api.getMembers();
            if (res.success && res.data) {
                setMembers(res.data);
                
                // Cache encrypted family tree offline
                const token = AuthHelper.getToken();
                if (token) {
                    try {
                        const encrypted = await encryptAndCompress(res.data, token);
                        await offlineCache.saveFamilyTree(encrypted);
                        myLog('OFFLINE', 'Successfully cached encrypted family tree.');
                    } catch (err) {
                        myError('OFFLINE', 'Failed to save offline cache:', err);
                    }
                }
                
                // Schedule local alerts on the device
                scheduleOfflineNotifications(res.data);

                if (selected) {
                    const fresh = res.data.find(m => m.id === selected.id);
                    if (fresh) setSelected(fresh);
                }
            }
        } catch (e) {
            myError('APP', 'Error loading tree from API, loading offline cache...', e);
            // Offline fallback
            const token = AuthHelper.getToken();
            if (token) {
                try {
                    const cachedBytes = await offlineCache.getFamilyTree();
                    if (cachedBytes) {
                        const decrypted = await decryptAndDecompress(cachedBytes, token);
                        if (decrypted && Array.isArray(decrypted)) {
                            setMembers(decrypted);
                            addToast(I18nHelper.t('app.offline_warning') || 'Mất kết nối máy chủ. Đang sử dụng gia phả ngoại tuyến. Vui lòng kiểm tra lại kết nối mạng.', 'warning');
                            
                            // Schedule local alerts from offline cache
                            scheduleOfflineNotifications(decrypted);

                            if (selected) {
                                const fresh = decrypted.find(m => m.id === selected.id);
                                if (fresh) setSelected(fresh);
                            }
                            setIsLoadingMembers(false);
                            return;
                        }
                    }
                } catch (err) {
                    myError('OFFLINE', 'Failed to load offline cache:', err);
                }
            }
            addToast((I18nHelper.t('app.load_tree_error') || 'Lỗi tải gia phả từ máy chủ') + '. Vui lòng kiểm tra kết nối mạng.', 'error');
        } finally {
            setIsLoadingMembers(false);
        }
    };

    useEffect(() => {
        if (user) {
            refresh();
        }
    }, [user?.token]);

    const handleSelect = useCallback((member) => {
        setSelected(member);
        setDetailOpen(true);
    }, [selected]);

    const closeDetail = () => {
        setDetailOpen(false);
        setSelected(null);
    };

    const handleSearch = (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }
        setSearchResults(localApi.search(query));
    };

    const openAddModal = (parentId = null) => {
        setEditMember(null);
        setModalParentId(parentId);
        setModalSpouseOfId(null);
        setModalOpen(true);
    };

    const openEditModal = (id) => {
        const m = members.find(x => x.id === id);
        if (!m) return;
        setEditMember(m);
        setModalParentId(null);
        setModalSpouseOfId(null);
        setModalOpen(true);
    };

    const openAddSpouseModal = (memberId) => {
        setEditMember(null);
        setModalParentId(null);
        setModalSpouseOfId(memberId);
        setModalOpen(true);
    };

    const closeModal = () => setModalOpen(false);

    const handleFormSubmit = async (data) => {
        try {
            if (data.id) {
                const original = members.find(m => m.id === data.id) || {};
                const skipFields = ['id', 'spouseId', 'parentId', 'newAchievements'];
                const keys = Object.keys(data).filter(k => !skipFields.includes(k));
                let hasChanges = false;
                const actualChanges = {};
                for (const k of keys) {
                    if (String(original[k] ?? '') !== String(data[k] ?? '')) {
                        hasChanges = true;
                        actualChanges[k] = data[k];
                    }
                }

                if (data.newAchievements && data.newAchievements.length > 0) {
                    hasChanges = true;
                }

                if (!hasChanges) {
                    addToast(I18nHelper.t('app.no_changes'), 'error');
                    closeModal();
                    return;
                }

                if (isAdmin || canEdit) {
                    if (Object.keys(actualChanges).length > 0) {
                        const result = await api.submitRequest(data.id, actualChanges, I18nHelper.t('app.direct_update_by') + ' ' + (isAdmin ? 'Admin' : 'Editor'));
                        await api.approveRequest(result.data.id);
                        addToast(I18nHelper.t('app.update_success').replace('{name}', data.name));
                    }
                    if (data.newAchievements?.length > 0) {
                        for (const a of data.newAchievements) {
                            await api.addAchievement({ ...a, memberId: data.id });
                        }
                    }
                } else {
                    const result = await api.submitRequest(data.id, actualChanges, I18nHelper.t('app.edit_member_label'));
                    addToast(result.message || I18nHelper.t('app.edit_request_sent'), result.success ? 'success' : 'error');
                }
            } else {
                if (!canEdit) {
                    addToast(I18nHelper.t('app.no_add_permission'), 'error');
                    return;
                }
                const res = await api.createMember(data);
                if (data.newAchievements?.length > 0 && res.data?.id) {
                    for (const a of data.newAchievements) {
                        await api.addAchievement({ ...a, memberId: res.data.id });
                    }
                }
                const relationship = data.parentId ? 'con' : (data.spouseId ? 'vo_chong' : 'goc');
                TrackingHelper.trackAddTreeMember(relationship);
                addToast(I18nHelper.t('app.add_success').replace('{name}', data.name));
            }
            await refresh();
            closeModal();
        } catch (e) {
            addToast(e.message || I18nHelper.t('app.save_error'), 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!canEdit) {
            addToast(I18nHelper.t('app.no_delete_permission'), 'error');
            return;
        }
        const m = members.find(x => x.id === id);
        if (!m) return;
        const children = members.filter(x => x.parentId === id);
        const msg = children.length > 0
            ? I18nHelper.t('app.delete_confirm_children').replace('{name}', m.name).replace('{count}', children.length)
            : I18nHelper.t('app.delete_confirm').replace('{name}', m.name);
        if (confirm(msg)) {
            try {
                await api.deleteMember(id);
                closeDetail();
                await refresh();
                addToast(I18nHelper.t('app.deleted').replace('{name}', m.name));
            } catch (e) {
                addToast(e.message || I18nHelper.t('app.delete_error'), 'error');
            }
        }
    };

    const handleExport = async (format = 'json') => {
        if (format === 'csv') {
            const currentMembers = localApi.getMembers();
            if (!currentMembers.length) {
                addToast(I18nHelper.t('app.no_data_export'), 'error');
                return;
            }
            const headers = ['id', 'name', 'gender', 'birth_date', 'birth_time', 'death_date', 'birth_place', 'death_place', 'occupation', 'phone', 'email', 'address', 'note', 'photo', 'birth_order', 'child_type', 'parent_id', 'spouse_id', 'generation'];
            const csvRows = [headers.join(',')];
            currentMembers.forEach(m => {
                const row = headers.map(h => {
                    const val = m[h] ?? m[h.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] ?? '';
                    const str = String(val);
                    return str.includes(',') || str.includes('"') || str.includes('\n')
                        ? `"${str.replace(/"/g, '""')}"` : str;
                });
                csvRows.push(row.join(','));
            });
            const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gia-pha-backup-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            addToast(I18nHelper.t('app.export_csv_success'));
        } else {
            await localApi.exportJSON();
            addToast(I18nHelper.t('app.export_json_success'));
        }
    };

    const handleImport = async (file, format = 'json') => {
        if (!canEdit) {
            addToast(I18nHelper.t('app.no_import_permission'), 'error');
            return;
        }
        if (!confirm(I18nHelper.t('app.import_confirm'))) return;
        try {
            if (format === 'csv') {
                const text = await file.text();
                const lines = text.replace(/^\uFEFF/, '').split('\n').filter(l => l.trim());
                if (lines.length < 2) throw new Error(I18nHelper.t('app.csv_empty'));
                const headers = lines[0].split(',').map(h => h.trim());
                const importedMembers = [];
                for (let i = 1; i < lines.length; i++) {
                    const row = [];
                    let current = '', inQuotes = false;
                    for (const ch of lines[i]) {
                        if (ch === '"') { inQuotes = !inQuotes; continue; }
                        if (ch === ',' && !inQuotes) { row.push(current.trim()); current = ''; continue; }
                        current += ch;
                    }
                    row.push(current.trim());

                    const member = {};
                    headers.forEach((h, idx) => {
                        const camel = h.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
                        let val = row[idx] || '';
                        if (['id', 'gender', 'birth_order', 'parent_id', 'spouse_id', 'generation'].includes(h)) {
                            val = val ? parseInt(val) : (h === 'gender' ? 1 : null);
                        }
                        member[camel] = val;
                    });
                    if (member.name) importedMembers.push(member);
                }
                localStorage.setItem('vuFamilyMembers', JSON.stringify(importedMembers));
                refresh();
                addToast(I18nHelper.t('admin.import_success') + ' (' + importedMembers.length + ' CSV)');
            } else {
                await localApi.importJSON(file);
                refresh();
                addToast(I18nHelper.t('admin.import_success'));
            }
        } catch (err) {
            addToast(`${I18nHelper.t('app.error_prefix')} ${err.message}`, 'error');
        }
    };

    const handleReset = () => {
        if (!isAdmin) return;
        if (confirm(I18nHelper.t('app.reset_confirm'))) {
            localApi.resetData();
            refresh();
            closeDetail();
            addToast(I18nHelper.t('app.reset_success'));
        }
    };

    return {
        members,
        isLoadingMembers,
        selected,
        setSelected,
        detailOpen,
        searchResults,
        setSearchResults,
        modalOpen,
        editMember,
        modalParentId,
        modalSpouseOfId,
        refresh,
        handleSelect,
        closeDetail,
        handleSearch,
        openAddModal,
        openEditModal,
        openAddSpouseModal,
        closeModal,
        handleFormSubmit,
        handleDelete,
        handleExport,
        handleImport,
        handleReset
    };
}
