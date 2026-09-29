'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Play, Download, Upload } from 'lucide-react';
import {
  SchemaDesign,
  DesignTable,
  DesignColumn,
  DesignForeignKey,
  generateDDL,
  introspectToDesign,
  useSchemaDesignerStore,
} from '@/stores/schema-designer';
import { TableDefinition, EngineType } from '@/db-engines/types';
import ERDiagram from './ERDiagram';

interface Props {
  engine: EngineType;
  projectId: string | null;
  currentSchema: TableDefinition[];
  /** Called when the user wants to run generated DDL in the editor. */
  onApplyDDL: (ddl: string) => void;
}

const NEUTRAL_TYPES = ['int', 'text', 'decimal(10,2)', 'timestamp', 'bool', 'uuid', 'json', 'float', 'varchar', 'date'];

const emptyColumn = (): DesignColumn => ({ name: '', type: 'text', nullable: true });
const emptyTable = (position: { x: number; y: number }): DesignTable => ({
  name: '',
  position,
  columns: [{ name: 'id', type: 'int', pk: true, nullable: false }],
  foreignKeys: [],
});
const emptyDesign = (engine: 'postgres' | 'sqlite', projectId: string | null): SchemaDesign => ({
  id: crypto.randomUUID(),
  name: 'New Schema',
  projectId,
  engine,
  tables: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export function SchemaDesigner({ engine, projectId, currentSchema, onApplyDDL }: Props) {
  const { designs, saveDesign, deleteDesign } = useSchemaDesignerStore();
  const safeEngine: 'postgres' | 'sqlite' = engine === 'postgres' ? 'postgres' : 'sqlite';

  const projectDesigns = designs.filter(
    d => d.projectId === projectId && d.engine === safeEngine
  );

  const [activeDesignId, setActiveDesignId] = useState<string | null>(
    projectDesigns[0]?.id ?? null
  );
  const [design, setDesign] = useState<SchemaDesign>(
    projectDesigns[0] ?? emptyDesign(safeEngine, projectId)
  );
  const [activeTableIdx, setActiveTableIdx] = useState<number | null>(null);
  const [ddlPreview, setDdlPreview] = useState<string | null>(null);

  const activeTable = activeTableIdx !== null ? design.tables[activeTableIdx] : null;

  // ── Design-level actions ──────────────────────────────────────────────────

  const updateDesign = (partial: Partial<SchemaDesign>) => {
    setDesign(d => ({ ...d, ...partial }));
  };

  const handleSave = async () => {
    await saveDesign(design);
    setActiveDesignId(design.id);
  };

  const handleImport = () => {
    const imported = introspectToDesign(currentSchema, safeEngine, {
      id: design.id,
      name: design.name,
      projectId,
      createdAt: design.createdAt,
    });
    setDesign(imported);
    setActiveTableIdx(null);
  };

  const handleGenerateDDL = () => {
    const ddl = generateDDL(design);
    setDdlPreview(ddl);
  };

  const handleApply = () => {
    if (ddlPreview) {
      onApplyDDL(ddlPreview);
      setDdlPreview(null);
    }
  };

  // ── Table actions ─────────────────────────────────────────────────────────

  const addTable = () => {
    const idx = design.tables.length;
    const pos = { x: (idx % 3) * 230, y: Math.floor(idx / 3) * 200 };
    const t = emptyTable(pos);
    updateDesign({ tables: [...design.tables, t] });
    setActiveTableIdx(idx);
  };

  const removeTable = (idx: number) => {
    const updated = design.tables.filter((_, i) => i !== idx);
    updateDesign({ tables: updated });
    setActiveTableIdx(null);
  };

  const updateTable = (idx: number, partial: Partial<DesignTable>) => {
    const updated = design.tables.map((t, i) => (i === idx ? { ...t, ...partial } : t));
    updateDesign({ tables: updated });
  };

  // ── Column actions ────────────────────────────────────────────────────────

  const addColumn = (tableIdx: number) => {
    const t = design.tables[tableIdx];
    updateTable(tableIdx, { columns: [...t.columns, emptyColumn()] });
  };

  const updateColumn = (tableIdx: number, colIdx: number, partial: Partial<DesignColumn>) => {
    const t = design.tables[tableIdx];
    const cols = t.columns.map((c, i) => (i === colIdx ? { ...c, ...partial } : c));
    updateTable(tableIdx, { columns: cols });
  };

  const removeColumn = (tableIdx: number, colIdx: number) => {
    const t = design.tables[tableIdx];
    updateTable(tableIdx, { columns: t.columns.filter((_, i) => i !== colIdx) });
  };

  // ── FK actions ────────────────────────────────────────────────────────────

  const addFK = (tableIdx: number) => {
    const t = design.tables[tableIdx];
    updateTable(tableIdx, {
      foreignKeys: [...t.foreignKeys, { column: '', refTable: '', refColumn: '' }],
    });
  };

  const updateFK = (tableIdx: number, fkIdx: number, partial: Partial<DesignForeignKey>) => {
    const t = design.tables[tableIdx];
    const fks = t.foreignKeys.map((fk, i) => (i === fkIdx ? { ...fk, ...partial } : fk));
    updateTable(tableIdx, { foreignKeys: fks });
  };

  const removeFK = (tableIdx: number, fkIdx: number) => {
    const t = design.tables[tableIdx];
    updateTable(tableIdx, { foreignKeys: t.foreignKeys.filter((_, i) => i !== fkIdx) });
  };

  // ── Derived ERD schema ────────────────────────────────────────────────────
  const erdSchema: TableDefinition[] = design.tables.map(t => ({
    name: t.name || '(unnamed)',
    columns: t.columns.map(c => ({ name: c.name || '…', type: c.type })),
    foreignKeys: t.foreignKeys.map(fk => ({
      column: fk.column,
      referencedTable: fk.refTable,
      referencedColumn: fk.refColumn,
    })),
  }));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 shrink-0 flex-wrap">
        <input
          value={design.name}
          onChange={e => updateDesign({ name: e.target.value })}
          className="text-sm font-medium bg-transparent border-b border-dashed border-white/15 focus:outline-none text-ink w-32"
        />
        <div className="flex-1" />
        <Btn title="Import from DB" onClick={handleImport}><Upload className="w-3.5 h-3.5" /></Btn>
        <Btn title="Add table" onClick={addTable}><Plus className="w-3.5 h-3.5" />Table</Btn>
        <Btn title="Generate DDL" onClick={handleGenerateDDL}><Play className="w-3.5 h-3.5" />DDL</Btn>
        <Btn title="Save design" onClick={handleSave} variant="primary"><Download className="w-3.5 h-3.5" />Save</Btn>
      </div>

      {/* DDL preview bar */}
      {ddlPreview && (
        <div className="bg-surface text-success p-3 text-xs font-mono overflow-x-auto shrink-0 border-b border-white/10">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-muted font-sans">Generated DDL</span>
            <div className="flex gap-2">
              <button
                onClick={handleApply}
                className="px-2 py-0.5 bg-accent text-canvas rounded text-xs font-sans hover:bg-accent/90"
              >
                Load into editor
              </button>
              <button
                onClick={() => setDdlPreview(null)}
                className="px-2 py-0.5 bg-card-hover text-white rounded text-xs font-sans hover:bg-card-hover"
              >
                Close
              </button>
            </div>
          </div>
          <pre className="whitespace-pre-wrap">{ddlPreview}</pre>
        </div>
      )}

      {/* Stacked: the sidebar panel is often under 300px wide, too narrow for side-by-side. */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Left: table list + column editor */}
        <div className="max-h-[55%] flex-shrink-0 border-b border-white/10 flex flex-col overflow-hidden">
          {/* Table list */}
          <div className="overflow-y-auto">
            {design.tables.length === 0 && (
              <p className="p-3 text-xs text-muted text-center">
                Click "Table" to add your first table.
              </p>
            )}
            {design.tables.map((t, ti) => (
              <button
                key={ti}
                onClick={() => setActiveTableIdx(ti)}
                className={`group w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors ${
                  activeTableIdx === ti
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'hover:bg-card text-ink'
                }`}
              >
                <span className="truncate">{t.name || '(unnamed)'}</span>
                <Trash2
                  className="w-3.5 h-3.5 text-ink group-hover:text-danger shrink-0"
                  onClick={e => { e.stopPropagation(); removeTable(ti); }}
                />
              </button>
            ))}
          </div>

          {/* Column editor for active table */}
          {activeTable !== null && activeTableIdx !== null && (
            <div className="border-t border-white/10 overflow-y-auto flex-1">
              <div className="p-2">
                <input
                  value={activeTable.name}
                  onChange={e => updateTable(activeTableIdx, { name: e.target.value })}
                  placeholder="Table name"
                  className="w-full mb-2 text-sm font-mono bg-card rounded px-2 py-1 focus:outline-none text-ink"
                />

                <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">Columns</p>
                {activeTable.columns.map((col, ci) => (
                  <div key={ci} className="flex items-center gap-1 mb-1">
                    <input
                      value={col.name}
                      onChange={e => updateColumn(activeTableIdx, ci, { name: e.target.value })}
                      placeholder="col name"
                      className="w-24 text-xs bg-card rounded px-1.5 py-1 focus:outline-none"
                    />
                    <select
                      value={col.type}
                      onChange={e => updateColumn(activeTableIdx, ci, { type: e.target.value })}
                      className="flex-1 text-xs bg-card rounded px-1 py-1 focus:outline-none"
                    >
                      {NEUTRAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <label title="PK" className={`cursor-pointer text-[10px] px-1 rounded ${col.pk ? 'bg-warm text-black' : 'bg-card-hover text-faint'}`}>
                      <input type="checkbox" className="sr-only" checked={!!col.pk} onChange={e => updateColumn(activeTableIdx, ci, { pk: e.target.checked, nullable: e.target.checked ? false : col.nullable })} />PK
                    </label>
                    <label title="Null" className={`cursor-pointer text-[10px] px-1 rounded ${col.nullable ? 'bg-card-hover text-faint' : 'bg-danger/10 text-danger'}`}>
                      <input type="checkbox" className="sr-only" checked={!col.nullable} onChange={e => updateColumn(activeTableIdx, ci, { nullable: !e.target.checked })} />NN
                    </label>
                    <Trash2
                      className="w-3 h-3 text-ink hover:text-danger cursor-pointer shrink-0"
                      onClick={() => removeColumn(activeTableIdx, ci)}
                    />
                  </div>
                ))}
                <button
                  onClick={() => addColumn(activeTableIdx)}
                  className="text-xs text-accent hover:text-accent mt-1"
                >
                  + column
                </button>

                {/* FK editor */}
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted mt-3 mb-1">Foreign Keys</p>
                {activeTable.foreignKeys.map((fk, fi) => (
                  <div key={fi} className="flex items-center gap-1 mb-1">
                    <input
                      value={fk.column}
                      onChange={e => updateFK(activeTableIdx, fi, { column: e.target.value })}
                      placeholder="col"
                      className="w-16 text-xs bg-card rounded px-1.5 py-1 focus:outline-none"
                    />
                    <span className="text-xs text-muted">→</span>
                    <input
                      value={fk.refTable}
                      onChange={e => updateFK(activeTableIdx, fi, { refTable: e.target.value })}
                      placeholder="table"
                      className="w-16 text-xs bg-card rounded px-1.5 py-1 focus:outline-none"
                    />
                    <span className="text-xs text-muted">.</span>
                    <input
                      value={fk.refColumn}
                      onChange={e => updateFK(activeTableIdx, fi, { refColumn: e.target.value })}
                      placeholder="col"
                      className="w-16 text-xs bg-card rounded px-1.5 py-1 focus:outline-none"
                    />
                    <Trash2
                      className="w-3 h-3 text-ink hover:text-danger cursor-pointer shrink-0"
                      onClick={() => removeFK(activeTableIdx, fi)}
                    />
                  </div>
                ))}
                <button
                  onClick={() => addFK(activeTableIdx)}
                  className="text-xs text-accent hover:text-accent mt-1"
                >
                  + foreign key
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: live ERD preview */}
        <div className="flex-1 min-h-[160px] relative overflow-hidden bg-canvas">
          {design.tables.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted">
              Add tables to see a live preview
            </div>
          ) : (
            <ERDiagram tables={erdSchema} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

function Btn({
  title, onClick, children, variant = 'default',
}: {
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'primary';
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
        variant === 'primary'
          ? 'bg-accent text-canvas hover:bg-accent/90'
          : 'bg-card text-ink hover:bg-card-hover'
      }`}
    >
      {children}
    </button>
  );
}
