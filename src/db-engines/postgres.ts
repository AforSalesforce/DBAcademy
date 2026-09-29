import { PGlite } from '@electric-sql/pglite';
import { DatabaseEngine, TableDefinition, QueryResult } from './types';
import { MYSTERY_TABLES, SEED_VERSION, USERS_TABLE, applySeed } from './seed/mystery';

export class PostgresEngine implements DatabaseEngine {
    type = 'postgres' as const;
    private db: PGlite | null = null;
    /**
     * When set, PGlite persists automatically to IndexedDB under this path
     * so the project survives page reloads without explicit serialize/restore.
     */
    private idbPath: string | null;

    constructor(options?: { idbPath?: string }) {
        this.idbPath = options?.idbPath ?? null;
    }

    async init() {
        this.db = this.idbPath ? new PGlite(this.idbPath) : new PGlite();
        await this.db.waitReady;
        await this.ensureSeed();
    }

    /**
     * Fill in the sample tables once per SEED_VERSION. With an idbPath the
     * database persists across reloads, so this only fills tables that are
     * empty — it never wipes the learner's edits. The version is kept in a
     * private `dbacademy` schema so it stays out of the Tables panel.
     */
    private async ensureSeed() {
        const db = this.db!;
        await db.exec(`
      CREATE SCHEMA IF NOT EXISTS dbacademy;
      CREATE TABLE IF NOT EXISTS dbacademy.meta (key text PRIMARY KEY, value text NOT NULL);
    `);
        const res = await db.query<{ value: string }>(`SELECT value FROM dbacademy.meta WHERE key = 'seed_version'`);
        if (Number(res.rows[0]?.value ?? 0) >= SEED_VERSION) return;

        await applySeed({
            exec: async sql => { await db.exec(sql); },
            rowCount: async table => {
                const r = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${table}`);
                return r.rows[0].n;
            },
        }, [...MYSTERY_TABLES, USERS_TABLE]);

        await db.query(
            `INSERT INTO dbacademy.meta (key, value) VALUES ('seed_version', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
            [String(SEED_VERSION)],
        );
    }

    /**
     * Wipe everything and re-seed. `init()` alone can't do this for a
     * persisted project — it just reopens the same stored database.
     */
    async reset() {
        if (!this.db) throw new Error('DB not initialized');
        await this.db.exec(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      DROP SCHEMA IF EXISTS dbacademy CASCADE;
    `);
        await this.ensureSeed();
    }

    async execute(query: string): Promise<QueryResult> {
        if (!this.db) throw new Error('DB not initialized');
        // exec (simple protocol) accepts several statements; query() only one.
        const results = await this.db.exec(query);
        // Several statements → show the last one that returned columns.
        const last = [...results].reverse().find(r => r.fields.length > 0);
        if (!last) return { columns: [], rows: [] };
        return { columns: last.fields.map(f => f.name), rows: last.rows };
    }

    async serialize(): Promise<Uint8Array> {
        if (!this.db) throw new Error('DB not initialized');
        try {
            // dumpDataDir is available in PGlite ≥ 0.2; cast to any for safety.
            const blob: Blob = await (this.db as any).dumpDataDir('auto');
            return new Uint8Array(await blob.arrayBuffer());
        } catch {
            // If idb-backed, state is already persisted; return empty marker.
            return new Uint8Array(0);
        }
    }

    async restore(data: Uint8Array): Promise<void> {
        if (data.length === 0) {
            // idb-backed project — just re-open the same idb path.
            if (this.idbPath) {
                this.db = new PGlite(this.idbPath);
                await this.db.waitReady;
            }
            return;
        }
        const blob = new Blob([data.buffer as ArrayBuffer]);
        this.db = new PGlite({ loadDataDir: blob } as any);
        await this.db.waitReady;
    }

    async getSchema(): Promise<TableDefinition[]> {
        if (!this.db) throw new Error('DB not initialized');
        const res = await this.db.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `);

        const tables: Record<string, TableDefinition> = {};
        res.rows.forEach((row: any) => {
            if (!tables[row.table_name]) {
                tables[row.table_name] = { name: row.table_name, columns: [] };
            }
            tables[row.table_name].columns.push({
                name: row.column_name,
                type: row.data_type,
            });
        });

        return Object.values(tables);
    }
}
