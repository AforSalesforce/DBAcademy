'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import SqlEditor from '@/components/SqlEditor';
import ResultsTable from '@/components/ResultsTable';
import Sidebar, { Module, Lesson } from '@/components/Sidebar';
import SchemaViewer from '@/components/SchemaViewer';
import ERDiagram from '@/components/ERDiagram';
import { LessonView } from '@/components/LessonView';
import { SavedQueriesPanel } from '@/components/SavedQueriesPanel';
import { RunHistory } from '@/components/RunHistory';
import { NotesDrawer } from '@/components/NotesDrawer';
import { SchemaDesigner } from '@/components/SchemaDesigner';
import {
  Database, GraduationCap, BarChart3, NotebookPen, ChevronDown,
  FolderOpen, Plus, Trash2, Check,
} from 'lucide-react';
import { DatabaseEngine, TableDefinition } from '@/lib/db/types';
import { PostgresEngine } from '@/lib/db/postgres';
import { SQLiteEngine } from '@/lib/db/sqlite';
import { NoSQLEngine } from '@/lib/db/nosql';
import { faker } from '@faker-js/faker';
import { CURRICULUM, getLessonById, LessonContentType } from '@/lib/curriculum';
import { useProgressStore } from '@/lib/progress-store';
import { useProfile } from '@/lib/use-profile';
import { canCreateCustomModule, canCreateProject, canSaveQuery } from '@/lib/plans';
import { useProjectStore, DEFAULT_PROJECT_IDS, Project } from '@/lib/project-store';
import { useSavedQueriesStore } from '@/lib/saved-queries-store';
import { useRunHistoryStore } from '@/lib/run-history-store';
import { useNotesStore } from '@/lib/notes-store';
import { useSchemaDesignerStore } from '@/lib/schema-designer';
import { saveSnapshot, loadSnapshot } from '@/lib/local-db';

// ── constants ─────────────────────────────────────────────────────────────────

const DEFAULT_QUERY_SQL = `-- Find the killer
SELECT * FROM crime_scene_report
WHERE city = 'SQL City'
ORDER BY date;`;

const DEFAULT_QUERY_NOSQL = `// Find users with 'admin' role
db.users.find({ role: "admin" })`;

const MUTATING_SQL = /\b(CREATE|DROP|ALTER|INSERT|UPDATE|DELETE|TRUNCATE)\b/i;
const SNAPSHOT_DEBOUNCE_MS = 2000;

// ── module helpers (unchanged from original) ──────────────────────────────────

const INITIAL_MODULES_STATE: Module[] = CURRICULUM.map(m => ({
  id: m.id,
  title: m.title,
  engine: m.engine,
  lessons: m.lessons.map(l => ({ id: l.id, title: l.title, completed: false })),
}));

function mergeWithCurriculum(saved: Module[]): Module[] {
  const builtin = INITIAL_MODULES_STATE.map(m => {
    const savedModule = saved.find(s => s.id === m.id);
    if (!savedModule) return m;
    const userLessons = savedModule.lessons.filter(l => !m.lessons.some(bl => bl.id === l.id));
    return { ...m, lessons: [...m.lessons, ...userLessons] };
  });
  const userModules = saved.filter(s => !INITIAL_MODULES_STATE.some(m => m.id === s.id));
  return [...builtin, ...userModules];
}

// ── component ─────────────────────────────────────────────────────────────────

