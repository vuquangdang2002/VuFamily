const fs = require('fs');
const path = require('path');
let initSqlJs;
try {
  initSqlJs = require('sql.js');
} catch (e) {
  console.warn('⚠️ sql.js not found, local SQLite mode will fail if invoked in standard Node.');
}

const dbPath = path.resolve(__dirname, '../../database/family_all.db');
let SQL = null;

// Helper to get local SQLite connection (sql.js)
async function getLocalDb() {
  if (!SQL) {
    if (!initSqlJs) {
      throw new Error('sql.js is required for local SQLite database operation');
    }
    SQL = await initSqlJs();
  }
  let db;
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  return db;
}

// Run query locally
async function runLocalQuery(sql, params = [], isWrite = false) {
  const db = await getLocalDb();
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    
    if (isWrite) {
      const data = db.export();
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(dbPath, Buffer.from(data));
    }
    
    db.close();
    return rows;
  } catch (err) {
    db.close();
    throw err;
  }
}

// Check environment
const isCloudflare = () => {
  return typeof globalThis.MINIFLARE_ENV !== 'undefined' || 
         (globalThis.CLOUDFLARE_CONTEXT && globalThis.CLOUDFLARE_CONTEXT.env);
};

// Unified execute function
async function executeQuery(sql, params = [], isWrite = false) {
  if (isCloudflare()) {
    const env = globalThis.MINIFLARE_ENV || (globalThis.CLOUDFLARE_CONTEXT && globalThis.CLOUDFLARE_CONTEXT.env);
    const db = env.DB;
    if (!db) {
      throw new Error('Cloudflare D1 database binding (env.DB) is not available');
    }
    const result = await db.prepare(sql).bind(...params).all();
    return result.results || [];
  } else {
    return runLocalQuery(sql, params, isWrite);
  }
}

class D1QueryBuilder {
  constructor(tableName) {
    this.tableName = tableName;
    this.op = 'select'; // select, insert, update, delete, upsert
    this.selectCols = '*';
    this.insertData = null;
    this.updateData = null;
    this.whereClauses = [];
    this.orderClauses = [];
    this.limitVal = null;
    this.isSingle = false;
    this.countOptions = null;
  }

  select(cols = '*', options = null) {
    this.op = 'select';
    this.selectCols = cols;
    if (options && options.count) {
      this.countOptions = options;
    }
    return this;
  }

  insert(data) {
    this.op = 'insert';
    this.insertData = data;
    return this;
  }

  update(data) {
    this.op = 'update';
    this.updateData = data;
    return this;
  }

  delete() {
    this.op = 'delete';
    return this;
  }

  upsert(data) {
    this.op = 'upsert';
    this.insertData = data;
    return this;
  }

  eq(col, val) {
    this.whereClauses.push({ col, op: '=', val });
    return this;
  }

  neq(col, val) {
    this.whereClauses.push({ col, op: '!=', val });
    return this;
  }

  gt(col, val) {
    this.whereClauses.push({ col, op: '>', val });
    return this;
  }

  gte(col, val) {
    this.whereClauses.push({ col, op: '>=', val });
    return this;
  }

  lt(col, val) {
    this.whereClauses.push({ col, op: '<', val });
    return this;
  }

  lte(col, val) {
    this.whereClauses.push({ col, op: '<=', val });
    return this;
  }

  in(col, vals) {
    this.whereClauses.push({ col, op: 'IN', val: vals });
    return this;
  }

  like(col, val) {
    this.whereClauses.push({ col, op: 'LIKE', val });
    return this;
  }

  ilike(col, val) {
    this.whereClauses.push({ col, op: 'LIKE', val });
    return this;
  }

  or(filterStr) {
    this.whereClauses.push({ op: 'OR', val: filterStr });
    return this;
  }

  order(col, options = {}) {
    const ascending = options.ascending !== false;
    this.orderClauses.push({ col, ascending });
    return this;
  }

