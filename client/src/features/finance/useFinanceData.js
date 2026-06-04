import { useState, useEffect } from 'react';
import { api } from '../../shared/services/api';
import { useTranslation } from '../../shared/hooks/useTranslation';

export const CATEGORY_COLORS = {
    education: '#3b82f6',
    death_anniversary: '#ef4444',
    travel: '#10b981',
    construction: '#8b5cf6',
    award: '#f59e0b',
    other: '#64748b'
};

export function useFinanceData({ user, addToast }) {
    const { t } = useTranslation();
    const [transactions, setTransactions] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const isEditorOrAdmin = user?.role === 'admin' || user?.role === 'editor';
    const isAdmin = user?.role === 'admin';

    const categoryLabels = {
        education: t('finance.cat_education'),
        death_anniversary: t('finance.cat_death_anniversary'),
        travel: t('finance.cat_travel'),
        construction: t('finance.cat_construction'),
        award: t('finance.cat_award'),
        other: t('finance.cat_other')
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const txRes = await api.getFinanceTransactions();
            if (txRes.success) setTransactions(txRes.data || []);
            if (isAdmin) {
                const logRes = await api.getFinanceAuditLogs();
                if (logRes.success) setAuditLogs(logRes.data || []);
            }
        } catch (e) {
            addToast(t('finance.offline_warning'), 'warning');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [user]);

    const handleCreateTransaction = async (formData) => {
        const amt = parseFloat(formData.amount);
        if (isNaN(amt) || amt <= 0) { addToast(t('finance.invalid_amount'), 'error'); return false; }
        if (!formData.description.trim()) { addToast(t('finance.empty_description'), 'error'); return false; }
        try {
            const res = await api.createFinanceTransaction({
                type: formData.type, amount: amt,
                category: formData.category, description: formData.description
            });
            if (res.success) {
                addToast(t('finance.create_success'));
                loadData();
                return true;
            } else {
                addToast(res.error || t('finance.create_fail'), 'error');
                return false;
            }
        } catch { addToast(t('finance.create_error'), 'error'); return false; }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t('finance.delete_confirm'))) return;
        try {
            const res = await api.deleteFinanceTransaction(id);
            if (res.success) { addToast(t('finance.delete_success')); loadData(); }
            else addToast(res.error || t('finance.delete_fail'), 'error');
        } catch { addToast(t('finance.delete_error'), 'error'); }
    };

    const handleExportCSV = (categories) => {
        const headers = [
            t('finance.col_date'), t('finance.type_label'),
            t('finance.col_amount'), t('finance.col_category'), t('finance.col_description')
        ];
        const rows = transactions.map(tx => [
            new Date(tx.created_at).toLocaleDateString('vi-VN'),
            tx.type === 'INCOME' ? t('finance.type_income') : t('finance.type_expense'),
            tx.amount,
            categoryLabels[tx.category] || tx.category,
            `"${(tx.description || '').replace(/"/g, '""')}"`
        ]);
        const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `quy-tai-chinh-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Computed values
    const totalIncome = transactions.filter(tx => tx.type === 'INCOME').reduce((s, tx) => s + tx.amount, 0);
    const totalExpense = transactions.filter(tx => tx.type === 'EXPENSE').reduce((s, tx) => s + tx.amount, 0);
    const currentBalance = totalIncome - totalExpense;

    const categories = {};
    Object.entries(categoryLabels).forEach(([key, label]) => {
        categories[key] = { label, amount: 0, color: CATEGORY_COLORS[key] || '#64748b' };
    });
    transactions.forEach(tx => {
        const cat = categories[tx.category] || categories.other;
        if (tx.type === 'INCOME') cat.amount += tx.amount;
        else cat.amount -= tx.amount;
    });

    const formatCurrency = (val) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    // 6-month bar chart data
    const getMonthlyData = () => {
        const monthly = [];
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const year = d.getFullYear();
            const month = d.getMonth();
            const monthName = d.toLocaleDateString('vi-VN', { month: 'short' });
            let income = 0, expense = 0;
            transactions.forEach(tx => {
                const txDate = new Date(tx.created_at);
                if (txDate.getFullYear() === year && txDate.getMonth() === month) {
                    if (tx.type === 'INCOME') income += tx.amount;
                    else expense += tx.amount;
                }
            });
            monthly.push({ monthName, income, expense });
        }
        return monthly;
    };

    return {
        transactions, auditLogs, loading, categoryLabels, categories,
        totalIncome, totalExpense, currentBalance, formatCurrency,
        isAdmin, isEditorOrAdmin, loadData, handleCreateTransaction,
        handleDelete, handleExportCSV, getMonthlyData,
        t
    };
}