export default function LearnPage() {
  // ── DB / engine state ──────────────────────────────────────────────────────
  const [dbType, setDbType] = useState<'postgres' | 'sqlite' | 'nosql'>('sqlite');
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

  // ── UI tabs ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'curriculum' | 'schema' | 'erd' | 'queries' | 'design'>('curriculum');
  const [resultsTab, setResultsTab] = useState<'results' | 'history'>('results');

  // ── Lesson state ───────────────────────────────────────────────────────────
  const [modules, setModules] = useState<Module[]>(INITIAL_MODULES_STATE);
  const [activeLesson, setActiveLesson] = useState<LessonContentType | null>(null);
  const [activeLessonModuleId, setActiveLessonModuleId] = useState<string | null>(null);
  const [userLessons, setUserLessons] = useState<Record<string, string>>({});

  // ── Project / workspace state ──────────────────────────────────────────────
  const projectStore = useProjectStore();
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectEngine, setNewProjectEngine] = useState<'postgres' | 'sqlite' | 'nosql'>('sqlite');
  const [showNewProject, setShowNewProject] = useState(false);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  // ── Save-query modal ───────────────────────────────────────────────────────
  const [saveQueryModal, setSaveQueryModal] = useState<{ body: string; engine: 'postgres' | 'sqlite' | 'nosql' } | null>(null);
  const [saveQueryTitle, setSaveQueryTitle] = useState('');

  // ── Stores ─────────────────────────────────────────────────────────────────
  const { incrementQueries, updateStreak, markLessonComplete } = useProgressStore();
  const { profile } = useProfile();
  const savedQueriesStore = useSavedQueriesStore();
  const runHistoryStore = useRunHistoryStore();
  const notesStore = useNotesStore();
  const schemaDesignerStore = useSchemaDesignerStore();

  // ── Snapshot debounce ref ──────────────────────────────────────────────────
  const snapshotTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Hydrate all stores on mount ────────────────────────────────────────────
  useEffect(() => {
    updateStreak();
    projectStore.hydrate();
    savedQueriesStore.hydrate();
    runHistoryStore.hydrate();
    notesStore.hydrate();
    schemaDesignerStore.hydrate();
    notesStore.migrateFromLocalStorage();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync active project engine → dbType ────────────────────────────────────
  useEffect(() => {
    const active = projectStore.getActiveProject();
    if (active && active.engine !== dbType) {
      setDbType(active.engine);
    }
  }, [projectStore.activeProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load modules from localStorage ────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('db_academy_modules');
      if (saved) setModules(mergeWithCurriculum(JSON.parse(saved)));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('user_lessons_content');
      if (saved) setUserLessons(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // ── Close project menu on outside click ───────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(e.target as Node)) {
        setProjectMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        notesStore.toggleDrawer();
      }
      if (mod && !e.shiftKey && e.key === 's') {
        e.preventDefault();
        openSaveQueryModal(query, dbType);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [query, dbType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Init DB when dbType changes ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const activeProjectId = projectStore.activeProjectId;

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

        // Try restoring from local snapshot (for non-idb engines).
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

        if (!query || query === (dbType !== 'nosql' ? DEFAULT_QUERY_NOSQL : DEFAULT_QUERY_SQL)) {
          setQuery(dbType === 'nosql' ? DEFAULT_QUERY_NOSQL : DEFAULT_QUERY_SQL);
        }
      } catch (err: any) {
        if (!cancelled) setError(`Failed to load ${dbType} engine: ${err.message}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    initDb();
    return () => { cancelled = true; };
  }, [dbType, projectStore.activeProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ────────────────────────────────────────────────────────────────

  const refreshSchema = async () => {
    if (!db) return;
    try {
      setSchema(await db.getSchema());
    } catch { /* ignore */ }
  };

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

  // ── Run query ──────────────────────────────────────────────────────────────

  const runQuery = async (overrideQuery?: string) => {
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
      setResultsTab('results');
      incrementQueries();

      // Record history
      await runHistoryStore.addRun({
        projectId: projectStore.activeProjectId,
        engine: dbType,
        body: q,
        status: 'ok',
        rowCount: res.rows.length,
        durationMs: duration,
      });

      // Schema refresh + snapshot
      if (dbType === 'nosql' || q.match(MUTATING_SQL)) {
        await refreshSchema();
        scheduleSnapshot(db, projectStore.activeProjectId);
      }
    } catch (err: any) {
      const duration = Math.round(performance.now() - start);
      setError(err.message);
      setResults([]);
      setResultColumns([]);
      setLastRunDuration(null);

      await runHistoryStore.addRun({
        projectId: projectStore.activeProjectId,
        engine: dbType,
        body: q,
        status: 'error',
        errorMessage: err.message,
        rowCount: 0,
        durationMs: duration,
      });
    }
  };

  const executeDirect = async (sql: string) => {
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
  };

  const handleViewTable = (tableName: string) => {
    setViewingTableName(tableName);
    const viewQuery = dbType === 'nosql'
      ? `db.${tableName}.find({})`
      : `SELECT * FROM ${tableName} LIMIT 100;`;
    executeDirect(viewQuery);
  };

  // ── Save query helpers ─────────────────────────────────────────────────────

  const openSaveQueryModal = (body: string, engine: typeof dbType) => {
    setSaveQueryModal({ body, engine });
    setSaveQueryTitle('');
  };

  const commitSaveQuery = async () => {
    if (!saveQueryModal || !saveQueryTitle.trim()) return;
    const plan = profile?.plan ?? 'free';
    if (!canSaveQuery(plan, savedQueriesStore.queries.length)) {
      setError('Saved query limit reached. Upgrade to Pro for unlimited saved queries.');
      setSaveQueryModal(null);
      return;
    }
    await savedQueriesStore.saveQuery({
      title: saveQueryTitle.trim(),
      body: saveQueryModal.body,
      engine: saveQueryModal.engine,
      projectId: projectStore.activeProjectId,
    });
    setSaveQueryModal(null);
  };

  // ── Project helpers ────────────────────────────────────────────────────────

  const handleSelectProject = (project: Project) => {
    projectStore.setActiveProject(project.id);
    setProjectMenuOpen(false);
    setShowNewProject(false);
  };

  const handleCreateProject = async () => {
    const plan = profile?.plan ?? 'free';
    const userCount = projectStore.projects.filter(p => !p.isDefault).length;
    if (!canCreateProject(plan, userCount)) {
      setError('Project limit reached on the Free plan (2 projects). Upgrade to Pro for unlimited projects.');
      return;
    }
    if (!newProjectName.trim()) return;
    const p = await projectStore.createProject(newProjectName.trim(), newProjectEngine);
    projectStore.setActiveProject(p.id);
    setProjectMenuOpen(false);
    setShowNewProject(false);
    setNewProjectName('');
  };

  const handleDeleteProject = async (id: string) => {
    await projectStore.deleteProject(id);
  };

  // ── Seeding / reset (unchanged logic, abbreviated) ────────────────────────

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
        const tableDef = schema.find(t => t.name === viewingTableName);
        if (!tableDef) throw new Error(`Table '${viewingTableName}' not found.`);
        if (dbType === 'nosql') {
          let script = '';
          for (let i = 0; i < 10; i++) {
            const doc: any = {};
            tableDef.columns.forEach(col => {
              if (col.name === '_id') return;
              doc[col.name] = generateFakeValue(col.name, col.type);
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
              const v = generateFakeValue(col.name, col.type);
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
          setResults([{ message: "Seeded 50 users." }]);
        } else {
          const idType = dbType === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
          await db.execute(`CREATE TABLE IF NOT EXISTS users (id ${idType}, name TEXT, email TEXT, job TEXT, created_at TEXT);`);
          await db.execute(`CREATE TABLE IF NOT EXISTS products (id ${idType}, name TEXT, price DECIMAL(10,2), category TEXT, stock INTEGER DEFAULT 0);`);
          const rows: string[] = [];
          for (let i = 0; i < 50; i++) {
            rows.push(`('${faker.person.fullName().replace(/'/g, "''")}', '${faker.internet.email().replace(/'/g, "''")}', '${faker.person.jobTitle().replace(/'/g, "''")}', '${new Date().toISOString()}')`);
          }
          await db.execute(`INSERT INTO users (name, email, job, created_at) VALUES ${rows.join(', ')};`);
          setResults([{ message: "Seeded 50 users." }]);
        }
      }
      await refreshSchema();
      setActiveTab('schema');
      scheduleSnapshot(db, projectStore.activeProjectId);
    } catch (err: any) {
      setError('Seeding failed: ' + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleResetDb = async () => {
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
  };

  // ── Module / lesson handlers (unchanged) ──────────────────────────────────

  const handleAddModule = (title: string) => {
    const customModuleCount = modules.filter(m => !CURRICULUM.some(c => c.id === m.id)).length;
    if (!canCreateCustomModule(profile?.plan ?? 'free', customModuleCount)) {
      setError('Custom module limit reached. Upgrade to Pro for unlimited modules — see /pricing.');
      return;
    }
    setModules(prev => {
      const updated = [...prev, { id: Date.now().toString(), title, lessons: [], engine: dbType }];
      localStorage.setItem('db_academy_modules', JSON.stringify(updated));
      return updated;
    });
  };

  const handleAddLesson = (moduleId: string, title: string) => {
    setModules(prev => {
      const updated = prev.map(m => m.id === moduleId
        ? { ...m, lessons: [...m.lessons, { id: Date.now().toString(), title, completed: false }] }
        : m
      );
      localStorage.setItem('db_academy_modules', JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateLessonContent = (id: string, newContent: string) => {
    const updated = { ...userLessons, [id]: newContent };
    setUserLessons(updated);
    localStorage.setItem('user_lessons_content', JSON.stringify(updated));
    if (activeLesson?.id === id) setActiveLesson({ ...activeLesson, content: newContent });
  };

  const handleSelectLesson = (lesson: Lesson, moduleId: string) => {
    const fullLesson = getLessonById(moduleId, lesson.id);
    setActiveLessonModuleId(moduleId);
    if (fullLesson) {
      setActiveLesson(fullLesson);
      const module = modules.find(m => m.id === moduleId);
      if (module?.engine && module.engine !== dbType) {
        // Switch to the matching default playground for that engine
        projectStore.setActiveProject(DEFAULT_PROJECT_IDS[module.engine]);
      }
      if (fullLesson.defaultQuery) setQuery(fullLesson.defaultQuery);
    } else {
      const savedContent = userLessons[lesson.id];
      setActiveLesson({ id: lesson.id, title: lesson.title, content: savedContent || `# ${lesson.title}\n\nThis is a user-created lesson. Add content here.` });
    }
  };

  const activeModules = modules.filter(m => m.engine === dbType);
  const activeProject = projectStore.getActiveProject();

  // ── Loading screen ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <div className="font-medium animate-pulse">Initializing Engine…</div>
      </div>
    );
  }

  // ── Project groups for dropdown ───────────────────────────────────────────

  const defaultProjects = projectStore.projects.filter(p => p.isDefault);
  const userProjects = projectStore.projects.filter(p => !p.isDefault);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col w-full min-h-screen md:h-screen md:overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="h-14 flex items-center justify-between px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 z-10 sticky top-0 md:relative">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 select-none">
            <div className="relative w-9 h-9 flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30 ring-1 ring-white/10">
              <Database className="w-5 h-5 text-white" strokeWidth={2} />
              <div className="absolute -bottom-1.5 -right-1.5 bg-slate-900 rounded-full p-1 border border-slate-700">
                <GraduationCap className="w-3 h-3 text-blue-400" />
              </div>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 tracking-tight">
              DBAcademy
            </h1>
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

          {/* ── Project switcher ──────────────────────────────────────────── */}
          <div className="relative" ref={projectMenuRef}>
            <button
              onClick={() => setProjectMenuOpen(o => !o)}
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 py-1.5 px-3 rounded-md border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors max-w-[180px]"
            >
              <FolderOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{activeProject?.name ?? 'Select project'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {projectMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 py-1 overflow-hidden">
                {/* Default playgrounds */}
                <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Playgrounds</p>
                {defaultProjects.map(p => (
                  <ProjectMenuItem key={p.id} project={p} active={p.id === projectStore.activeProjectId} onSelect={handleSelectProject} />
                ))}

                {/* User projects */}
                {userProjects.length > 0 && (
                  <>
                    <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                      <p className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">My projects</p>
                      {userProjects.map(p => (
                        <ProjectMenuItem key={p.id} project={p} active={p.id === projectStore.activeProjectId} onSelect={handleSelectProject} onDelete={handleDeleteProject} />
                      ))}
                    </div>
                  </>
                )}

                {/* New project */}
                <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1 px-2 pb-2">
                  {showNewProject ? (
                    <div className="flex flex-col gap-1.5 mt-1">
                      <input
                        autoFocus
                        value={newProjectName}
                        onChange={e => setNewProjectName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                        placeholder="Project name…"
                        className="text-sm px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 focus:outline-none focus:border-blue-400"
                      />
                      <select
                        value={newProjectEngine}
                        onChange={e => setNewProjectEngine(e.target.value as any)}
                        className="text-sm px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 focus:outline-none"
                      >
                        <option value="sqlite">SQLite</option>
                        <option value="postgres">PostgreSQL</option>
                        <option value="nosql">NoSQL</option>
                      </select>
                      <div className="flex gap-1">
                        <button onClick={handleCreateProject} className="flex-1 text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Create</button>
                        <button onClick={() => setShowNewProject(false)} className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200 dark:hover:bg-slate-600">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNewProject(true)}
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> New project
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right header buttons */}
        <div className="flex items-center gap-2">
          {/* Notes toggle */}
          <button
            onClick={() => notesStore.toggleDrawer()}
            title="Notes (Cmd+Shift+N)"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <NotebookPen className="w-3.5 h-3.5" /> Notes
          </button>

          <Link
            href="/dashboard"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <BarChart3 className="w-3.5 h-3.5" /> Dashboard
          </Link>

          <button
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
            onClick={handleSeedData}
            disabled={isSeeding}
          >
            {isSeeding ? '🌱…' : '🌱 Seed'}
          </button>

          <button
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 bg-white dark:bg-slate-800 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shadow-sm"
            onClick={handleResetDb}
          >
            Reset
          </button>

          <button
            className="hidden md:flex items-center gap-2 px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-all transform active:scale-95"
            onClick={() => runQuery()}
          >
            <span>▶</span> Run
          </button>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row flex-1 md:overflow-hidden">

        {/* ── Navigation Sidebar ────────────────────────────────────────── */}
        <div className="w-full md:w-64 flex-shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 max-h-[40vh] md:max-h-full">
          <div className="flex border-b border-slate-200 dark:border-slate-800 shrink-0 overflow-x-auto">
            {(['curriculum', 'schema', 'erd', 'queries', 'design'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 min-w-[60px] py-3 text-[10px] font-semibold uppercase tracking-wide transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-white dark:bg-slate-900 text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'curriculum' ? 'Learn' : tab === 'erd' ? 'Graph' : tab === 'queries' ? 'Queries' : tab === 'design' ? 'Design' : 'Tables'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto min-h-[200px]">
            {activeTab === 'curriculum' && (
              <Sidebar
                modules={activeModules}
                activeLessonId={activeLesson?.id}
                onAddModule={handleAddModule}
                onAddLesson={handleAddLesson}
                onSelectLesson={handleSelectLesson}
              />
            )}
            {activeTab === 'schema' && <SchemaViewer tables={schema} onViewTable={handleViewTable} />}
            {activeTab === 'erd' && (
              <div className="h-full flex flex-col">
                <div className="p-4 text-xs text-slate-500 text-center border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  Visualizing {schema.length} tables
                </div>
                <div className="flex-1 relative overflow-hidden bg-slate-50 dark:bg-slate-950 min-h-[300px]">
                  <ERDiagram tables={schema} />
                </div>
              </div>
            )}
            {activeTab === 'queries' && (
              <SavedQueriesPanel
                activeEngine={dbType}
                activeProjectId={projectStore.activeProjectId}
                onLoad={body => setQuery(body)}
                onRun={body => { setQuery(body); runQuery(body); }}
              />
            )}
            {activeTab === 'design' && dbType !== 'nosql' && (
              <div className="h-full">
                <SchemaDesigner
                  engine={dbType}
                  projectId={projectStore.activeProjectId}
                  currentSchema={schema}
                  onApplyDDL={ddl => { setQuery(ddl); setActiveTab('curriculum'); }}
                />
              </div>
            )}
            {activeTab === 'design' && dbType === 'nosql' && (
              <div className="p-4 text-sm text-slate-400 text-center">
                Schema designer is not available for schemaless NoSQL.
              </div>
            )}
          </div>
        </div>

        {/* ── Middle Panel: Lesson ────────────────────────────────────────── */}
        {activeLesson && (
          <div className="flex-1 w-full md:w-auto min-w-0 md:min-w-[300px] border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 md:overflow-auto">
            <LessonView
              id={activeLesson.id}
              title={activeLesson.title}
              content={activeLesson.content}
              defaultQuery={activeLesson.defaultQuery}
              quiz={activeLesson.quiz}
              moduleId={activeLessonModuleId || undefined}
              onRunSample={q => setQuery(q)}
              onClose={() => setActiveLesson(null)}
              onEdit={
                !CURRICULUM.some(m => m.lessons.some(l => l.id === activeLesson.id))
                  ? newContent => handleUpdateLessonContent(activeLesson.id, newContent)
                  : undefined
              }
            />
          </div>
        )}

        {/* ── Right Panel: Editor + Results ──────────────────────────────── */}
        <div className="flex-1 w-full md:w-auto min-w-0 md:min-w-[400px] flex flex-col bg-slate-50 dark:bg-slate-950">
          {/* Editor label bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {dbType === 'nosql' ? 'JavaScript / Mongo' : 'SQL Query'}
            </span>
            <button
              onClick={() => openSaveQueryModal(query, dbType)}
              title="Save query (Cmd+S)"
              className="text-xs text-slate-400 hover:text-blue-600 transition-colors px-1.5 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              Save
            </button>
          </div>

          {/* Editor */}
          <div className="flex-1 relative border-b border-slate-200 dark:border-slate-800 h-[300px] md:h-auto shrink-0">
            <SqlEditor
              value={query}
              onChange={val => setQuery(val || '')}
              onRun={() => runQuery()}
              language={dbType === 'nosql' ? 'javascript' : 'sql'}
            />
          </div>

          {/* Results / History tabs */}
          <div className="h-[300px] md:h-[40%] flex flex-col bg-white dark:bg-slate-900 shrink-0">
            <div className="flex items-center border-b border-slate-200 dark:border-slate-700 shrink-0">
              <button
                onClick={() => setResultsTab('results')}
                className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  resultsTab === 'results'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Results
              </button>
              <button
                onClick={() => setResultsTab('history')}
                className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  resultsTab === 'history'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                History
              </button>
              <div className="flex-1" />
              <div className="flex items-center gap-3 px-3">
                {viewingTableName && (
                  <span className="text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-full">
                    Viewing: {viewingTableName}
                  </span>
                )}
                {resultsTab === 'results' && (
                  <span className="text-xs text-slate-500">
                    {dbType === 'nosql' && results.length > 0 ? `${results.length} docs` : `${results.length} rows`}
                    {lastRunDuration !== null && ` · ${lastRunDuration} ms`}
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto p-0">
              {resultsTab === 'results' && <ResultsTable results={results} error={error} />}
              {resultsTab === 'history' && (
                <RunHistory
                  activeProjectId={projectStore.activeProjectId}
                  onLoad={body => setQuery(body)}
                  onRun={body => { setQuery(body); runQuery(body); }}
                  onSave={(body, engine) => openSaveQueryModal(body, engine)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Floating Run Button (mobile) ────────────────────────────────────── */}
      <button
        onClick={() => runQuery()}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl shadow-blue-500/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-50 border-2 border-white dark:border-slate-900"
        aria-label="Run Query"
      >
        <span className="text-xl ml-1">▶</span>
      </button>

      {/* ── Save Query Modal ─────────────────────────────────────────────────── */}
      {saveQueryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSaveQueryModal(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Save Query</h2>
            <input
              autoFocus
              value={saveQueryTitle}
              onChange={e => setSaveQueryTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitSaveQuery(); if (e.key === 'Escape') setSaveQueryModal(null); }}
              placeholder="Query title…"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 focus:outline-none focus:border-blue-400 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setSaveQueryModal(null)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Cancel</button>
              <button onClick={commitSaveQuery} disabled={!saveQueryTitle.trim()} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40">
                <Check className="w-3.5 h-3.5 inline mr-1" />Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Notes Drawer ────────────────────────────────────────────────────── */}
      <NotesDrawer
        lessonId={activeLesson?.id}
        projectId={projectStore.activeProjectId}
      />
    </div>
  );
}

// ── ProjectMenuItem ───────────────────────────────────────────────────────────

function ProjectMenuItem({
  project,
  active,
  onSelect,
  onDelete,
}: {
  project: Project;
  active: boolean;
  onSelect: (p: Project) => void;
  onDelete?: (id: string) => void;
}) {
  const engineColors: Record<string, string> = {
    sqlite: 'text-orange-500',
    postgres: 'text-blue-500',
    nosql: 'text-green-500',
  };

  return (
    <div
      className={`group flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer ${
        active ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
      onClick={() => onSelect(project)}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-[10px] font-bold uppercase ${engineColors[project.engine] ?? 'text-slate-400'}`}>
          {project.engine.slice(0, 2).toUpperCase()}
        </span>
        <span className={`text-sm truncate ${active ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-slate-600 dark:text-slate-300'}`}>
          {project.name}
        </span>
      </div>
      {!project.isDefault && onDelete && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(project.id); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-red-500 transition-opacity"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
