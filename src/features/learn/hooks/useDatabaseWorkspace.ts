'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { faker } from '@faker-js/faker';
import { DatabaseEngine, TableDefinition, EngineType } from '@/db-engines/types';
import { PostgresEngine } from '@/db-engines/postgres';
import { SQLiteEngine } from '@/db-engines/sqlite';
import { NoSQLEngine } from '@/db-engines/nosql';
import { useProgressStore } from '@/stores/progress-store';
import { useRunHistoryStore } from '@/stores/run-history-store';
import { saveSnapshot, loadSnapshot } from '@/lib/persistence/local-db';

export const DEFAULT_QUERY_SQL = `-- Find the killer
SELECT * FROM crime_scene_report
WHERE city = 'SQL City'
ORDER BY date;`;

export const DEFAULT_QUERY_NOSQL = `// Find users with 'admin' role
db.users.find({ role: "admin" })`;

const MUTATING_SQL = /\b(CREATE|DROP|ALTER|INSERT|UPDATE|DELETE|TRUNCATE)\b/i;
const SNAPSHOT_DEBOUNCE_MS = 2000;

function generateFakeValue(name: string, type: string, dbType: EngineType) {
  const n = name.toLowerCase();
  const t = type.toLowerCase();
  if (n.includes('email')) return faker.internet.email();
  if (n.includes('name')) return faker.person.fullName();
  if (n.includes('job') || n.includes('role') || n.includes('title')) return faker.person.jobTitle();
  if (n.includes('city')) return faker.location.city();
  if (n.includes('address')) return faker.location.streetAddress();
  if (n.includes('phone')) return faker.phone.number();
  if (n.includes('date') || n.includes('time') || n.includes('at')) return new Date().toISOString();
  if (n.includes('age')) return faker.number.int({ min: 18, max: 90 });
  if (n.includes('price') || n.includes('cost')) return faker.commerce.price();
  if (n.includes('desc') || n.includes('body')) return faker.lorem.sentence();
  if (n.includes('status')) return faker.helpers.arrayElement(['active', 'inactive', 'pending']);
  if (t.includes('int') || t.includes('number') || t.includes('float') || t.includes('real')) return faker.number.int({ max: 1000 });
  if (t.includes('bool')) return dbType === 'postgres' ? true : 1;
  return faker.lorem.word();
}

/**
 * Owns the lifecycle of a single DatabaseEngine for the active project:
 * init/restore on (dbType, projectId) change, query execution + history
 * logging, schema refresh, debounced snapshotting, and sample-data seeding.
 */
