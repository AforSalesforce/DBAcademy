'use client';

import React, { useState, useEffect } from 'react';
import SqlEditor from '@/components/SqlEditor';
import ResultsTable from '@/components/ResultsTable';
import Sidebar, { Module, Lesson } from '@/components/Sidebar';
import SchemaViewer from '@/components/SchemaViewer';
import ERDiagram from '@/components/ERDiagram';
import { LessonView } from '@/components/LessonView';
import { Database, GraduationCap } from 'lucide-react';
import { DatabaseEngine, TableDefinition } from '@/lib/db/types';
import { PostgresEngine } from '@/lib/db/postgres';
import { SQLiteEngine } from '@/lib/db/sqlite';
import { NoSQLEngine } from '@/lib/db/nosql';
import { faker } from '@faker-js/faker';
import { CURRICULUM, getLessonById, LessonContentType } from '@/lib/curriculum';


const DEFAULT_QUERY_SQL = `-- Find the killer
SELECT * FROM crime_scene_report
WHERE city = 'SQL City' 
ORDER BY date;`;

const DEFAULT_QUERY_NOSQL = `// Find users with 'admin' role
db.users.find({ role: "admin" })`;

// Initialize modules from CURRICULUM, adding state properties
const INITIAL_MODULES_STATE: Module[] = CURRICULUM.map(m => ({
  id: m.id,
  title: m.title,
  engine: m.engine,
  lessons: m.lessons.map(l => ({
    id: l.id,
    title: l.title,
    completed: false
  }))
}));

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

  const [modules, setModules] = useState<Module[]>(INITIAL_MODULES_STATE);
  const [activeLesson, setActiveLesson] = useState<LessonContentType | null>(null);

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

      // Reset active lesson if it doesn't match the new engine
      // But actually, we might want to switch engine IF a lesson is selected.
      // For now, let's just clear active lesson if engine switches manually.
      // setActiveLesson(null); 

      try {
        if (dbType === 'postgres') {
          engine = new PostgresEngine();
          if (!query || query === DEFAULT_QUERY_NOSQL) setQuery(DEFAULT_QUERY_SQL);
        } else if (dbType === 'sqlite') {
          engine = new SQLiteEngine();
          if (!query || query === DEFAULT_QUERY_NOSQL) setQuery(DEFAULT_QUERY_SQL);
        } else {
          engine = new NoSQLEngine();
          if (!query || query === DEFAULT_QUERY_SQL) setQuery(DEFAULT_QUERY_NOSQL);
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

  const generateFakeValue = (name: string, type: string) => {
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

    // Type based fallback
    if (t.includes('int') || t.includes('number') || t.includes('float') || t.includes('real')) return faker.number.int({ max: 1000 });
    if (t.includes('bool')) return dbType === 'postgres' ? true : 1;
    return faker.lorem.word();
  };

  const handleSeedData = async () => {
    if (!db) return;
    setIsSeeding(true);
    setError(null);

    try {
      if (viewingTableName) {
        // SMART SEEDING FOR SELECTED TABLE
        const tableDef = schema.find(t => t.name === viewingTableName);
        if (!tableDef) throw new Error(`Table definition for '${viewingTableName}' not found.`);

        if (dbType === 'nosql') {
          let insertScript = `// Seed 10 documents into '${viewingTableName}'\n`;
          for (let i = 0; i < 10; i++) {
            const doc: any = {};
            if (tableDef.columns.length > 0) {
              tableDef.columns.forEach(col => {
                if (col.name === '_id') return;
                doc[col.name] = generateFakeValue(col.name, col.type);
              });
            } else {
              // Fallback for empty/schemaless collection
              doc.name = faker.person.fullName();
              doc.created_at = new Date().toISOString();
              doc.data = faker.lorem.sentence();
            }
            insertScript += `db.${viewingTableName}.insert(${JSON.stringify(doc)});\n`;
          }
          await db.execute(insertScript);
          setResults([{ message: `Successfully seeded 10 documents into '${viewingTableName}'.` }]);
        } else {
          // SQL Seeding
          // Filter out likely auto-increment IDs to let DB handle them
          const insertCols = tableDef.columns.filter(c => c.name.toLowerCase() !== 'id');

          if (insertCols.length === 0) throw new Error("Cannot seed table with no writable columns.");

          let insertSql = `INSERT INTO ${viewingTableName} (${insertCols.map(c => c.name).join(', ')}) VALUES `;
          const valuesArr: string[] = [];

          for (let i = 0; i < 10; i++) {
            const rowVals = insertCols.map(col => {
              const val = generateFakeValue(col.name, col.type);
              if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
              if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
              return val;
            });
            valuesArr.push(`(${rowVals.join(', ')})`);
          }
          insertSql += valuesArr.join(', ') + ";";
          await db.execute(insertSql);
          setResults([{ message: `Successfully seeded 10 rows into '${viewingTableName}'.` }]);
        }

        // Refresh the view query to show new data
        handleViewTable(viewingTableName);

      } else {
        // ORIGINAL DEFAULT SEEDING (Users table)
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
          let createUsersSql = "";
          let createProductsSql = "";

          if (dbType === 'postgres') {
            createUsersSql = `
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    name TEXT,
                    email TEXT,
                    job TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `;
            createProductsSql = `
                CREATE TABLE IF NOT EXISTS products (
                    id SERIAL PRIMARY KEY,
                    name TEXT,
                    price DECIMAL(10, 2),
                    category TEXT,
                    stock INTEGER DEFAULT 0
                );
            `;
          } else {
            createUsersSql = `
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT,
                    email TEXT,
                    job TEXT,
                    created_at TEXT
                );
            `;
            createProductsSql = `
                CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT,
                    price DECIMAL(10, 2),
                    category TEXT,
                    stock INTEGER DEFAULT 0
                );
            `;
          }

          await db.execute(createUsersSql);
          await db.execute(createProductsSql);

          let insertSql = "INSERT INTO users (name, email, job, created_at) VALUES ";
          const values: string[] = [];
          for (let i = 0; i < 50; i++) {
            const name = faker.person.fullName().replace(/'/g, "''");
            const email = faker.internet.email().replace(/'/g, "''");
            const job = faker.person.jobTitle().replace(/'/g, "''");
            const date = new Date().toISOString();
            // ID auto-generated by DB (removed from INSERT)
            values.push(`('${name}', '${email}', '${job}', '${date}')`);
          }
          insertSql += values.join(", ") + ";";
          await db.execute(insertSql);
          setResults([{ message: "Successfully seeded 50 users into 'users' table." }]);
        }
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
    setModules(prev => {
      const updated = [...prev, {
        id: Date.now().toString(),
        title: title,
        lessons: [],
        engine: dbType
      }];
      localStorage.setItem('db_academy_modules', JSON.stringify(updated));
      return updated;
    });
  };

  const handleAddLesson = (moduleId: string, title: string) => {
    setModules(prev => {
      const updated = prev.map(m => {
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
      });
      localStorage.setItem('db_academy_modules', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    try {
      const savedModules = localStorage.getItem('db_academy_modules');
      if (savedModules) {
        setModules(JSON.parse(savedModules));
      }
    } catch (e) {
      console.error("Failed to load modules from storage", e);
    }
  }, []);

  // New state for user-created lessons content
  const [userLessons, setUserLessons] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load persisted user lessons on client load
    try {
      const saved = localStorage.getItem('user_lessons_content');
      if (saved) {
        setUserLessons(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load user lessons", e);
    }
  }, []);

  const handleUpdateLessonContent = (id: string, newContent: string) => {
    const updated = { ...userLessons, [id]: newContent };
    setUserLessons(updated);
    localStorage.setItem('user_lessons_content', JSON.stringify(updated));

    // Also update active lesson if it updates the current one
    if (activeLesson && activeLesson.id === id) {
      setActiveLesson({ ...activeLesson, content: newContent });
    }
  };

  // ... (rest of methods)

  const handleSelectLesson = (lesson: Lesson, moduleId: string) => {
    // Find the full content from the curriculum
    const fullLesson = getLessonById(moduleId, lesson.id);
    if (fullLesson) {
      setActiveLesson(fullLesson);

      // Auto-switch engine if needed
      const module = modules.find(m => m.id === moduleId);
      if (module && module.engine && module.engine !== dbType) {
        setDbType(module.engine);
      }

      // Pre-fill query if provided
      if (fullLesson.defaultQuery) {
        setQuery(fullLesson.defaultQuery);
      }
    } else {
      // Fallback if not in curriculum store (user added)
      // Check if we have saved content for this user lesson
      const savedContent = userLessons[lesson.id];

      setActiveLesson({
        id: lesson.id,
        title: lesson.title,
        content: savedContent || `# ${lesson.title}\n\nThis is a user-created lesson. Add content here.`
      });
    }
  };

  const activeModules = modules.filter(m => m.engine === dbType);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
        <div className="font-medium animate-pulse">Initializing Engine...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <header className="h-14 flex items-center justify-between px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 select-none">
            <div className="relative w-9 h-9 flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30 ring-1 ring-white/10">
              <Database className="w-5 h-5 text-white" strokeWidth={2} />
              <div className="absolute -bottom-1.5 -right-1.5 bg-slate-900 rounded-full p-1 border border-slate-700">
                <GraduationCap className="w-3 h-3 text-blue-400" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 tracking-tight">
                DBAcademy
              </h1>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden sm:block"></div>

          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 py-1 px-3 rounded-md border border-slate-200 dark:border-slate-700">
            <label className="hidden sm:block text-xs font-semibold text-slate-500 uppercase tracking-wide">Engine:</label>
            <select
              value={dbType}
              onChange={handleSwitchDb}
              className="bg-transparent border-none text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="postgres">PostgreSQL (PGlite)</option>
              <option value="sqlite">SQLite (WASM)</option>
              <option value="nosql">NoSQL (In-Memory JS)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* ModeToggle removed */}
          <button
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
            onClick={handleSeedData}
            disabled={isSeeding}
          >
            {isSeeding ? '🌱 Seeding...' : '🌱 Seed Data'}
          </button>

          <button
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 bg-white dark:bg-slate-800 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm"
            onClick={handleResetDb}
          >
            Reset DB
          </button>

          <button
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-all transform active:scale-95"
            onClick={runQuery}
          >
            <span>▶</span> Run
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-64 h-[300px] md:h-full flex-shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('curriculum')}
              className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${activeTab === 'curriculum'
                ? 'bg-white dark:bg-slate-900 text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Learn
            </button>
            <button
              onClick={() => setActiveTab('schema')}
              className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${activeTab === 'schema'
                ? 'bg-white dark:bg-slate-900 text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Tables
            </button>
            <button
              onClick={() => setActiveTab('erd')}
              className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${activeTab === 'erd'
                ? 'bg-white dark:bg-slate-900 text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Graph
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {activeTab === 'curriculum' &&
              <Sidebar
                modules={activeModules}
                activeLessonId={activeLesson?.id}
                onAddModule={handleAddModule}
                onAddLesson={handleAddLesson}
                onSelectLesson={handleSelectLesson}
              />
            }
            {activeTab === 'schema' && <SchemaViewer tables={schema} onViewTable={handleViewTable} />}
            {activeTab === 'erd' && (
              <div className="h-full flex flex-col">
                <div className="p-4 text-xs text-slate-500 text-center border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  Visualizing {schema.length} tables
                </div>
                <div className="flex-1 relative overflow-hidden bg-slate-50 dark:bg-slate-950">
                  <ERDiagram tables={schema} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Middle Panel: Lesson Content (Only valid if activeLesson is present) */}
        {activeLesson && (
          <div className="flex-1 w-full md:w-auto min-w-0 md:min-w-[300px] border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-auto">
            <LessonView
              id={activeLesson.id}
              title={activeLesson.title}
              content={activeLesson.content}
              defaultQuery={activeLesson.defaultQuery}
              onRunSample={(q) => setQuery(q)}
              onClose={() => setActiveLesson(null)}
              // Only allow editing if it's NOT a built-in curriculum lesson
              onEdit={
                !CURRICULUM.some(m => m.lessons.some(l => l.id === activeLesson.id))
                  ? (newContent) => handleUpdateLessonContent(activeLesson.id, newContent)
                  : undefined
              }
            />
          </div>
        )}

        {/* Right Panel: Editor & Results */}
        <div className="flex-1 w-full md:w-auto min-w-0 md:min-w-[400px] flex flex-col bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {dbType === 'nosql' ? 'JavaScript / Mongo' : 'SQL Query'}
            </span>
          </div>

          <div className="flex-1 relative border-b border-slate-200 dark:border-slate-800 h-[300px] md:h-auto">
            <SqlEditor
              value={query}
              onChange={(val) => setQuery(val || '')}
              onRun={runQuery}
              language={dbType === 'nosql' ? 'javascript' : 'sql'}
            />
          </div>

          <div className="h-[40%] md:h-[40%] flex flex-col bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Results</span>

                {viewingTableName && (
                  <span className="text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-full">
                    Viewing: {viewingTableName}
                  </span>
                )}
              </div>

              <span className="text-xs text-slate-500">
                {dbType === 'nosql' && results.length > 0 ? `${results.length} docs` : `${results.length} rows`}
              </span>
            </div>

            <div className="flex-1 overflow-auto p-0">
              <ResultsTable results={results} error={error} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
