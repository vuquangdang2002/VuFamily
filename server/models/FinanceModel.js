// FinanceModel.js - Database queries for family funds using Supabase
const { supabase } = require('../config/supabase');

const FinanceModel = {
    async getAllTransactions() {
        const { data, error } = await supabase
            .from('funds_transactions')
            .select(`
                *,
                created_by_user:users!funds_transactions_created_by_fkey (id, username, display_name)
            `)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    async getTransactionById(id) {
        const { data, error } = await supabase
            .from('funds_transactions')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },

    async createTransaction(txData) {
        const { data, error } = await supabase
            .from('funds_transactions')
            .insert(txData)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateTransaction(id, txData) {
        const { data, error } = await supabase
            .from('funds_transactions')
            .update({ ...txData, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteTransaction(id) {
        const { error } = await supabase
            .from('funds_transactions')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    },

    async createAuditLog(logData) {
        const { data, error } = await supabase
            .from('funds_audit_logs')
            .insert(logData)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async getAllAuditLogs() {
        const { data, error } = await supabase
            .from('funds_audit_logs')
            .select(`
                *,
                modified_by_user:users!funds_audit_logs_modified_by_fkey (id, username, display_name)
            `)
            .order('modified_at', { ascending: false });
        if (error) throw error;
        return data;
    }
};

module.exports = FinanceModel;
