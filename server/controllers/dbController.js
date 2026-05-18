const { supabase } = require('../config/supabase');
const AdmZip = require('adm-zip');
const { encryptText, decryptText } = require('../utils/cryptoUtils');

class DbController {
    static async exportData(req, res) {
        try {
            const { format = 'json', isEncrypted = 'false', tables = '' } = req.query;
            const encryptData = isEncrypted === 'true';
            
            const allTables = [
                'members', 'achievements', 'users', 'posts', 'comments', 
                'reactions', 'chat_rooms', 'chat_room_members', 'messages',
                'edit_history', 'pending_requests', 'funds_audit_logs', 'funds_transactions'
            ];
            
            const reqTables = tables ? tables.split(',') : allTables;
            const targetTables = allTables.filter(t => reqTables.includes(t));
            
            const zip = new AdmZip();
            
            for (const table of targetTables) {
                const { data, error } = await supabase.from(table).select('*');
                if (error) {
                    console.log(`Table ${table} might not exist or error:`, error.message);
                    continue;
                }
                
                if (data && data.length > 0) {
                    let fileContent = '';
                    if (format === 'csv') {
                        const headers = Object.keys(data[0]);
                        const csvRows = [headers.join(',')];
                        for (const row of data) {
                            const values = headers.map(header => {
                                const val = row[header] === null ? '' : String(row[header]);
                                return `"${val.replace(/"/g, '""')}"`;
                            });
                            csvRows.push(values.join(','));
                        }
                        fileContent = csvRows.join('\n');
                    } else {
                        fileContent = JSON.stringify(data, null, 2);
                    }

                    if (encryptData) {
                        fileContent = encryptText(fileContent);
                    }

                    zip.addFile(`${table}.${format}${encryptData ? '.enc' : ''}`, Buffer.from(fileContent, 'utf8'));
                }
            }
            
            const zipBuffer = zip.toBuffer();
            const filename = `vufamily_backup_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'json'}${encryptData ? '_encrypted' : ''}.zip`;
            
            res.set('Content-Type', 'application/zip');
            res.set('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(zipBuffer);
        } catch (error) {
            console.error('[DbController - exportData] Error:', error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    static async importData(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'Không tìm thấy file zip' });
            }

            const { isEncrypted = 'false', tables = '' } = req.body;
            const decryptData = isEncrypted === 'true';
            
            const reqTables = tables ? tables.split(',') : [];

            const zip = new AdmZip(req.file.buffer);
            const zipEntries = zip.getEntries();

            let importedCount = 0;

            for (const zipEntry of zipEntries) {
                if (zipEntry.isDirectory) continue;
                
                const filename = zipEntry.entryName;
                const tableName = filename.split('.')[0];
                
                // If specific tables requested, skip unselected ones
                if (reqTables.length > 0 && !reqTables.includes(tableName)) {
                    continue;
                }

                let rawContent = zipEntry.getData().toString('utf8');

                if (decryptData || filename.endsWith('.enc')) {
                    try {
                        rawContent = decryptText(rawContent);
                    } catch (e) {
                        return res.status(400).json({ success: false, error: `Sai khóa giải mã hoặc file ${filename} bị hỏng!` });
                    }
                }

                let records = [];

                if (filename.includes('.json')) {
                    records = JSON.parse(rawContent);
                } else if (filename.includes('.csv')) {
                    const lines = rawContent.split('\n');
                    if (lines.length > 1) {
                        const headers = lines[0].split(',').map(h => h.trim());
                        for (let i = 1; i < lines.length; i++) {
                            const line = lines[i].trim();
                            if (!line) continue;
                            const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
                            const obj = {};
                            headers.forEach((h, idx) => obj[h] = values[idx] || null);
                            records.push(obj);
                        }
                    }
                }

                if (records.length > 0) {
                    const { error } = await supabase.from(tableName).upsert(records);
                    if (!error) importedCount += records.length;
                    else console.error(`[DbController] Import table ${tableName} error:`, error.message);
                }
            }

            res.json({ success: true, message: `Nhập thành công ${importedCount} bản ghi.` });
        } catch (error) {
            console.error('[DbController - importData] Error:', error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = DbController;
