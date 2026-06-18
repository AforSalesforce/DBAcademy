export type EngineType = 'postgres' | 'sqlite' | 'nosql' | 'javascript' | 'python' | 'java' | 'c' | 'cpp' | 'go';

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

/** Minimal contract shared by every engine type (DB, code, arch, net). */
export interface ExecutionEngine {
    readonly type: EngineType;
    init(): Promise<void>;
}

/** Full contract for SQL/NoSQL database engines. */
export interface DatabaseEngine extends ExecutionEngine {
    execute(query: string): Promise<QueryResult>;
    getSchema(): Promise<TableDefinition[]>;
    /** Serialise the full DB state to bytes for local/cloud snapshots. */
    serialize(): Promise<Uint8Array>;
    /** Restore DB state from a previously serialised snapshot (no re-seeding). */
    restore(data: Uint8Array): Promise<void>;
}

/** Result shape returned by code execution engines. */
export interface CodeResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    durationMs?: number;
}

/** Contract for language runtime engines (Python, JS, C, Java, etc.). */
export interface CodeEngine extends ExecutionEngine {
    execute(code: string, stdin?: string): Promise<CodeResult>;
}
