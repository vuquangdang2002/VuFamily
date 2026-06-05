import React, { useState, useEffect } from 'react';
import { myError } from '../../shared/utils/logger';
import { getApiBase } from '../../shared/services/api';
import { AuthHelper } from '../../shared/services/AuthHelper';
import { useTranslation } from '../../shared/hooks/useTranslation';
import SystemDataTab from './components/SystemDataTab';
import SystemAccountsTab from './components/SystemAccountsTab';

export default function SystemAdminPage({ addToast }) {
    const { t } = useTranslation();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('data');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${getApiBase()}/users`, {
                headers: { 'x-auth-token': AuthHelper.getToken() }
            });
            const json = await res.json();
            if (json.success) setUsers(json.data || []);
        } catch (e) {
            myError('SYSTEM_ADMIN', e);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    return (
        <div className="page-container">
            <div className="page-header">
                <h2>{t('system.page_title')}</h2>
                <p className="page-subtitle">{t('system.page_subtitle')}</p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border-subtle)', marginBottom: 24, padding: '0 20px' }}>
                <button
                    className={`btn ${activeTab === 'data' ? 'active' : ''}`}
                    onClick={() => setActiveTab('data')}
                    style={{ background: 'transparent', border: 'none', padding: '12px 0', borderBottom: activeTab === 'data' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'data' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'data' ? 600 : 500, borderRadius: 0 }}
                >
                    {t('system.tab_data')}
                </button>
                <button
                    className={`btn ${activeTab === 'accounts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('accounts')}
                    style={{ background: 'transparent', border: 'none', padding: '12px 0', borderBottom: activeTab === 'accounts' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'accounts' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'accounts' ? 600 : 500, borderRadius: 0 }}
                >
                    {t('system.tab_accounts')}
                </button>
            </div>

            <div className="page-body">
                {activeTab === 'data' && (
                    <SystemDataTab addToast={addToast} fetchUsers={fetchUsers} />
                )}

                {activeTab === 'accounts' && (
                    <SystemAccountsTab
                        users={users}
                        loading={loading}
                        fetchUsers={fetchUsers}
                        addToast={addToast}
                    />
                )}
            </div>
        </div>
    );
}
