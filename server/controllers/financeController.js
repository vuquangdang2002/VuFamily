// financeController.js - Controls finance operations, handles AES-256 amount encryption/decryption
const FinanceModel = require('../models/FinanceModel');
const { encryptText, decryptText } = require('../utils/cryptoUtils');

const financeController = {
    // GET /api/finance/transactions
    async getTransactions(req, res, next) {
        try {
            const rawTxs = await FinanceModel.getAllTransactions();
            const decryptedTxs = rawTxs.map(tx => {
                let amount = 0;
                try {
                    const decryptedStr = decryptText(tx.amount_encrypted);
                    amount = parseFloat(decryptedStr) || 0;
                } catch (e) {
                    console.error(`Failed to decrypt amount for transaction ${tx.id}:`, e);
                }
                
                // Remove the encrypted field from response for extra hygiene
                const { amount_encrypted, ...rest } = tx;
                return {
                    ...rest,
                    amount
                };
            });
            
            res.json({ success: true, data: decryptedTxs });
        } catch (err) {
            next(err);
        }
    },

    // POST /api/finance/transactions
    async createTransaction(req, res, next) {
        try {
            const { type, amount, description, category } = req.body;
            
            if (!type || !['INCOME', 'EXPENSE'].includes(type)) {
                return res.status(400).json({ success: false, error: 'Loại giao dịch không hợp lệ.' });
            }
            if (amount === undefined || isNaN(amount) || amount <= 0) {
                return res.status(400).json({ success: false, error: 'Số tiền phải là số lớn hơn 0.' });
            }
            if (!description || description.trim() === '') {
                return res.status(400).json({ success: false, error: 'Mô tả không được để trống.' });
            }

            const amount_encrypted = encryptText(String(amount));
            
            const newTx = await FinanceModel.createTransaction({
                type,
                amount_encrypted,
                description: description.trim(),
                category: category || 'other',
                created_by: req.user.id
            });

            // Write to Audit Trail
            await FinanceModel.createAuditLog({
                transaction_id: newTx.id,
                action: 'CREATED',
                new_amount_encrypted: amount_encrypted,
                modified_by: req.user.id
            });

            res.status(201).json({
                success: true,
                message: 'Tạo giao dịch tài chính thành công.',
                data: {
                    ...newTx,
                    amount: parseFloat(amount)
                }
            });
        } catch (err) {
            next(err);
        }
    },

    // PUT /api/finance/transactions/:id
    async updateTransaction(req, res, next) {
        try {
            const { id } = req.params;
            const { type, amount, description, category } = req.body;

            const original = await FinanceModel.getTransactionById(id);
            if (!original) {
                return res.status(404).json({ success: false, error: 'Không tìm thấy giao dịch này.' });
            }

            if (type && !['INCOME', 'EXPENSE'].includes(type)) {
                return res.status(400).json({ success: false, error: 'Loại giao dịch không hợp lệ.' });
            }
            if (amount !== undefined && (isNaN(amount) || amount <= 0)) {
                return res.status(400).json({ success: false, error: 'Số tiền phải lớn hơn 0.' });
            }

            const updatedFields = {};
            if (type) updatedFields.type = type;
            if (description !== undefined) updatedFields.description = description.trim();
            if (category) updatedFields.category = category;
            
            let new_amount_encrypted = original.amount_encrypted;
            if (amount !== undefined) {
                new_amount_encrypted = encryptText(String(amount));
                updatedFields.amount_encrypted = new_amount_encrypted;
            }

            const updatedTx = await FinanceModel.updateTransaction(id, updatedFields);

            // Write to Audit Trail
            await FinanceModel.createAuditLog({
                transaction_id: id,
                action: 'UPDATED',
                old_amount_encrypted: original.amount_encrypted,
                new_amount_encrypted: new_amount_encrypted,
                modified_by: req.user.id
            });

            res.json({
                success: true,
                message: 'Cập nhật giao dịch thành công.',
                data: {
                    ...updatedTx,
                    amount: amount !== undefined ? parseFloat(amount) : parseFloat(decryptText(new_amount_encrypted))
                }
            });
        } catch (err) {
            next(err);
        }
    },

    // DELETE /api/finance/transactions/:id
    async deleteTransaction(req, res, next) {
        try {
            const { id } = req.params;

            const original = await FinanceModel.getTransactionById(id);
            if (!original) {
                return res.status(404).json({ success: false, error: 'Không tìm thấy giao dịch này.' });
            }

            // Write to Audit Trail BEFORE deleting so that we don't violate foreign key constraint
            // We set transaction_id to null because the transaction is about to be deleted
            await FinanceModel.createAuditLog({
                transaction_id: null,
                action: 'DELETED',
                old_amount_encrypted: original.amount_encrypted,
                modified_by: req.user.id
            });

            await FinanceModel.deleteTransaction(id);

            res.json({
                success: true,
                message: 'Xóa giao dịch tài chính thành công.'
            });
        } catch (err) {
            next(err);
        }
    },

    // GET /api/finance/audit-logs
    async getAuditLogs(req, res, next) {
        try {
            const rawLogs = await FinanceModel.getAllAuditLogs();
            const decryptedLogs = rawLogs.map(log => {
                let oldAmount = null;
                let newAmount = null;
                
                if (log.old_amount_encrypted) {
                    try {
                        oldAmount = parseFloat(decryptText(log.old_amount_encrypted)) || null;
                    } catch (e) {}
                }
                if (log.new_amount_encrypted) {
                    try {
                        newAmount = parseFloat(decryptText(log.new_amount_encrypted)) || null;
                    } catch (e) {}
                }

                const { old_amount_encrypted, new_amount_encrypted, ...rest } = log;
                return {
                    ...rest,
                    old_amount: oldAmount,
                    new_amount: newAmount
                };
            });

            res.json({ success: true, data: decryptedLogs });
        } catch (err) {
            next(err);
        }
    }
};

module.exports = financeController;
