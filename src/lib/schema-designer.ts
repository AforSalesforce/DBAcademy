'use client';

import { create } from 'zustand';
import { localGetAll, localPut, localDelete } from './local-db';
import { TableDefinition } from './db/types';

// ── Data model ────────────────────────────────────────────────────────────────

export interface DesignColumn {
  name: string;
  type: string;  // dialect-neutral: 'int', 'text', 'decimal(10,2)', 'timestamp', 'bool'
  pk?: boolean;
  nullable?: boolean;
  unique?: boolean;
  default?: string;
}

export interface DesignForeignKey {
  column: string;
  refTable: string;
  refColumn: string;
}

export interface DesignTable {
  name: string;
  position: { x: number; y: number };
  columns: DesignColumn[];
  foreignKeys: DesignForeignKey[];
}

export interface SchemaDesign {
  id: string;
  name: string;
  projectId: string | null;
  engine: 'postgres' | 'sqlite';
  tables: DesignTable[];
  createdAt: string;
  updatedAt: string;
}

// ── DDL generation ────────────────────────────────────────────────────────────

const POSTGRES_TYPES: Record<string, string> = {
  int: 'INTEGER',
  integer: 'INTEGER',
  text: 'TEXT',
  varchar: 'VARCHAR(255)',
  bool: 'BOOLEAN',
  boolean: 'BOOLEAN',
  timestamp: 'TIMESTAMP',
  date: 'DATE',
  float: 'FLOAT',
  decimal: 'DECIMAL',
  json: 'JSONB',
  uuid: 'UUID',
};

const SQLITE_TYPES: Record<string, string> = {
  int: 'INTEGER',
  integer: 'INTEGER',
  text: 'TEXT',
  varchar: 'TEXT',
  bool: 'INTEGER',
  boolean: 'INTEGER',
  timestamp: 'TEXT',
  date: 'TEXT',
  float: 'REAL',
  decimal: 'REAL',
  json: 'TEXT',
  uuid: 'TEXT',
};

function mapType(raw: string, engine: 'postgres' | 'sqlite'): string {
  const map = engine === 'postgres' ? POSTGRES_TYPES : SQLITE_TYPES;
  const base = raw.toLowerCase().split('(')[0].trim();
  return map[base] ?? raw.toUpperCase();
}

function topoSort(tables: DesignTable[]): DesignTable[] {
  const nameToTable = new Map(tables.map(t => [t.name, t]));
  const visited = new Set<string>();
  const result: DesignTable[] = [];

  function visit(name: string, ancestors = new Set<string>()) {
    if (visited.has(name)) return;
    if (ancestors.has(name)) return; // cycle guard
    const table = nameToTable.get(name);
    if (!table) return;
    ancestors.add(name);
    for (const fk of table.foreignKeys) visit(fk.refTable, new Set(ancestors));
    visited.add(name);
    result.push(table);
  }

  for (const t of tables) visit(t.name);
  return result;
}

export function generateDDL(design: SchemaDesign): string {
  const sorted = topoSort(design.tables);
  const parts: string[] = [];

  for (const table of sorted) {
    const colDefs: string[] = [];

    for (const col of table.columns) {
      let typePart = mapType(col.type, design.engine);

      // Auto-increment PK shorthand
      if (col.pk) {
        if (design.engine === 'postgres') typePart = 'SERIAL';
        else typePart = 'INTEGER';
      }

      const parts2: string[] = [`  ${col.name} ${typePart}`];
      if (col.pk) parts2.push('PRIMARY KEY');
      if (!col.nullable && !col.pk) parts2.push('NOT NULL');
      if (col.unique && !col.pk) parts2.push('UNIQUE');
      if (col.default !== undefined && col.default !== '') {
        parts2.push(`DEFAULT ${col.default}`);
      }
      colDefs.push(parts2.join(' '));
    }

    for (const fk of table.foreignKeys) {
      colDefs.push(
        `  FOREIGN KEY (${fk.column}) REFERENCES ${fk.refTable}(${fk.refColumn})`
      );
    }

    parts.push(
      `CREATE TABLE ${table.name} (\n${colDefs.join(',\n')}\n);`
    );
  }

  return parts.join('\n\n');
}

/** Build a SchemaDesign from engine.getSchema() output. */
export function introspectToDesign(
  tables: TableDefinition[],
  engine: 'postgres' | 'sqlite',
  existing?: Partial<SchemaDesign>
): SchemaDesign {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? crypto.randomUUID(),
    name: existing?.name ?? 'Imported Schema',
    projectId: existing?.projectId ?? null,
    engine,
    tables: tables.map((t, i) => ({
      name: t.name,
      position: { x: (i % 4) * 220, y: Math.floor(i / 4) * 200 },
      columns: t.columns.map(c => ({
        name: c.name,
        type: c.type,
        nullable: true,
      })),
      foreignKeys: (t.foreignKeys ?? []).map(fk => ({
        column: fk.column,
        refTable: fk.referencedTable,
        refColumn: fk.referencedColumn,
      })),
    })),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

// ── Zustand store ─────────────────────────────────────────────────────────────

interface SchemaDesignerStore {
  designs: SchemaDesign[];
  hydrated: boolean;

  hydrate(): Promise<void>;
  saveDesign(design: SchemaDesign): Promise<void>;
  deleteDesign(id: string): Promise<void>;
}

export const useSchemaDesignerStore = create<SchemaDesignerStore>((set, get) => ({
  designs: [],
  hydrated: false,

  async hydrate() {
    if (get().hydrated) return;
    try {
      const all = await localGetAll<SchemaDesign>('schema-designs');
      set({ designs: all, hydrated: true });
    } catch (e) {
      console.error('schema-designer hydrate error', e);
      set({ hydrated: true });
    }
  },

  async saveDesign(design) {
    const updated = { ...design, updatedAt: new Date().toISOString() };
    await localPut('schema-designs', updated);
    set(s => ({
      designs: s.designs.some(d => d.id === design.id)
        ? s.designs.map(d => (d.id === design.id ? updated : d))
        : [...s.designs, updated],
    }));
  },

  async deleteDesign(id) {
    await localDelete('schema-designs', id);
    set(s => ({ designs: s.designs.filter(d => d.id !== id) }));
  },
}));
