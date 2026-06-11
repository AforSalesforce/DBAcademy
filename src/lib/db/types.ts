export interface ColumnDefinition {
    name: string;
    type: string;
}

export interface ForeignKeyDefinition {
    column: string;
    referencedTable: string;
    referencedColumn: string;
}

export interface TableDefinition {
    name: string;
    columns: ColumnDefinition[];
    foreignKeys?: ForeignKeyDefinition[];
}

export interface QueryResult {
    columns: string[];
    rows: any[];
    message?: string;
}

export interface DatabaseEngine {
    type: 'postgres' | 'sqlite' | 'nosql';
    init(): Promise<void>;
    execute(query: string): Promise<QueryResult>;
    getSchema(): Promise<TableDefinition[]>;
    /** Serialise the full DB state to bytes for local/cloud snapshots. */
    serialize(): Promise<Uint8Array>;
    /** Restore DB state from a previously serialised snapshot (no re-seeding). */
    restore(data: Uint8Array): Promise<void>;
}