  limit(limit) {
    this.limitVal = limit;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  // Promise resolution support for await
  async then(onfulfilled, onrejected) {
    try {
      const res = await this.execute();
      return onfulfilled(res);
    } catch (err) {
      if (onrejected) return onrejected(err);
      return onfulfilled({ data: null, error: err });
    }
  }

  async execute() {
    let sql = '';
    const params = [];
    let isWrite = false;

    // WHERE SQL builder
    const buildWhere = () => {
      if (this.whereClauses.length === 0) return '';
      const parts = [];
      for (const clause of this.whereClauses) {
        if (clause.op === 'OR') {
          // Parse: name.ilike.%q%,birth_place.ilike.%q%
          const terms = clause.val.split(',');
          const subParts = [];
          for (const term of terms) {
            const dotParts = term.split('.');
            if (dotParts.length >= 3) {
              const col = dotParts[0];
              const op = dotParts[1];
              const val = dotParts.slice(2).join('.');
              let sqlOp = '=';
              let bindVal = val;
              if (op === 'ilike' || op === 'like') {
                sqlOp = 'LIKE';
              } else if (op === 'neq') {
                sqlOp = '!=';
              }
              subParts.push(`${col} ${sqlOp} ?`);
              params.push(bindVal);
            }
          }
          if (subParts.length > 0) {
            parts.push(`(${subParts.join(' OR ')})`);
          }
        } else if (clause.op === 'IN') {
          if (Array.isArray(clause.val) && clause.val.length > 0) {
            const placeholders = clause.val.map(() => '?').join(', ');
            parts.push(`${clause.col} IN (${placeholders})`);
            params.push(...clause.val);
          } else {
            // empty IN list makes query return empty or false
            parts.push('0 = 1');
          }
        } else {
          parts.push(`${clause.col} ${clause.op} ?`);
          params.push(clause.val);
        }
      }
      return parts.length > 0 ? ` WHERE ${parts.join(' AND ')}` : '';
    };

    // ORDER SQL builder
    const buildOrder = () => {
      if (this.orderClauses.length === 0) return '';
      const parts = this.orderClauses.map(o => `${o.col} ${o.ascending ? 'ASC' : 'DESC'}`);
      return ` ORDER BY ${parts.join(', ')}`;
    };

    // LIMIT SQL builder
    const buildLimit = () => {
      if (this.limitVal !== null) {
        return ` LIMIT ${this.limitVal}`;
      }
      return '';
    };

    try {
      if (this.op === 'select') {
        const whereSql = buildWhere();
        if (this.countOptions && this.countOptions.count === 'exact') {
          sql = `SELECT COUNT(*) as count FROM ${this.tableName}${whereSql}`;
          const results = await executeQuery(sql, params, false);
          const count = results[0] ? results[0].count : 0;
          
          if (this.isSingle) {
            return { data: { count }, error: null };
          }
          
          // Supabase count queries with select('*') usually return { data: [], count: ... }
          // If head is true, they only care about count
          if (this.countOptions.head) {
            return { data: null, count, error: null };
          }
        }

        // Standard select
        // Map selectCols (e.g. "id, name" to specific fields)
        let selectFieldSql = this.selectCols;
        if (selectFieldSql !== '*') {
          // split and clean column names
          selectFieldSql = selectFieldSql.split(',').map(s => s.trim()).join(', ');
        }
        
        sql = `SELECT ${selectFieldSql} FROM ${this.tableName}${whereSql}${buildOrder()}${buildLimit()}`;
        const results = await executeQuery(sql, params, false);
        
        if (this.isSingle) {
          if (results.length === 0) {
            return { data: null, error: { code: 'PGRST116', message: 'No rows found' } };
          }
          return { data: results[0], error: null };
        }
        return { data: results, error: null };

      } else if (this.op === 'insert') {
        isWrite = true;
        const data = this.insertData;
        if (Array.isArray(data)) {
          if (data.length === 0) return { data: [], error: null };
          const keys = Object.keys(data[0]);
          const placeholders = [];
          for (const row of data) {
            placeholders.push(`(${keys.map(() => '?').join(', ')})`);
            params.push(...keys.map(k => row[k]));
          }
          sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES ${placeholders.join(', ')} RETURNING *`;
        } else {
          const keys = Object.keys(data);
          params.push(...keys.map(k => data[k]));
          sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')}) RETURNING *`;
        }
        
        const results = await executeQuery(sql, params, true);
        
        if (this.isSingle) {
          return { data: results[0] || null, error: null };
        }
        return { data: results, error: null };

      } else if (this.op === 'update') {
        isWrite = true;
        const data = this.updateData;
        const keys = Object.keys(data);
        const setSql = keys.map(k => `${k} = ?`).join(', ');
        params.push(...keys.map(k => data[k]));
        
        const whereSql = buildWhere(); // parameters for WHERE will be appended after SET params
        sql = `UPDATE ${this.tableName} SET ${setSql}${whereSql} RETURNING *`;
        
        const results = await executeQuery(sql, params, true);
        if (this.isSingle) {
          return { data: results[0] || null, error: null };
        }
        return { data: results, error: null };

      } else if (this.op === 'delete') {
        isWrite = true;
        const whereSql = buildWhere();
        sql = `DELETE FROM ${this.tableName}${whereSql} RETURNING *`;
        const results = await executeQuery(sql, params, true);
        return { data: results, error: null };

      } else if (this.op === 'upsert') {
        isWrite = true;
        const data = this.insertData;
        const records = Array.isArray(data) ? data : [data];
        if (records.length === 0) return { data: [], error: null };

        const keys = Object.keys(records[0]);
        const placeholders = [];
        for (const row of records) {
          placeholders.push(`(${keys.map(() => '?').join(', ')})`);
          params.push(...keys.map(k => row[k]));
        }

        const conflictCols = this.tableName === 'chat_members' ? 'room_id, user_id' : 'id';
        const updateSets = keys.filter(k => k !== 'id').map(k => `${k} = excluded.${k}`).join(', ');

        sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES ${placeholders.join(', ')} `;
        sql += `ON CONFLICT(${conflictCols}) DO UPDATE SET ${updateSets} RETURNING *`;

        const results = await executeQuery(sql, params, true);
        return { data: results, error: null };
      }
    } catch (err) {
      console.error(`[d1_compat] Error running query: ${sql}`, err.message);
      return { data: null, error: { message: err.message } };
    }
  }
}

// Storage adapter mockup (uses SQLite/D1 database table storage_objects)
const storageAdapter = {
  from(bucket) {
    return {
      async upload(fileName, buffer, options = {}) {
        try {
          const contentType = options.contentType || 'image/jpeg';
          const id = `${bucket}/${fileName}`;
          
          const sql = `INSERT INTO storage_objects (id, bucket, filename, content_type, data) VALUES (?, ?, ?, ?, ?) ` +
                      `ON CONFLICT(id) DO UPDATE SET content_type = excluded.content_type, data = excluded.data`;
          
          await executeQuery(sql, [id, bucket, fileName, contentType, buffer], true);
          return { data: { path: fileName }, error: null };
        } catch (err) {
          console.error(`[d1_compat - storage.upload] Error:`, err.message);
          return { data: null, error: { message: err.message } };
        }
      },

      async download(fileName) {
        try {
          const id = `${bucket}/${fileName}`;
          const sql = `SELECT content_type, data FROM storage_objects WHERE id = ?`;
          const results = await executeQuery(sql, [id], false);
          if (results.length === 0) {
            return { data: null, error: { message: 'File not found' } };
          }
          const row = results[0];
          
          let buffer = row.data;
          if (typeof buffer === 'string') {
            buffer = Buffer.from(buffer, 'base64');
          } else if (buffer instanceof Uint8Array) {
            buffer = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
          } else if (buffer && typeof buffer.arrayBuffer === 'function') {
            const ab = await buffer.arrayBuffer();
            buffer = Buffer.from(ab);
          } else if (buffer && buffer.type === 'Buffer' && Array.isArray(buffer.data)) {
            buffer = Buffer.from(buffer.data);
          } else if (buffer && !(buffer instanceof Buffer)) {
            buffer = Buffer.from(buffer);
          }
          
          return { data: { buffer, contentType: row.content_type }, error: null };
        } catch (err) {
          console.error(`[d1_compat - storage.download] Error:`, err.message);
          return { data: null, error: { message: err.message } };
        }
      },

      getPublicUrl(fileName) {
        const domain = process.env.VITE_APP_URL || '';
        const publicUrl = `${domain}/api/uploads/${bucket}/${fileName}`;
        return { data: { publicUrl } };
      }
    };
  }
};


const d1CompatClient = {
  from(tableName) {
    return new D1QueryBuilder(tableName);
  },
  storage: storageAdapter
};

module.exports = { supabase: d1CompatClient };
