import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { DatabaseEngine, TableDefinition, QueryResult, ForeignKeyDefinition } from './types';
import { MYSTERY_TABLES, SEED_VERSION, applySeed } from './seed/mystery';

const WASM_URL = (file: string) =>
    `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/${file}`;

let _SQL: SqlJsStatic | null = null;
async function getSqlJs(): Promise<SqlJsStatic> {
    // Node (tests) loads the wasm from node_modules; the browser uses the CDN.
    if (!_SQL) _SQL = await initSqlJs(typeof window === 'undefined' ? {} : { locateFile: WASM_URL });
    return _SQL;
}

export class SQLiteEngine implements DatabaseEngine {
    type = 'sqlite' as const;
    private db: Database | null = null;

    async init() {
        const SQL = await getSqlJs();
        this.db = new SQL.Database();
        await this.ensureSeed();
    }

    /**
     * Fill in the sample tables once per SEED_VERSION. Runs on restore too,
     * so projects saved before the data existed pick it up (non-empty tables
     * are left alone). The version lives in SQLite's own `user_version`.
     */
    private async ensureSeed() {
        const db = this.db!;
        const version = Number(db.exec('PRAGMA user_version')[0]?.values[0]?.[0] ?? 0);
        if (version >= SEED_VERSION) return;
        await applySeed({
            exec: async sql => { db.exec(sql); },
            rowCount: async table => Number(db.exec(`SELECT COUNT(*) FROM ${table}`)[0].values[0][0]),
        }, MYSTERY_TABLES);
        db.exec(`PRAGMA user_version = ${SEED_VERSION}`);
    }

    async execute(query: string): Promise<QueryResult> {
        if (!this.db) throw new Error("DB not initialized");

        // Step through statements ourselves rather than using db.exec():
        // exec() drops a SELECT that matches no rows entirely, so the UI
        // couldn't tell "0 rows matched" from "statement ran".
        let last: QueryResult = { columns: [], rows: [] };
        try {
            for (const stmt of this.db.iterateStatements(query)) {
                const columns = stmt.getColumnNames();
                const rows: Record<string, unknown>[] = [];
                while (stmt.step()) {
                    const values = stmt.get();
                    const row: Record<string, unknown> = {};
                    columns.forEach((col, i) => { row[col] = values[i]; });
                    rows.push(row);
                }
                // Several statements → show the last one that returns columns.
                if (columns.length > 0) last = { columns, rows };
            }
        } catch (e: any) {
            throw new Error(e?.message ?? String(e));
        }
        return last;
    }

    async reset() {
        await this.init();
    }

    async serialize(): Promise<Uint8Array> {
        if (!this.db) throw new Error('DB not initialized');
        return this.db.export();
    }

    async restore(data: Uint8Array): Promise<void> {
        const SQL = await getSqlJs();
        this.db = new SQL.Database(data);
        await this.ensureSeed();
    }

    async getSchema(): Promise<TableDefinition[]> {
        if (!this.db) throw new Error("DB not initialized");

        // Get list of tables
        const tablesRes = this.db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
        if (tablesRes.length === 0) return [];

        const tables: TableDefinition[] = [];
        const tableNames = tablesRes[0].values.map(v => v[0] as string);

        for (const tableName of tableNames) {
            const infoRes = this.db.exec(`PRAGMA table_info(${tableName})`);
            let columns: any[] = [];
            if (infoRes.length > 0) {
                columns = infoRes[0].values.map(v => ({
                    name: v[1] as string,
                    type: v[2] as string
                }));
            }

            // Get FKs
            const fkRes = this.db.exec(`PRAGMA foreign_key_list(${tableName})`);
            let foreignKeys: ForeignKeyDefinition[] = [];
            if (fkRes.length > 0) {
                // id, seq, table, from, to, on_update, on_delete, match
                foreignKeys = fkRes[0].values.map(row => ({
                    column: row[3] as string,      // 'from' column in this table
                    referencedTable: row[2] as string, // 'table' referenced
                    referencedColumn: row[4] as string // 'to' column in referenced table
                }));
            }

            tables.push({ name: tableName, columns, foreignKeys });
        }

        return tables;
    }
}