export function useDatabaseWorkspace(dbType: EngineType, activeProjectId: string) {
  const [db, setDb] = useState<DatabaseEngine | null>(null);
  const [query, setQuery] = useState(DEFAULT_QUERY_SQL);
  const [results, setResults] = useState<any[]>([]);
  const [resultColumns, setResultColumns] = useState<string[]>([]);
  const [schema, setSchema] = useState<TableDefinition[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [viewingTableName, setViewingTableName] = useState<string | null>(null);
  const [lastRunDuration, setLastRunDuration] = useState<number | null>(null);

  const { incrementQueries } = useProgressStore();
  const runHistoryStore = useRunHistoryStore();
  const snapshotTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Init DB when dbType or project changes ──────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const initDb = async () => {
      setLoading(true);
      setError(null);
      setResults([]);
      setResultColumns([]);
      setSchema([]);
      setViewingTableName(null);

      try {
        let engine: DatabaseEngine;
        if (dbType === 'postgres') {
          const idbPath = `idb://dbacademy-${activeProjectId}`;
          engine = new PostgresEngine({ idbPath });
        } else if (dbType === 'sqlite') {
          engine = new SQLiteEngine();
        } else {
          engine = new NoSQLEngine();
        }

        if (dbType !== 'postgres') {
          const snapshot = await loadSnapshot(activeProjectId);
          if (snapshot) {
            await engine.init();
            try {
              await engine.restore(snapshot);
            } catch {
              await engine.init(); // fallback to fresh seed
            }
          } else {
            await engine.init();
          }
        } else {
          await engine.init();
        }

        if (cancelled) return;
        setDb(engine);
        const schemaData = await engine.getSchema();
        setSchema(schemaData);

        setQuery(prev => {
          if (!prev || prev === (dbType !== 'nosql' ? DEFAULT_QUERY_NOSQL : DEFAULT_QUERY_SQL)) {
            return dbType === 'nosql' ? DEFAULT_QUERY_NOSQL : DEFAULT_QUERY_SQL;
          }
          return prev;
        });
      } catch (err: any) {
        if (!cancelled) setError(`Failed to load ${dbType} engine: ${err.message}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    initDb();
    return () => { cancelled = true; };
  }, [dbType, activeProjectId]);

  const refreshSchema = useCallback(async () => {
    if (!db) return;
    try {
      setSchema(await db.getSchema());
    } catch { /* ignore */ }
  }, [db]);

  const scheduleSnapshot = useCallback((engine: DatabaseEngine, projectId: string) => {
    if (engine.type === 'postgres') return; // idb handles it
    if (snapshotTimer.current) clearTimeout(snapshotTimer.current);
    snapshotTimer.current = setTimeout(async () => {
      try {
        const data = await engine.serialize();
        await saveSnapshot(projectId, data);
      } catch { /* best-effort */ }
    }, SNAPSHOT_DEBOUNCE_MS);
  }, []);

  const runQuery = useCallback(async (overrideQuery?: string) => {
    if (!db) return;
    const q = overrideQuery ?? query;
    setError(null);
    setViewingTableName(null);

    const start = performance.now();
    try {
      const res = await db.execute(q);
      const duration = Math.round(performance.now() - start);
      setResults(res.rows);
      setResultColumns(res.columns);
      setLastRunDuration(duration);
      incrementQueries();

      await runHistoryStore.addRun({
        projectId: activeProjectId,
        engine: dbType,
        body: q,
        status: 'ok',
        rowCount: res.rows.length,
        durationMs: duration,
      });

      if (dbType === 'nosql' || q.match(MUTATING_SQL)) {
        await refreshSchema();
        scheduleSnapshot(db, activeProjectId);
      }
    } catch (err: any) {
      const duration = Math.round(performance.now() - start);
      setError(err.message);
      setResults([]);
      setResultColumns([]);
      setLastRunDuration(null);

      await runHistoryStore.addRun({
        projectId: activeProjectId,
        engine: dbType,
        body: q,
        status: 'error',
        errorMessage: err.message,
        rowCount: 0,
        durationMs: duration,
      });
    }
  }, [db, query, dbType, activeProjectId, incrementQueries, runHistoryStore, refreshSchema, scheduleSnapshot]);

  const executeDirect = useCallback(async (sql: string) => {
    if (!db) return;
    setError(null);
    try {
      const res = await db.execute(sql);
      setResults(res.rows);
      setResultColumns(res.columns);
    } catch (err: any) {
      setError(err.message);
      setResults([]);
      setResultColumns([]);
    }
  }, [db]);

  const handleViewTable = useCallback((tableName: string) => {
    setViewingTableName(tableName);
    const viewQuery = dbType === 'nosql'
      ? `db.${tableName}.find({})`
      : `SELECT * FROM ${tableName} LIMIT 100;`;
    executeDirect(viewQuery);
  }, [dbType, executeDirect]);

  const handleSeedData = useCallback(async () => {
    if (!db) return;
    setIsSeeding(true);
    setError(null);
    try {
      if (viewingTableName) {
        const tableDef = schema.find(t => t.name === viewingTableName);
        if (!tableDef) throw new Error(`Table '${viewingTableName}' not found.`);
        if (dbType === 'nosql') {
          let script = '';
          for (let i = 0; i < 10; i++) {
            const doc: any = {};
            tableDef.columns.forEach(col => {
              if (col.name === '_id') return;
              doc[col.name] = generateFakeValue(col.name, col.type, dbType);
            });
            script += `db.${viewingTableName}.insert(${JSON.stringify(doc)});\n`;
          }
          await db.execute(script);
        } else {
          const insertCols = tableDef.columns.filter(c => c.name.toLowerCase() !== 'id');
          if (insertCols.length === 0) throw new Error('Cannot seed table with no writable columns.');
          const rows: string[] = [];
          for (let i = 0; i < 10; i++) {
            const vals = insertCols.map(col => {
              const v = generateFakeValue(col.name, col.type, dbType);
              if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
              if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
              return v;
            });
            rows.push(`(${vals.join(', ')})`);
          }
          await db.execute(`INSERT INTO ${viewingTableName} (${insertCols.map(c => c.name).join(', ')}) VALUES ${rows.join(', ')};`);
        }
        setResults([{ message: `Seeded 10 rows into '${viewingTableName}'.` }]);
        handleViewTable(viewingTableName);
      } else {
        if (dbType === 'nosql') {
          let script = '';
          for (let i = 0; i < 50; i++) {
            const user = { name: faker.person.fullName(), email: faker.internet.email(), role: faker.helpers.arrayElement(['user', 'admin', 'moderator', 'guest']), age: faker.number.int({ min: 18, max: 80 }), isActive: faker.datatype.boolean() };
            script += `db.users.insert(${JSON.stringify(user)});\n`;
          }
          await db.execute(script);
          setResults([{ message: 'Seeded 50 users.' }]);
        } else {
          const idType = dbType === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
          await db.execute(`CREATE TABLE IF NOT EXISTS users (id ${idType}, name TEXT, email TEXT, job TEXT, created_at TEXT);`);
          await db.execute(`CREATE TABLE IF NOT EXISTS products (id ${idType}, name TEXT, price DECIMAL(10,2), category TEXT, stock INTEGER DEFAULT 0);`);
          const rows: string[] = [];
          for (let i = 0; i < 50; i++) {
            rows.push(`('${faker.person.fullName().replace(/'/g, "''")}', '${faker.internet.email().replace(/'/g, "''")}', '${faker.person.jobTitle().replace(/'/g, "''")}', '${new Date().toISOString()}')`);
          }
          await db.execute(`INSERT INTO users (name, email, job, created_at) VALUES ${rows.join(', ')};`);
          setResults([{ message: 'Seeded 50 users.' }]);
        }
      }
      await refreshSchema();
      scheduleSnapshot(db, activeProjectId);
    } catch (err: any) {
      setError('Seeding failed: ' + err.message);
    } finally {
      setIsSeeding(false);
    }
  }, [db, viewingTableName, schema, dbType, activeProjectId, handleViewTable, refreshSchema, scheduleSnapshot]);

  const handleResetDb = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      await db.init();
      setSchema(await db.getSchema());
      setResults([{ message: 'Database reset to initial state.' }]);
      setResultColumns([]);
      setQuery(dbType === 'nosql' ? DEFAULT_QUERY_NOSQL : DEFAULT_QUERY_SQL);
      setViewingTableName(null);
    } catch (e: any) {
      setError('Reset failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [db, dbType]);

  return {
    db, query, setQuery, results, resultColumns, schema, error, setError,
    loading, isSeeding, viewingTableName, lastRunDuration,
    refreshSchema, runQuery, executeDirect, handleViewTable,
    handleSeedData, handleResetDb,
  };
}
