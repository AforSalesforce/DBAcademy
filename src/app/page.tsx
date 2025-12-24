'use client';

import React, { useState, useEffect } from 'react';
import SqlEditor from '@/components/SqlEditor';
import ResultsTable from '@/components/ResultsTable';
import Sidebar, { Module, Lesson } from '@/components/Sidebar';
import SchemaViewer from '@/components/SchemaViewer';
import ERDiagram from '@/components/ERDiagram';
import { DatabaseEngine, TableDefinition } from '@/lib/db/types';
import { PostgresEngine } from '@/lib/db/postgres';
import { SQLiteEngine } from '@/lib/db/sqlite';
import { NoSQLEngine } from '@/lib/db/nosql';
import { faker } from '@faker-js/faker';

const DEFAULT_QUERY_SQL = `-- Find the killer
SELECT * FROM crime_scene_report
WHERE city = 'SQL City' 
ORDER BY date;`;

const DEFAULT_QUERY_NOSQL = `// Find users with 'admin' role
db.users.find({ role: "admin" })`;

const INITIAL_MODULES: Module[] = [
  {
    id: 'sqlite-1',
    title: 'Module 1: The Murder Mystery',
    lessons: [
      { id: '1-1', title: 'The Crime Scene', completed: false }
    ],
    engine: 'sqlite'
  },
  {
    id: 'postgres-1',
    title: 'Module 1: Postgres Basics',
    lessons: [
      { id: 'pg-1-1', title: 'Intro to SQL', completed: false }
    ],
    engine: 'postgres'
  },
  {
    id: 'nosql-1',
    title: 'Module 1: Mongo Collections',
    lessons: [
      { id: 'mongo-1-1', title: 'Finding Documents', completed: false }
    ],
    engine: 'nosql'
  }
];

