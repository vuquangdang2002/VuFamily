import { Hono } from 'hono';
import { getDb } from '../db/client';
import { fundsTransactions, fundsAuditLogs, users } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { Env } from '../index';
import { authenticate, requireAdmin, requireEditorOrAdmin } from '../middleware/auth';
import { encryptText, decryptText } from '../utils/crypto';

export const financeRouter = new Hono<{ Bindings: Env }>();

// GET /api/finance/transactions
financeRouter.get('/transactions', authenticate, async (c) => {
  try {
    const db = getDb(c.env.DB);
    const rawTxs = await db.select({
      id: fundsTransactions.id,
      type: fundsTransactions.type,
      amountEncrypted: fundsTransactions.amountEncrypted,
      description: fundsTransactions.description,
      category: fundsTransactions.category,
      createdBy: fundsTransactions.createdBy,
      createdAt: fundsTransactions.createdAt,
      updatedAt: fundsTransactions.updatedAt,
      creatorName: users.displayName
    })
    .from(fundsTransactions)
    .leftJoin(users, eq(fundsTransactions.createdBy, users.id))
    .orderBy(desc(fundsTransactions.createdAt));

    const decryptedTxs = rawTxs.map(tx => {
      let amount = 0;
      try {
        const decryptedStr = decryptText(tx.amountEncrypted, c.env);
        amount = parseFloat(decryptedStr) || 0;
      } catch (e) {
        console.error(`Failed to decrypt amount for transaction ${tx.id}:`, e);
      }
      
      const { amountEncrypted, ...rest } = tx;
      return {
        ...rest,
        amount
      };
    });

    return c.json({ success: true, data: decryptedTxs });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST /api/finance/transactions
financeRouter.post('/transactions', authenticate, requireEditorOrAdmin, async (c) => {
  try {
    const { type, amount, description, category } = await c.req.json();
    
    if (!type || !['INCOME', 'EXPENSE'].includes(type)) {
      return c.json({ success: false, error: 'Loại giao dịch không hợp lệ.' }, 400);
    }
    if (amount === undefined || isNaN(amount) || amount <= 0) {
      return c.json({ success: false, error: 'Số tiền phải là số lớn hơn 0.' }, 400);
    }
    if (!description || description.trim() === '') {
      return c.json({ success: false, error: 'Mô tả không được để trống.' }, 400);
    }

    const currentUser = c.get('user');
    const db = getDb(c.env.DB);
    const amountEncrypted = encryptText(String(amount), c.env);
    
    const [newTx] = await db.insert(fundsTransactions).values({
      type,
      amountEncrypted,
      description: description.trim(),
      category: category || 'other',
      createdBy: currentUser.id
    }).returning();

    await db.insert(fundsAuditLogs).values({
      transactionId: newTx.id,
      action: 'CREATED',
      newAmountEncrypted: amountEncrypted,
      modifiedBy: currentUser.id
    });

    return c.json({
      success: true,
      message: 'Tạo giao dịch tài chính thành công.',
      data: {
        ...newTx,
        amount: parseFloat(amount),
        creatorName: currentUser.displayName
      }
    }, 201);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// PUT /api/finance/transactions/:id
financeRouter.put('/transactions/:id', authenticate, requireAdmin, async (c) => {
  try {
    const id = parseInt(c.req.param('id') as string);
    const { type, amount, description, category } = await c.req.json();

    const db = getDb(c.env.DB);
    const [original] = await db.select().from(fundsTransactions).where(eq(fundsTransactions.id, id));
    
    if (!original) {
      return c.json({ success: false, error: 'Không tìm thấy giao dịch này.' }, 404);
    }

    if (type && !['INCOME', 'EXPENSE'].includes(type)) {
      return c.json({ success: false, error: 'Loại giao dịch không hợp lệ.' }, 400);
    }
    if (amount !== undefined && (isNaN(amount) || amount <= 0)) {
      return c.json({ success: false, error: 'Số tiền phải lớn hơn 0.' }, 400);
    }

    const updatedFields: any = { updatedAt: new Date().toISOString() };
    if (type) updatedFields.type = type;
    if (description !== undefined) updatedFields.description = description.trim();
    if (category) updatedFields.category = category;
    
    let newAmountEncrypted = original.amountEncrypted;
    if (amount !== undefined) {
      newAmountEncrypted = encryptText(String(amount), c.env);
      updatedFields.amountEncrypted = newAmountEncrypted;
    }

    const currentUser = c.get('user');
    const [updatedTx] = await db.update(fundsTransactions).set(updatedFields).where(eq(fundsTransactions.id, id)).returning();

    await db.insert(fundsAuditLogs).values({
      transactionId: id,
      action: 'UPDATED',
      oldAmountEncrypted: original.amountEncrypted,
      newAmountEncrypted: newAmountEncrypted,
      modifiedBy: currentUser.id
    });

    return c.json({
      success: true,
      message: 'Cập nhật giao dịch thành công.',
      data: {
        ...updatedTx,
        amount: amount !== undefined ? parseFloat(amount) : parseFloat(decryptText(newAmountEncrypted, c.env))
      }
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// DELETE /api/finance/transactions/:id
financeRouter.delete('/transactions/:id', authenticate, requireAdmin, async (c) => {
  try {
    const id = parseInt(c.req.param('id') as string);
    const db = getDb(c.env.DB);
    const [original] = await db.select().from(fundsTransactions).where(eq(fundsTransactions.id, id));
    
    if (!original) {
      return c.json({ success: false, error: 'Không tìm thấy giao dịch này.' }, 404);
    }

    const currentUser = c.get('user');
    await db.insert(fundsAuditLogs).values({
      transactionId: null, // Because tx will be deleted
      action: 'DELETED',
      oldAmountEncrypted: original.amountEncrypted,
      modifiedBy: currentUser.id
    });

    await db.delete(fundsTransactions).where(eq(fundsTransactions.id, id));

    return c.json({ success: true, message: 'Xóa giao dịch tài chính thành công.' });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// GET /api/finance/audit-logs
financeRouter.get('/audit-logs', authenticate, requireAdmin, async (c) => {
  try {
    const db = getDb(c.env.DB);
    const rawLogs = await db.select({
      id: fundsAuditLogs.id,
      transactionId: fundsAuditLogs.transactionId,
      action: fundsAuditLogs.action,
      oldAmountEncrypted: fundsAuditLogs.oldAmountEncrypted,
      newAmountEncrypted: fundsAuditLogs.newAmountEncrypted,
      modifiedBy: fundsAuditLogs.modifiedBy,
      modifiedAt: fundsAuditLogs.modifiedAt,
      modifierName: users.displayName
    })
    .from(fundsAuditLogs)
    .leftJoin(users, eq(fundsAuditLogs.modifiedBy, users.id))
    .orderBy(desc(fundsAuditLogs.modifiedAt));

    const decryptedLogs = rawLogs.map(log => {
      let oldAmount = null;
      let newAmount = null;
      
      if (log.oldAmountEncrypted) {
        try { oldAmount = parseFloat(decryptText(log.oldAmountEncrypted, c.env)) || null; } catch (e) {}
      }
      if (log.newAmountEncrypted) {
        try { newAmount = parseFloat(decryptText(log.newAmountEncrypted, c.env)) || null; } catch (e) {}
      }

      const { oldAmountEncrypted, newAmountEncrypted, ...rest } = log;
      return {
        ...rest,
        old_amount: oldAmount,
        new_amount: newAmount
      };
    });

    return c.json({ success: true, data: decryptedLogs });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});
