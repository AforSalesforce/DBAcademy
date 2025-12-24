import { PGlite } from '@electric-sql/pglite';
import { DatabaseEngine, TableDefinition, QueryResult } from './types';

export class PostgresEngine implements DatabaseEngine {
    type = 'postgres' as const;
    private db: PGlite | null = null;

    async init() {
        this.db = new PGlite();
        await this.db.waitReady;

        // Seed initial data
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
        if (!this.db) throw new Error("DB not initialized");
        const res = await this.db.query(query);
        const columns = res.fields.map(f => f.name);
        // PGlite returns rows as objects {col: val}, we want arrays for generic handling or just standardize?
        // PGlite actually returns rows as objects by default. 
        // Let's standardize on rows as objects for now to match UI, OR standardize to arrays. 
        // My previous ResultsTable used objects. Let's keep using objects in the UI wrapper, 
        // but the Interface `QueryResult` said `rows: any[][]`.
        // Let's change the interface to `rows: any[]` (objects) to make it easier for now, 
        // OR implementing row conversion. PGlite `query` returns `{ rows: [...] }` where rows are objects.

        // Wait, let's fix the Interface `rows` type in next step or just return objects.
        // I'll stick to objects for now for minimal change.
        return {
            columns,
            rows: res.rows, // Array of objects
        };
    }

    async getSchema(): Promise<TableDefinition[]> {
        if (!this.db) throw new Error("DB not initialized");
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
                type: row.data_type
            });
        });

        return Object.values(tables);
    }
}
