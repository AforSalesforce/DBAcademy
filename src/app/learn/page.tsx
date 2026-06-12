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
  Database, GraduationCap, BarChart3, NotebookPen, ChevronDown, ChevronUp,
  FolderOpen, Plus, Trash2, Check, Play, Sprout, RotateCcw,
  PanelLeftClose, PanelLeftOpen,
  BookOpen, Table2, GitBranch, Bookmark, LayoutTemplate,
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [resultsCollapsed, setResultsCollapsed] = useState(false);
  const [resultsPanelHeight, setResultsPanelHeight] = useState(300);
  const resizeDragging = useRef(false);
  const resizeStartY = useRef(0);
  const resizeStartH = useRef(0);

  // ── Editor panel width (horizontal resize) ────────────────────────────────
  const [editorWidthPx, setEditorWidthPx] = useState<number | null>(null);
  const hResizeDragging = useRef(false);
  const hResizeStartX = useRef(0);
  const hResizeStartW = useRef(0);

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

  // ── Init editor width on desktop mount ────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setEditorWidthPx(Math.round(window.innerWidth * 0.5));
    }
  }, []);

  // ── Results panel drag-resize ─────────────────────────────────────────────

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizeDragging.current = true;
    resizeStartY.current = e.clientY;
    resizeStartH.current = resultsPanelHeight;
    const onMove = (ev: MouseEvent) => {
      if (!resizeDragging.current) return;
      const delta = resizeStartY.current - ev.clientY;
      setResultsPanelHeight(h => Math.max(64, Math.min(640, resizeStartH.current + delta)));
    };
    const onUp = () => {
      resizeDragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [resultsPanelHeight]);

  // ── Editor panel horizontal drag-resize ───────────────────────────────────

  const onHResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    hResizeDragging.current = true;
    hResizeStartX.current = e.clientX;
    hResizeStartW.current = editorWidthPx ?? Math.round(window.innerWidth * 0.5);
    const onMove = (ev: MouseEvent) => {
      if (!hResizeDragging.current) return;
      const delta = hResizeStartX.current - ev.clientX;
      const newW = Math.max(280, Math.min(Math.round(window.innerWidth * 0.85), hResizeStartW.current + delta));
      setEditorWidthPx(newW);
    };
    const onUp = () => {
      hResizeDragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [editorWidthPx]);

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
      <div className="flex flex-col items-center justify-center h-screen gap-4" style={{ background: '#07090F', color: '#EDF1FA' }}>
        <div className="relative w-10 h-10">
          <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(0,199,190,0.2)', borderTopColor: '#00C7BE' }} />
          <Database className="w-4 h-4 absolute inset-0 m-auto" style={{ color: '#00C7BE' }} />
        </div>
        <div className="text-sm font-medium animate-pulse" style={{ color: '#5C6B8A' }}>Initializing Engine…</div>
      </div>
    );
  }

  // ── Project groups for dropdown ───────────────────────────────────────────

  const defaultProjects = projectStore.projects.filter(p => p.isDefault);
  const userProjects = projectStore.projects.filter(p => !p.isDefault);

  // ── Sidebar tab config ────────────────────────────────────────────────────

  const TAB_NAV = [
    { id: 'curriculum' as const, label: 'Learn',   Icon: BookOpen,       color: '#00C7BE', glow: 'rgba(0,199,190,0.15)'   },
    { id: 'schema'     as const, label: 'Tables',  Icon: Table2,         color: '#F59E0B', glow: 'rgba(245,158,11,0.15)'  },
    { id: 'erd'        as const, label: 'Graph',   Icon: GitBranch,      color: '#22C55E', glow: 'rgba(34,197,94,0.15)'   },
    { id: 'queries'    as const, label: 'Queries', Icon: Bookmark,       color: '#A78BFA', glow: 'rgba(167,139,250,0.15)' },
    { id: 'design'     as const, label: 'Design',  Icon: LayoutTemplate, color: '#FB923C', glow: 'rgba(251,146,60,0.15)'  },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col w-full min-h-screen md:h-screen md:overflow-hidden" style={{ background: '#07090F', color: '#EDF1FA' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="h-14 flex items-center justify-between px-4 shrink-0 z-10 sticky top-0 md:relative" style={{ background: '#0C1018', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-4">
          {/* Logo — always links home */}
          <Link href="/" className="flex items-center gap-3 select-none cursor-pointer">
            <div className="relative w-9 h-9 flex items-center justify-center rounded-xl ring-1 ring-white/10" style={{ background: 'linear-gradient(135deg, #00C7BE, #0096A0)' }}>
              <Database className="w-5 h-5 text-white" strokeWidth={2} />
              <div className="absolute -bottom-1.5 -right-1.5 rounded-full p-1" style={{ background: '#07090F', border: '1px solid rgba(255,255,255,0.1)' }}>
                <GraduationCap className="w-3 h-3" style={{ color: '#00C7BE' }} />
              </div>
            </div>
            <h1 className="text-xl font-bold tracking-tight font-display" style={{ color: '#EDF1FA' }}>
              DBAcademy
            </h1>
          </Link>

          <div className="h-6 w-px mx-1 hidden sm:block" style={{ background: 'rgba(255,255,255,0.08)' }} />

          {/* ── Project switcher ──────────────────────────────────────────── */}
          <div className="relative" ref={projectMenuRef}>
            <button
              onClick={() => setProjectMenuOpen(o => !o)}
              className="flex items-center gap-2 py-1.5 px-3 rounded-md text-sm font-medium transition-colors max-w-[180px] cursor-pointer"
              style={{ background: '#111724', border: '1px solid rgba(255,255,255,0.08)', color: '#EDF1FA' }}
            >
              <FolderOpen className="w-3.5 h-3.5 shrink-0" style={{ color: '#5C6B8A' }} />
              <span className="truncate">{activeProject?.name ?? 'Select project'}</span>
              <ChevronDown className="w-3 h-3 shrink-0" style={{ color: '#5C6B8A' }} />
            </button>

            {projectMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 rounded-lg shadow-xl z-50 py-1 overflow-hidden" style={{ background: '#111724', border: '1px solid rgba(255,255,255,0.08)' }}>
                {/* Default playgrounds */}
                <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#5C6B8A' }}>Playgrounds</p>
                {defaultProjects.map(p => (
                  <ProjectMenuItem key={p.id} project={p} active={p.id === projectStore.activeProjectId} onSelect={handleSelectProject} />
                ))}

                {/* User projects */}
                {userProjects.length > 0 && (
                  <div className="mt-1 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#5C6B8A' }}>My projects</p>
                    {userProjects.map(p => (
                      <ProjectMenuItem key={p.id} project={p} active={p.id === projectStore.activeProjectId} onSelect={handleSelectProject} onDelete={handleDeleteProject} />
                    ))}
                  </div>
                )}

                {/* New project */}
                <div className="mt-1 pt-1 px-2 pb-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {showNewProject ? (
                    <div className="flex flex-col gap-1.5 mt-1">
                      <input
                        autoFocus
                        value={newProjectName}
                        onChange={e => setNewProjectName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                        placeholder="Project name…"
                        className="text-sm px-2 py-1 rounded focus:outline-none"
                        style={{ background: '#07090F', border: '1px solid rgba(255,255,255,0.1)', color: '#EDF1FA' }}
                      />
                      <select
                        value={newProjectEngine}
                        onChange={e => setNewProjectEngine(e.target.value as any)}
                        className="text-sm px-2 py-1 rounded focus:outline-none"
                        style={{ background: '#07090F', border: '1px solid rgba(255,255,255,0.1)', color: '#EDF1FA' }}
                      >
                        <option value="sqlite">SQLite</option>
                        <option value="postgres">PostgreSQL</option>
                        <option value="nosql">NoSQL</option>
                      </select>
                      <div className="flex gap-1">
                        <button onClick={handleCreateProject} className="flex-1 text-xs px-2 py-1 rounded cursor-pointer" style={{ background: '#00C7BE', color: '#07090F' }}>Create</button>
                        <button onClick={() => setShowNewProject(false)} className="text-xs px-2 py-1 rounded cursor-pointer" style={{ background: 'rgba(255,255,255,0.06)', color: '#EDF1FA' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNewProject(true)}
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs rounded transition-colors cursor-pointer"
                      style={{ color: '#5C6B8A' }}
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
          <button
            onClick={() => notesStore.toggleDrawer()}
            title="Notes (Cmd+Shift+N)"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer"
            style={{ background: '#111724', border: '1px solid rgba(255,255,255,0.08)', color: '#5C6B8A' }}
          >
            <NotebookPen className="w-3.5 h-3.5" /> Notes
          </button>

          <Link
            href="/dashboard"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer"
            style={{ background: '#111724', border: '1px solid rgba(255,255,255,0.08)', color: '#5C6B8A' }}
          >
            <BarChart3 className="w-3.5 h-3.5" /> Dashboard
          </Link>

          <button
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer disabled:opacity-50"
            style={{ background: '#111724', border: '1px solid rgba(255,255,255,0.08)', color: '#5C6B8A' }}
            onClick={handleSeedData}
            disabled={isSeeding}
            title="Seed sample data"
          >
            <Sprout className={`w-3.5 h-3.5 ${isSeeding ? 'animate-pulse' : ''}`} />
            {isSeeding ? 'Seeding…' : 'Seed'}
          </button>

          <button
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}
            onClick={handleResetDb}
            title="Reset database"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>

        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row flex-1 md:overflow-hidden">

        {/* ── Navigation Sidebar ────────────────────────────────────────── */}
        <div className={`flex flex-row transition-all duration-200 overflow-hidden ${
          sidebarCollapsed
            ? 'h-16 md:h-auto w-full md:w-16 shrink-0'
            : 'max-h-[40vh] md:max-h-full w-full flex-1 md:min-w-[240px]'
        }`} style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>

          {/* ── Activity Bar (vertical icon strip) ────────────────────────── */}
          <div className="flex-shrink-0 w-16 flex flex-col items-center py-2 gap-0.5" style={{ background: '#07090F', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            {TAB_NAV.map(({ id, label, Icon, color, glow }) => {
              const isActive = activeTab === id && !sidebarCollapsed;
              return (
                <button
                  key={id}
                  title={label}
                  onClick={() => {
                    setActiveTab(id);
                    if (sidebarCollapsed) setSidebarCollapsed(false);
                  }}
                  className="group relative flex flex-col items-center justify-center gap-1 rounded-xl transition-all duration-150 cursor-pointer"
                  style={{
                    width: 52, height: 52,
                    background: isActive ? glow : 'transparent',
                    color: isActive ? color : 'rgba(94,113,138,0.5)',
                  }}
                >
                  {/* Left accent bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full" style={{ background: color }} />
                  )}
                  <Icon style={{ width: 20, height: 20, color: isActive ? color : undefined }} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span className="font-semibold leading-none" style={{ fontSize: 9, color: isActive ? color : 'rgba(94,113,138,0.5)' }}>{label}</span>
                </button>
              );
            })}

            <div className="flex-1" />

            <button
              onClick={() => setSidebarCollapsed(c => !c)}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="flex items-center justify-center rounded-xl transition-colors cursor-pointer mb-1"
              style={{ width: 52, height: 40, color: 'rgba(94,113,138,0.5)' }}
            >
              {sidebarCollapsed
                ? <PanelLeftOpen style={{ width: 18, height: 18 }} />
                : <PanelLeftClose style={{ width: 18, height: 18 }} />
              }
            </button>
          </div>

          {/* ── Content Panel ─────────────────────────────────────────────── */}
          {!sidebarCollapsed && (
            <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0C1018' }}>
              {/* Panel title bar — shows active tab icon + label in its color */}
              {(() => {
                const activeNav = TAB_NAV.find(t => t.id === activeTab);
                return (
                  <div className="px-3 py-2.5 shrink-0 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {activeNav && <activeNav.Icon style={{ width: 13, height: 13, color: activeNav.color }} strokeWidth={2.5} />}
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: activeNav?.color ?? '#2E3A52' }}>
                      {activeNav?.label}
                    </span>
                  </div>
                );
              })()}

              {/* Panel content */}
              <div className="flex-1 overflow-y-auto min-h-[150px]">
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
                    <div className="p-3 text-xs text-center" style={{ color: '#5C6B8A', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      Visualizing {schema.length} tables
                    </div>
                    <div className="flex-1 relative overflow-hidden min-h-[200px]" style={{ background: '#07090F' }}>
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
                  <div className="p-4 text-sm text-center" style={{ color: '#5C6B8A' }}>
                    Schema designer is not available for schemaless NoSQL.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Middle Panel: Lesson ────────────────────────────────────────── */}
        {activeLesson && (
          <div className="flex-1 w-full md:w-auto min-w-0 md:min-w-[240px] md:overflow-auto" style={{ background: '#0C1018', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
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

        {/* ── Horizontal resize handle ────────────────────────────────────── */}
        <div
          onMouseDown={onHResizeStart}
          className="hidden md:flex shrink-0 items-center justify-center group select-none"
          style={{ width: 8, background: '#07090F', borderLeft: '1px solid rgba(255,255,255,0.04)', cursor: 'col-resize' }}
        >
          <div className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ width: 3, height: 40, background: '#5C6B8A' }} />
        </div>

        {/* ── Right Panel: Editor + Results ──────────────────────────────── */}
        <div
          className="w-full flex flex-col"
          style={{
            background: '#07090F',
            ...(editorWidthPx !== null
              ? { width: editorWidthPx, minWidth: 280, flexShrink: 0 }
              : { flex: '1 1 auto' }),
          }}
        >

          {/* ── Editor toolbar ─────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-3 shrink-0 h-10" style={{ background: '#0C1018', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {/* Left: file-tab style label + engine badge */}
            <div className="flex items-center gap-2">
              {/* Pseudo file-tab */}
              <div className="flex items-center gap-1.5 px-3 h-10 border-b-2 text-xs font-medium" style={{ borderColor: '#00C7BE', color: '#EDF1FA' }}>
                <div className="w-2 h-2 rounded-full" style={{ background: dbType === 'postgres' ? '#00C7BE' : dbType === 'nosql' ? '#22C55E' : '#F59E0B' }} />
                {dbType === 'nosql' ? 'script.js' : 'query.sql'}
              </div>
              {/* Engine badge */}
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide" style={{
                background: dbType === 'postgres' ? 'rgba(0,199,190,0.1)' : dbType === 'nosql' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                color: dbType === 'postgres' ? '#00C7BE' : dbType === 'nosql' ? '#22C55E' : '#F59E0B',
                border: `1px solid ${dbType === 'postgres' ? 'rgba(0,199,190,0.2)' : dbType === 'nosql' ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
              }}>
                {dbType === 'postgres' ? 'PostgreSQL' : dbType === 'nosql' ? 'NoSQL' : 'SQLite'}
              </span>
            </div>

            {/* Right: Save + Run */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => openSaveQueryModal(query, dbType)}
                title="Save query (⌘S)"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer"
                style={{ color: '#5C6B8A', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                Save <kbd className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: '#2E3A52' }}>⌘S</kbd>
              </button>
              <button
                onClick={() => runQuery()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                style={{ background: '#00C7BE', color: '#07090F', boxShadow: '0 0 12px rgba(0,199,190,0.2)' }}
              >
                <Play style={{ width: 12, height: 12 }} /> Run <kbd className="text-[9px] opacity-60">⌘↵</kbd>
              </button>
            </div>
          </div>

          {/* ── Monaco Editor ──────────────────────────────────────────────── */}
          <div className="flex-1 relative h-[200px] md:h-auto" style={{ minHeight: 120 }}>
            <SqlEditor
              value={query}
              onChange={val => setQuery(val || '')}
              onRun={() => runQuery()}
              language={dbType === 'nosql' ? 'javascript' : 'sql'}
            />
          </div>

          {/* ── Drag-to-resize handle ──────────────────────────────────────── */}
          <div
            onMouseDown={onResizeStart}
            className="shrink-0 flex items-center justify-center group select-none"
            style={{ height: 8, background: '#07090F', borderTop: '1px solid rgba(255,255,255,0.04)', cursor: 'row-resize' }}
          >
            <div className="rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ width: 40, height: 3, background: '#5C6B8A' }} />
          </div>

          {/* ── Results / History panel ────────────────────────────────────── */}
          <div
            className="flex flex-col shrink-0 overflow-hidden transition-all duration-100"
            style={{ height: resultsCollapsed ? 40 : resultsPanelHeight, background: '#0C1018', borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            {/* Tab bar */}
            <div className="flex items-center shrink-0 h-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <button
                onClick={() => setResultsTab('results')}
                className="px-4 h-full text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                style={resultsTab === 'results'
                  ? { color: '#00C7BE', borderBottom: '2px solid #00C7BE' }
                  : { color: '#5C6B8A' }
                }
              >
                Results
              </button>
              <button
                onClick={() => setResultsTab('history')}
                className="px-4 h-full text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                style={resultsTab === 'history'
                  ? { color: '#00C7BE', borderBottom: '2px solid #00C7BE' }
                  : { color: '#5C6B8A' }
                }
              >
                History
              </button>

              <div className="flex-1" />

              {/* Status info */}
              <div className="flex items-center gap-3 px-3">
                {viewingTableName && !resultsCollapsed && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,199,190,0.1)', color: '#00C7BE', border: '1px solid rgba(0,199,190,0.15)' }}>
                    {viewingTableName}
                  </span>
                )}
                {resultsTab === 'results' && results.length > 0 && !resultsCollapsed && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#5C6B8A' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22C55E', display: 'inline-block' }} />
                    {dbType === 'nosql' ? `${results.length} docs` : `${results.length} rows`}
                    {lastRunDuration !== null && <span style={{ color: '#2E3A52' }}>· {lastRunDuration}ms</span>}
                  </span>
                )}
                {error && !resultsCollapsed && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#EF4444' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#EF4444', display: 'inline-block' }} />
                    Error
                  </span>
                )}
                <button
                  onClick={() => setResultsCollapsed(c => !c)}
                  title={resultsCollapsed ? 'Expand results' : 'Collapse results'}
                  className="flex items-center justify-center w-7 h-7 rounded transition-colors cursor-pointer"
                  style={{ color: '#5C6B8A' }}
                >
                  {resultsCollapsed
                    ? <ChevronUp className="w-3.5 h-3.5" />
                    : <ChevronDown className="w-3.5 h-3.5" />
                  }
                </button>
              </div>
            </div>

            {!resultsCollapsed && (
              <div className="flex-1 overflow-auto">
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
            )}
          </div>
        </div>
      </div>

      {/* ── Floating Run Button (mobile) ────────────────────────────────────── */}
      <button
        onClick={() => runQuery()}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-50 cursor-pointer"
        style={{ background: '#00C7BE', color: '#07090F', boxShadow: '0 0 32px rgba(0,199,190,0.4)' }}
        aria-label="Run Query"
      >
        <Play className="w-6 h-6 ml-0.5" />
      </button>

      {/* ── Save Query Modal ─────────────────────────────────────────────────── */}
      {saveQueryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSaveQueryModal(null)} />
          <div className="relative rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4" style={{ background: '#111724', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="font-semibold mb-4 font-display" style={{ color: '#EDF1FA' }}>Save Query</h2>
            <input
              autoFocus
              value={saveQueryTitle}
              onChange={e => setSaveQueryTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitSaveQuery(); if (e.key === 'Escape') setSaveQueryModal(null); }}
              placeholder="Query title…"
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none mb-4"
              style={{ background: '#07090F', border: '1px solid rgba(255,255,255,0.1)', color: '#EDF1FA' }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setSaveQueryModal(null)} className="px-4 py-2 text-sm cursor-pointer" style={{ color: '#5C6B8A' }}>Cancel</button>
              <button onClick={commitSaveQuery} disabled={!saveQueryTitle.trim()} className="px-4 py-2 text-sm font-medium rounded-lg cursor-pointer disabled:opacity-40" style={{ background: '#00C7BE', color: '#07090F' }}>
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
    sqlite: '#F59E0B',
    postgres: '#00C7BE',
    nosql: '#22C55E',
  };

  return (
    <div
      className="group flex items-center justify-between px-3 py-1.5 cursor-pointer transition-colors"
      style={active
        ? { background: 'rgba(0,199,190,0.08)' }
        : {}
      }
      onClick={() => onSelect(project)}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[10px] font-bold uppercase" style={{ color: engineColors[project.engine] ?? '#5C6B8A' }}>
          {project.engine.slice(0, 2).toUpperCase()}
        </span>
        <span className="text-sm truncate" style={{ color: active ? '#00C7BE' : '#EDF1FA', fontWeight: active ? 500 : 400 }}>
          {project.name}
        </span>
      </div>
      {!project.isDefault && onDelete && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(project.id); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 transition-opacity cursor-pointer"
          style={{ color: '#EF4444' }}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