export default function Home() {
  const [dbType, setDbType] = useState<'postgres' | 'sqlite' | 'nosql'>('sqlite');
  const [db, setDb] = useState<DatabaseEngine | null>(null);
  const [query, setQuery] = useState(DEFAULT_QUERY_SQL);
  const [results, setResults] = useState<any[]>([]);
  const [schema, setSchema] = useState<TableDefinition[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'curriculum' | 'schema' | 'erd'>('curriculum');
  const [isSeeding, setIsSeeding] = useState(false);
  const [modules, setModules] = useState<Module[]>(INITIAL_MODULES);

  // New state for non-destructive data viewing
  const [viewingTableName, setViewingTableName] = useState<string | null>(null);

  // Initialize DB when type changes
  useEffect(() => {
    let engine: DatabaseEngine;

    const initDb = async () => {
      setLoading(true);
      setError(null);
      setResults([]);
      setSchema([]);
      setViewingTableName(null);

      try {
        if (dbType === 'postgres') {
          engine = new PostgresEngine();
          setQuery(DEFAULT_QUERY_SQL);
        } else if (dbType === 'sqlite') {
          engine = new SQLiteEngine();
          setQuery(DEFAULT_QUERY_SQL);
        } else {
          engine = new NoSQLEngine();
          setQuery(DEFAULT_QUERY_NOSQL);
        }

        await engine.init();
        setDb(engine);

        // Load schema immediately
        const schemaData = await engine.getSchema();
        setSchema(schemaData);

      } catch (err: any) {
        console.error("Failed to init DB", err);
        setError(`Failed to load ${dbType} engine: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    initDb();
  }, [dbType]);

  const refreshSchema = async () => {
    if (!db) return;
    try {
      const schemaData = await db.getSchema();
      setSchema(schemaData);
    } catch (e) {
      console.error("Failed to refresh schema", e);
    }
  };

  const runQuery = async () => {
    if (!db) return;
    setError(null);
    setViewingTableName(null); // Clear viewing table mode
    try {
      const res = await db.execute(query);
      setResults(res.rows);

      if (db.type === 'nosql') {
        await refreshSchema();
      } else {
        if (query.match(/CREATE|DROP|ALTER/i)) {
          await refreshSchema();
        }
      }
    } catch (err: any) {
      setError(err.message);
      setResults([]);
    }
  };

  const executeDirect = async (sql: string) => {
    if (!db) return;
    setError(null);
    try {
      const res = await db.execute(sql);
      setResults(res.rows);
    } catch (err: any) {
      setError(err.message);
      setResults([]);
    }
  }

  const handleViewTable = (tableName: string) => {
    setViewingTableName(tableName);
    let viewQuery = "";
    if (dbType === 'nosql') {
      viewQuery = `db.${tableName}.find({})`;
    } else {
      viewQuery = `SELECT * FROM ${tableName} LIMIT 100;`;
    }
    // Do NOT setQuery(viewQuery) to preserve editor state
    executeDirect(viewQuery);
  };

  const handleSeedData = async () => {
    if (!db) return;
    setIsSeeding(true);
    setError(null);

    try {
      if (dbType === 'nosql') {
        let insertScript = `// Seed 50 Users\n`;
        for (let i = 0; i < 50; i++) {
          const user = {
            name: faker.person.fullName(),
            email: faker.internet.email(),
            role: faker.helpers.arrayElement(['user', 'admin', 'moderator', 'guest']),
            age: faker.number.int({ min: 18, max: 80 }),
            isActive: faker.datatype.boolean()
          };
          insertScript += `db.users.insert(${JSON.stringify(user)});\n`;
        }
        await db.execute(insertScript);
        setResults([{ message: "Successfully seeded 50 users into 'users' collection." }]);
      } else {
        const createTableSql = `
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY,
                    name TEXT,
                    email TEXT,
                    job TEXT,
                    created_at TEXT
                );
            `;
        await db.execute(createTableSql);

        let insertSql = "INSERT INTO users (id, name, email, job, created_at) VALUES ";
        const values: string[] = [];
        for (let i = 0; i < 50; i++) {
          const name = faker.person.fullName().replace(/'/g, "''");
          const email = faker.internet.email().replace(/'/g, "''");
          const job = faker.person.jobTitle().replace(/'/g, "''");
          const date = new Date().toISOString();
          const id = Date.now() + i;
          values.push(`(${id}, '${name}', '${email}', '${job}', '${date}')`);
        }
        insertSql += values.join(", ") + ";";
        await db.execute(insertSql);
        setResults([{ message: "Successfully seeded 50 users into 'users' table." }]);
      }
      await refreshSchema();
      setActiveTab('schema');
    } catch (err: any) {
      setError("Seeding failed: " + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleResetDb = async () => {
    if (!db) return;
    setLoading(true);
    try {
      await db.init();
      const schemaData = await db.getSchema();
      setSchema(schemaData);
      setResults([{ message: "Database reset to initial state." }]);
      setQuery(dbType === 'nosql' ? DEFAULT_QUERY_NOSQL : DEFAULT_QUERY_SQL);
      setViewingTableName(null);
    } catch (e: any) {
      setError("Reset failed: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  const handleSwitchDb = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDbType(e.target.value as any);
  };

  const handleAddModule = (title: string) => {
    setModules(prev => [...prev, {
      id: Date.now().toString(),
      title: title,
      lessons: [],
      engine: dbType
    }]);
  };

  const handleAddLesson = (moduleId: string, title: string) => {
    setModules(prev => prev.map(m => {
      if (m.id === moduleId) {
        return {
          ...m,
          lessons: [...m.lessons, {
            id: Date.now().toString(),
            title: title,
            completed: false
          }]
        }
      }
      return m;
    }));
  };

  const handleSelectLesson = (lesson: Lesson) => {
    console.log("Selected lesson:", lesson);
  };

  const activeModules = modules.filter(m => m.engine === dbType);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <div className="loader"></div>
        <div>Loading Engine...</div>
      </div>
    );
  }

  return (
    <div className="layout-container">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 24, height: 24, background: 'var(--accent)', borderRadius: 4 }}></div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>DB Academy</h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-tertiary)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Engine:</label>
            <select
              value={dbType}
              onChange={handleSwitchDb}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                fontWeight: 500,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="postgres">PostgreSQL (PGlite)</option>
              <option value="sqlite">SQLite (WASM)</option>
              <option value="nosql">NoSQL (In-Memory JS)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={handleSeedData} disabled={isSeeding}>
            {isSeeding ? 'Seeding...' : '🌱 Seed Data'}
          </button>
          <button className="btn btn-secondary" onClick={handleResetDb}>
            Reset DB
          </button>
          <button className="btn btn-primary" onClick={runQuery}>
            <span>▶</span> Run Query
          </button>
        </div>
      </header>

      <div className="main-content">
        <div className="sidebar">
          <div className="panel-header" style={{ padding: 0, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
            <button
              onClick={() => setActiveTab('curriculum')}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: activeTab === 'curriculum' ? 'var(--bg-tertiary)' : 'transparent',
                border: 'none',
                color: activeTab === 'curriculum' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 600,
                borderBottom: activeTab === 'curriculum' ? '2px solid var(--accent)' : 'none'
              }}
            >
              Curriculum
            </button>
            <button
              onClick={() => setActiveTab('schema')}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: activeTab === 'schema' ? 'var(--bg-tertiary)' : 'transparent',
                border: 'none',
                color: activeTab === 'schema' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 600,
                borderBottom: activeTab === 'schema' ? '2px solid var(--accent)' : 'none'
              }}
            >
              {dbType === 'nosql' ? 'Collections' : 'Tables'}
            </button>
            <button
              onClick={() => setActiveTab('erd')}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: activeTab === 'erd' ? 'var(--bg-tertiary)' : 'transparent',
                border: 'none',
                color: activeTab === 'erd' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: 600,
                borderBottom: activeTab === 'erd' ? '2px solid var(--accent)' : 'none'
              }}
            >
              ER Diagram
            </button>
          </div>

          <div style={{ flex: 1, overflow: 'auto' }}>
            {activeTab === 'curriculum' &&
              <Sidebar
                modules={activeModules}
                onAddModule={handleAddModule}
                onAddLesson={handleAddLesson}
                onSelectLesson={handleSelectLesson}
              />
            }
            {activeTab === 'schema' && <SchemaViewer tables={schema} onViewTable={handleViewTable} />}
            {activeTab === 'erd' && (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  Visualizing {schema.length} tables and their relationships
                </div>
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                  <ERDiagram tables={schema} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="editor-area">
          <div className="panel-header">
            <span>{dbType === 'nosql' ? 'Mongo Script Editor' : 'SQL Editor'}</span>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <SqlEditor
              value={query}
              onChange={(val) => setQuery(val || '')}
              onRun={runQuery}
              language={dbType === 'nosql' ? 'javascript' : 'sql'}
            />
          </div>

          <div className="results-area">
            <div className="panel-header" style={{
              justifyContent: 'space-between',
              background: viewingTableName ? 'rgba(59, 130, 246, 0.1)' : undefined
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span>Query Results</span>
                {viewingTableName && (
                  <span style={{
                    fontSize: '0.75rem',
                    background: 'var(--accent)',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 600
                  }}>
                    Viewing Table: {viewingTableName}
                  </span>
                )}
              </div>

              <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
                {dbType === 'nosql' && results.length > 0 ? `${results.length} documents` : `${results.length} rows`}
              </span>
            </div>
            <ResultsTable results={results} error={error} />
          </div>
        </div>
      </div>
    </div>
  );
}
