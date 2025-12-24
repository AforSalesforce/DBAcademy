import initSqlJs, { Database } from 'sql.js';
import { DatabaseEngine, TableDefinition, QueryResult, ForeignKeyDefinition } from './types';

export class SQLiteEngine implements DatabaseEngine {
    type = 'sqlite' as const;
    private db: Database | null = null;

    async init() {
        const SQL = await initSqlJs({
            locateFile: file => `/${file}` // Loads from public/sql-wasm.wasm
        });
        this.db = new SQL.Database();

        // Seed Data
        this.db.run(`
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
            ssn text,
            FOREIGN KEY (license_id) REFERENCES drivers_license(id)
      );
      
      CREATE TABLE IF NOT EXISTS crime_scene_report (
        date integer,
        type text,
        description text,
        city text
      );
      
      CREATE TABLE IF NOT EXISTS interview (
            person_id integer,
            transcript text,
            FOREIGN KEY (person_id) REFERENCES person(id)
      );

      CREATE TABLE IF NOT EXISTS get_fit_now_member (
            id text PRIMARY KEY,
            person_id integer,
            name text,
            membership_start_date integer,
            membership_status text,
            FOREIGN KEY (person_id) REFERENCES person(id)
      );
      
      INSERT INTO crime_scene_report VALUES (20180115, 'murder', 'Security footage shows a man walking oddly.', 'SQL City');
      INSERT INTO crime_scene_report VALUES (20180115, 'theft', 'A donut was stolen.', 'SQL City');
      INSERT INTO crime_scene_report VALUES (20180215, 'murder', 'Another one.', 'New York');
    `);
    }

    async execute(query: string): Promise<QueryResult> {
        if (!this.db) throw new Error("DB not initialized");

        try {
            const res = this.db.exec(query);
            if (res.length === 0) {
                return { columns: [], rows: [] };
            }

            const columns = res[0].columns;
            const values = res[0].values;

            // Convert array of arrays to array of objects to match PGlite format for UI
            const rows = values.map(row => {
                const obj: any = {};
                columns.forEach((col, i) => {
                    obj[col] = row[i];
                });
                return obj;
            });

            return { columns, rows };
        } catch (e: any) {
            throw new Error(e.message);
        }
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
