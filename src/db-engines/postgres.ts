import { PGlite } from '@electric-sql/pglite';
import { DatabaseEngine, TableDefinition, QueryResult } from './types';

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

        await this.db.exec(`
      CREATE TABLE IF NOT EXISTS crime_scene_report (
        date integer,
        type text,
        description text,
        city text
      );
      DELETE FROM crime_scene_report;
      INSERT INTO crime_scene_report VALUES (20180115, 'murder', 'Security footage shows a man walking oddly.', 'SQL City');
      INSERT INTO crime_scene_report VALUES (20180115, 'theft', 'A donut was stolen.', 'SQL City');
      INSERT INTO crime_scene_report VALUES (20180215, 'murder', 'Another one.', 'New York');

      CREATE TABLE IF NOT EXISTS drivers_license (
        id integer PRIMARY KEY,
        age integer,
        height integer,
        eye_color text,
        hair_color text,
        gender text,
        plate_number text,
        car_make text,
        car_model text
      );

       CREATE TABLE IF NOT EXISTS person (
            id integer PRIMARY KEY,
            name text,
            license_id integer,
            address_number integer,
            address_street_name text,
            ssn text
      );
    `);
    }

    async execute(query: string): Promise<QueryResult> {
        if (!this.db) throw new Error('DB not initialized');
        const res = await this.db.query(query);
        const columns = res.fields.map(f => f.name);
        return { columns, rows: res.rows };
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
