import { request } from './request';

export const financeApi = {
    getFinanceTransactions: () => request('/finance/transactions'),
    createFinanceTransaction: (data) => 
        request('/finance/transactions', { method: 'POST', body: JSON.stringify(data) }),
    updateFinanceTransaction: (id, data) => 
        request(`/finance/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteFinanceTransaction: (id) => request(`/finance/transactions/${id}`, { method: 'DELETE' }),
    getFinanceAuditLogs: () => request('/finance/audit-logs'),
};
