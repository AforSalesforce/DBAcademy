'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import SqlEditor from '@/features/learn/components/SqlEditor';
import ResultsTable from '@/features/learn/components/ResultsTable';
import Sidebar, { Module, Lesson } from '@/features/learn/components/Sidebar';
import SchemaViewer from '@/features/learn/components/SchemaViewer';
import ERDiagram from '@/features/learn/components/ERDiagram';
import { LessonView } from '@/features/learn/components/LessonView';
import { SavedQueriesPanel } from '@/features/learn/components/SavedQueriesPanel';
import { RunHistory } from '@/features/learn/components/RunHistory';
import { NotesDrawer } from '@/features/learn/components/NotesDrawer';
import { SchemaDesigner } from '@/features/learn/components/SchemaDesigner';
import { ChallengeCard, VerdictBanner } from '@/features/learn/components/ChallengeCard';
import { LearnHome } from '@/features/learn/components/LearnHome';
import { ENGINE_LABEL, PathStep, findStep, nextIncompleteStep, stepAfter } from '@/features/learn/curriculum/path';
import { gradeAttempt, Grade } from '@/features/learn/grading/grade';
import { explainError } from '@/features/learn/grading/explain-error';
import { loadDraft, saveDraft } from '@/features/learn/lesson-drafts';
import { modKeyLabel } from '@/lib/platform';
import {
  Database, GraduationCap, BarChart3, NotebookPen, ChevronDown, ChevronUp,
  FolderOpen, Plus, Trash2, Check, Play, Sprout, RotateCcw,
  PanelLeftClose, PanelLeftOpen, CheckCircle2, ListTree, Code2, MoreHorizontal, Save as SaveIcon,
  BookOpen, Table2, GitBranch, Bookmark, LayoutTemplate,
} from 'lucide-react';
import { EngineType } from '@/db-engines/types';
import { CURRICULUM, getLessonById, LessonContentType } from '@/features/learn/curriculum/curriculum';
import { useProfile } from '@/lib/use-profile';
import { useFeatures } from '@/components/FeaturesProvider';
import { canCreateCustomModule, canCreateProject, canSaveQuery } from '@/features/billing/plans';
import { useProjectStore, DEFAULT_PROJECT_IDS, Project } from '@/stores/project-store';
import { useSavedQueriesStore } from '@/stores/saved-queries-store';
import { useRunHistoryStore } from '@/stores/run-history-store';
import { useNotesStore } from '@/stores/notes-store';
import { useSchemaDesignerStore } from '@/stores/schema-designer';
import { useProgressStore } from '@/stores/progress-store';
import { useDatabaseWorkspace, DEFAULT_QUERY_NOSQL } from '@/features/learn/hooks/useDatabaseWorkspace';

// ── module helpers (unchanged from original) ──────────────────────────────────

const INITIAL_MODULES_STATE: Module[] = CURRICULUM.map(m => ({
  id: m.id,
  title: m.title,
  engine: m.engine,
  builtIn: true,
  lessons: m.lessons.map(l => ({ id: l.id, title: l.title, completed: false, builtIn: true })),
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
  const [dbType, setDbType] = useState<EngineType>('sqlite');

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
  // The welcome / continue panel shows when no lesson is open, until the
  // learner closes it for this session to use the playground.
  const [homeDismissed, setHomeDismissed] = useState(() => {
    try { return typeof window !== 'undefined' && sessionStorage.getItem('dbacademy:home-dismissed') === '1'; } catch { return false; }
  });
  const dismissHome = () => {
    setHomeDismissed(true);
    try { sessionStorage.setItem('dbacademy:home-dismissed', '1'); } catch { /* ignore */ }
  };
  // Phones show one pane at a time, chosen from the bottom tab bar.
  const [mobileView, setMobileView] = useState<'path' | 'lesson' | 'editor'>(() => (homeDismissed ? 'editor' : 'lesson'));
  /** Show the last Check's verdict above the results until the learner runs something else. */
  const [showVerdict, setShowVerdict] = useState(false);
  const [challengeUi, setChallengeUi] = useState<{ grade: Grade | null; checking: boolean; xpAwarded: number | null }>(
    { grade: null, checking: false, xpAwarded: null },
  );

  // ── Project / workspace state ──────────────────────────────────────────────
  const projectStore = useProjectStore();
  const workspace = useDatabaseWorkspace(dbType, projectStore.activeProjectId);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectEngine, setNewProjectEngine] = useState<EngineType>('sqlite');
  const [showNewProject, setShowNewProject] = useState(false);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  // ── Save-query modal ───────────────────────────────────────────────────────
  const [saveQueryModal, setSaveQueryModal] = useState<{ body: string; engine: EngineType } | null>(null);
  const [saveQueryTitle, setSaveQueryTitle] = useState('');

  // ── Stores ─────────────────────────────────────────────────────────────────
  const { completeChallenge } = useProgressStore();
  const lessonProgress = useProgressStore(s => s.progress.lessonProgress);
  const { profile } = useProfile();
  // Plan limits only exist alongside paid plans. With accounts/payments off,
  // everything is local to the browser, so there's nothing to meter or upgrade.
  const { accounts } = useFeatures();
  const savedQueriesStore = useSavedQueriesStore();
  const runHistoryStore = useRunHistoryStore();
  const notesStore = useNotesStore();
  const schemaDesignerStore = useSchemaDesignerStore();

  // ── Hydrate all stores on mount ────────────────────────────────────────────
  useEffect(() => {
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

  // ── Keep each lesson's attempt, so reopening it restores the learner's work ─
  const activeChallengeLessonId = activeLesson?.challenge ? activeLesson.id : null;
  useEffect(() => {
    if (!activeChallengeLessonId) return;
    const timer = setTimeout(() => saveDraft(activeChallengeLessonId, workspace.query), 400);
    return () => clearTimeout(timer);
  }, [workspace.query, activeChallengeLessonId]);

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

  // ── Save query helpers ─────────────────────────────────────────────────────

  const openSaveQueryModal = (body: string, engine: typeof dbType) => {
    setSaveQueryModal({ body, engine });
    setSaveQueryTitle('');
  };

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
        openSaveQueryModal(workspace.query, dbType);
      }
      // Run from anywhere on the page, not only inside the editor (which
      // handles the shortcut itself). Text fields keep Ctrl+Enter for themselves.
      if (mod && e.key === 'Enter') {
        const target = e.target as HTMLElement | null;
        if (target?.closest('.monaco-editor, textarea, input, [contenteditable="true"]')) return;
        e.preventDefault();
        runQuery();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [workspace.query, dbType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Init editor width on desktop mount ────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      // Half the screen, but leave the sidebar and lesson ~260px each first
      // (on a 1000px window the editor used to squeeze both until titles clipped).
      const w = window.innerWidth;
      setEditorWidthPx(Math.round(Math.max(380, Math.min(w * 0.5, w - 64 - 8 - 2 * 260))));
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

  // ── Run query (wraps the workspace hook to also drive the results tab) ────

  const runQuery = (overrideQuery?: string, fromCheck = false) => {
    // While an engine is switching, the old one is still attached: don't run on it.
    if (workspace.loading) return Promise.resolve();
    if (!fromCheck) setShowVerdict(false);
    setResultsTab('results');
    return workspace.runQuery(overrideQuery);
  };

  const commitSaveQuery = async () => {
    if (!saveQueryModal || !saveQueryTitle.trim()) return;
    const plan = profile?.plan ?? 'free';
    if (accounts && !canSaveQuery(plan, savedQueriesStore.queries.length)) {
      workspace.setError('Saved query limit reached. Upgrade to Pro for unlimited saved queries.');
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
    // An open lesson stays open in another engine; its challenge card offers
    // the way back (see engineMismatch).
    projectStore.setActiveProject(project.id);
    setProjectMenuOpen(false);
    setShowNewProject(false);
  };

  const handleCreateProject = async () => {
    const plan = profile?.plan ?? 'free';
    const userCount = projectStore.projects.filter(p => !p.isDefault).length;
    if (accounts && !canCreateProject(plan, userCount)) {
      workspace.setError('Project limit reached on the Free plan (2 projects). Upgrade to Pro for unlimited projects.');
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
    const name = projectStore.projects.find(p => p.id === id)?.name ?? 'this project';
    if (!window.confirm(`Delete "${name}" and its database? This can't be undone.`)) return;
    await projectStore.deleteProject(id);
  };

  const handleResetDb = () => {
    if (!window.confirm('Reset this database to the original sample data? Tables and rows you created will be deleted.')) return;
    workspace.handleResetDb();
  };

  // ── Seeding (wraps the workspace hook to also switch to the Tables tab) ───

  const handleSeedData = async () => {
    await workspace.handleSeedData();
    setActiveTab('schema');
  };

  // ── Module / lesson handlers (unchanged) ──────────────────────────────────

  const handleAddModule = (title: string) => {
    const customModuleCount = modules.filter(m => !CURRICULUM.some(c => c.id === m.id)).length;
    if (accounts && !canCreateCustomModule(profile?.plan ?? 'free', customModuleCount)) {
      workspace.setError('Custom module limit reached. Upgrade to Pro for unlimited modules — see /pricing.');
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

  const handleRemoveModule = (moduleId: string) => {
    setModules(prev => {
      const updated = prev.filter(m => m.id !== moduleId);
      localStorage.setItem('db_academy_modules', JSON.stringify(updated));
      return updated;
    });
    if (activeLessonModuleId === moduleId) {
      setActiveLesson(null);
      setActiveLessonModuleId(null);
    }
  };

  const handleRemoveLesson = (moduleId: string, lessonId: string) => {
    setModules(prev => {
      const updated = prev.map(m => m.id === moduleId
        ? { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) }
        : m
      );
      localStorage.setItem('db_academy_modules', JSON.stringify(updated));
      return updated;
    });
    if (activeLesson?.id === lessonId) {
      setActiveLesson(null);
      setActiveLessonModuleId(null);
    }
  };

  const handleUpdateLessonContent = (id: string, newContent: string) => {
    const updated = { ...userLessons, [id]: newContent };
    setUserLessons(updated);
    localStorage.setItem('user_lessons_content', JSON.stringify(updated));
    if (activeLesson?.id === id) setActiveLesson({ ...activeLesson, content: newContent });
  };

  const handleSelectLesson = (lesson: Lesson, moduleId: string) => {
    setMobileView('lesson');
    const fullLesson = getLessonById(moduleId, lesson.id);
    setActiveLessonModuleId(moduleId);
    setChallengeUi({ grade: null, checking: false, xpAwarded: null });
    setShowVerdict(false);
    workspace.clearResults(); // don't leave the previous lesson's output on screen
    if (fullLesson) {
      setActiveLesson(fullLesson);
      // The learner's own attempt if they have one; otherwise the starter.
      const editorText = loadDraft(fullLesson.id) ?? fullLesson.challenge?.starter ?? fullLesson.defaultQuery;
      const module = modules.find(m => m.id === moduleId);
      if (module?.engine && module.engine !== dbType) {
        // Switch to the matching default playground for that engine
        const playgroundId = DEFAULT_PROJECT_IDS[module.engine] ?? DEFAULT_PROJECT_IDS.sqlite!;
        if (editorText) workspace.setQueryForProject(playgroundId, editorText);
        projectStore.setActiveProject(playgroundId);
      } else if (editorText) {
        workspace.setQuery(editorText);
      }
    } else {
      const savedContent = userLessons[lesson.id];
      setActiveLesson({ id: lesson.id, title: lesson.title, content: savedContent || `# ${lesson.title}\n\nThis is a user-created lesson. Add content here.` });
    }
  };

  // ── Challenges ─────────────────────────────────────────────────────────────

  const lessonEngine = CURRICULUM.find(m => m.id === activeLessonModuleId)?.engine;

  const checkChallenge = async () => {
    const challenge = activeLesson?.challenge;
    if (!activeLesson || !challenge || !activeLessonModuleId || !lessonEngine || workspace.loading || lessonEngine !== dbType) return;
    if (lessonEngine !== 'sqlite' && lessonEngine !== 'postgres' && lessonEngine !== 'nosql') return;
    const lessonId = activeLesson.id;
    const attempt = workspace.query;
    setChallengeUi({ grade: null, checking: true, xpAwarded: null });
    // Show the attempt's own output too, as if they'd pressed Run.
    const [grade] = await Promise.all([
      gradeAttempt(lessonEngine, lessonId, challenge, attempt),
      runQuery(attempt, true),
    ]);
    const xpAwarded = grade.status === 'pass' ? completeChallenge(lessonId, activeLessonModuleId) : null;
    setChallengeUi({ grade, checking: false, xpAwarded });
    setShowVerdict(true);
    setMobileView('lesson'); // on phones, the verdict is on the lesson pane
  };

  /** The lesson after the open one in the learning path (it may switch engine). */
  const nextLesson = activeLesson ? stepAfter(activeLesson.id) : null;

  const openStep = (step: PathStep) =>
    handleSelectLesson({ id: step.lesson.id, title: step.lesson.title, completed: false }, step.module.id);

  /** Switch to an engine's own playground (closing a lesson for another engine). */
  const switchEngine = (engine: EngineType) => {
    if (engine === dbType) return;
    const playgroundId = DEFAULT_PROJECT_IDS[engine];
    const playground = projectStore.projects.find(p => p.id === playgroundId);
    if (playground) handleSelectProject(playground);
  };

  // ── Deep link: /learn?lesson=<id> opens that lesson (e.g. the dashboard's
  // "Continue"). Runs once, after the first engine has loaded.
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (workspace.loading || deepLinkHandled.current) return;
    deepLinkHandled.current = true;
    const url = new URL(window.location.href);
    const step = findStep(url.searchParams.get('lesson') ?? '');
    if (!step) return;
    url.searchParams.delete('lesson');
    window.history.replaceState({}, '', url.toString());
    // Opening a lesson named in the URL is syncing with something outside
    // React, which is what effects are for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    openStep(step);
  }, [workspace.loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Narrow editor pane: drop the file tab and shortcut hints, shorten labels,
  // so Run is never pushed off-screen.
  const compactToolbar = editorWidthPx !== null && editorWidthPx < 600;
  const tinyToolbar = editorWidthPx !== null && editorWidthPx < 440;
  const mod = modKeyLabel();

  // A lesson stays open when you switch engine, but can't be checked until you switch back.
  const engineMismatch = Boolean(activeLesson?.challenge && lessonEngine && lessonEngine !== dbType);

  const explainForEngine = (message: string) => explainError(message, { engine: dbType, tables: workspace.schema });

  // One path through every module, whatever engine is open; opening a
  // lesson switches engine for you.
  const pathModules = modules.map(m => {
    const index = CURRICULUM.findIndex(c => c.id === m.id);
    return {
      ...m,
      number: index >= 0 ? index + 1 : undefined,
      lessons: m.lessons.map(l => ({ ...l, completed: Boolean(lessonProgress[l.id]?.completed) })),
    };
  });
  const focusModuleId = activeLessonModuleId
    ?? nextIncompleteStep(id => Boolean(lessonProgress[id]?.completed))?.module.id;
  const activeProject = projectStore.getActiveProject();

  // ── Loading screen (first load only) ──────────────────────────────────────
  // Later engine switches keep the layout and show an overlay on the editor
  // instead, so moving between lessons doesn't blank the page.

  if (workspace.loading && !workspace.db) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4" style={{ background: '#07090F', color: '#EDF1FA' }}>
        <div className="relative w-10 h-10">
          <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(0,199,190,0.2)', borderTopColor: '#00C7BE' }} />
          <Database className="w-4 h-4 absolute inset-0 m-auto" style={{ color: '#00C7BE' }} />
        </div>
        <div className="text-sm font-medium animate-pulse" style={{ color: '#8A97B3' }}>Initializing Engine…</div>
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
    <div className="flex flex-col w-full min-h-screen md:h-screen md:overflow-hidden pb-14 md:pb-0" style={{ background: '#07090F', color: '#EDF1FA' }}>

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
            <h1 className="hidden sm:block text-xl font-bold tracking-tight font-display" style={{ color: '#EDF1FA' }}>
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
              <FolderOpen className="w-3.5 h-3.5 shrink-0" style={{ color: '#8A97B3' }} />
              <span className="truncate">{activeProject?.name ?? 'Select project'}</span>
              <ChevronDown className="w-3 h-3 shrink-0" style={{ color: '#8A97B3' }} />
            </button>

            {projectMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 rounded-lg shadow-xl z-50 py-1 overflow-hidden" style={{ background: '#111724', border: '1px solid rgba(255,255,255,0.08)' }}>
                {/* Default playgrounds */}
                <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#8A97B3' }}>Playgrounds</p>
                {defaultProjects.map(p => (
                  <ProjectMenuItem key={p.id} project={p} active={p.id === projectStore.activeProjectId} onSelect={handleSelectProject} />
                ))}

                {/* User projects */}
                {userProjects.length > 0 && (
                  <div className="mt-1 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#8A97B3' }}>My projects</p>
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
                      style={{ color: '#8A97B3' }}
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
          <MobileMoreMenu
            onNotes={() => notesStore.toggleDrawer()}
            onSeed={handleSeedData}
            seeding={workspace.isSeeding}
            onReset={handleResetDb}
          />
          <button
            onClick={() => notesStore.toggleDrawer()}
            title="Notes (Cmd+Shift+N)"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer"
            style={{ background: '#111724', border: '1px solid rgba(255,255,255,0.08)', color: '#8A97B3' }}
          >
            <NotebookPen className="w-3.5 h-3.5" /> Notes
          </button>

          <Link
            href="/dashboard"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer"
            style={{ background: '#111724', border: '1px solid rgba(255,255,255,0.08)', color: '#8A97B3' }}
          >
            <BarChart3 className="w-3.5 h-3.5" /> Dashboard
          </Link>

          <button
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer disabled:opacity-50"
            style={{ background: '#111724', border: '1px solid rgba(255,255,255,0.08)', color: '#8A97B3' }}
            onClick={handleSeedData}
            disabled={workspace.isSeeding}
            title="Seed sample data"
          >
            <Sprout className={`w-3.5 h-3.5 ${workspace.isSeeding ? 'animate-pulse' : ''}`} />
            {workspace.isSeeding ? 'Seeding…' : 'Seed'}
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
        <div className={`${mobileView === 'path' ? 'flex' : 'hidden'} md:flex flex-row transition-all duration-200 overflow-hidden w-full h-[calc(100dvh-7rem)] md:h-auto ${
          sidebarCollapsed
            ? 'md:w-16 md:shrink-0'
            : 'md:flex-1 md:max-h-full md:min-w-[240px]'
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
                    color: isActive ? color : '#7A87A5',
                  }}
                >
                  {/* Left accent bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full" style={{ background: color }} />
                  )}
                  <Icon style={{ width: 20, height: 20, color: isActive ? color : undefined }} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span className="font-semibold leading-none" style={{ fontSize: 9, color: isActive ? color : '#7A87A5' }}>{label}</span>
                </button>
              );
            })}

            <div className="flex-1" />

            <button
              onClick={() => setSidebarCollapsed(c => !c)}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden md:flex items-center justify-center rounded-xl transition-colors cursor-pointer mb-1"
              style={{ width: 52, height: 40, color: '#7A87A5' }}
            >
              {sidebarCollapsed
                ? <PanelLeftOpen style={{ width: 18, height: 18 }} />
                : <PanelLeftClose style={{ width: 18, height: 18 }} />
              }
            </button>
          </div>

          {/* ── Content Panel ─────────────────────────────────────────────── */}
          {/* Collapsing only applies on wide screens; phones always show the panel. */}
          {(
            <div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'md:hidden' : ''}`} style={{ background: '#0C1018' }}>
              {/* Panel title bar — shows active tab icon + label in its color */}
              {(() => {
                const activeNav = TAB_NAV.find(t => t.id === activeTab);
                return (
                  <div className="px-3 py-2.5 shrink-0 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {activeNav && <activeNav.Icon style={{ width: 13, height: 13, color: activeNav.color }} strokeWidth={2.5} />}
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: activeNav?.color ?? '#7A87A5' }}>
                      {activeNav?.label}
                    </span>
                  </div>
                );
              })()}

              {/* Panel content */}
              <div className="flex-1 overflow-y-auto min-h-[150px]">
                {activeTab === 'curriculum' && (
                  <Sidebar
                    modules={pathModules}
                    focusModuleId={focusModuleId}
                    activeLessonId={activeLesson?.id}
                    onAddModule={handleAddModule}
                    onAddLesson={handleAddLesson}
                    onSelectLesson={handleSelectLesson}
                    onRemoveModule={handleRemoveModule}
                    onRemoveLesson={handleRemoveLesson}
                  />
                )}
                {activeTab === 'schema' && <SchemaViewer tables={workspace.schema} onViewTable={name => { workspace.handleViewTable(name); setMobileView('editor'); }} />}
                {activeTab === 'erd' && (
                  <div className="h-full flex flex-col">
                    <div className="p-3 text-xs text-center" style={{ color: '#8A97B3', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      Visualizing {workspace.schema.length} tables
                    </div>
                    <div className="flex-1 relative overflow-hidden min-h-[200px]" style={{ background: '#07090F' }}>
                      <ERDiagram tables={workspace.schema} />
                    </div>
                  </div>
                )}
                {activeTab === 'queries' && (
                  <SavedQueriesPanel
                    activeEngine={dbType}
                    activeProjectId={projectStore.activeProjectId}
                    onLoad={body => { workspace.setQuery(body); setMobileView('editor'); }}
                    onRun={body => { workspace.setQuery(body); runQuery(body); setMobileView('editor'); }}
                  />
                )}
                {activeTab === 'design' && dbType !== 'nosql' && (
                  <div className="h-full">
                    <SchemaDesigner
                      engine={dbType}
                      projectId={projectStore.activeProjectId}
                      currentSchema={workspace.schema}
                      onApplyDDL={ddl => { workspace.setQuery(ddl); setActiveTab('curriculum'); }}
                    />
                  </div>
                )}
                {activeTab === 'design' && dbType === 'nosql' && (
                  <div className="p-4 text-sm text-center" style={{ color: '#8A97B3' }}>
                    Schema designer is not available for schemaless NoSQL.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Middle Panel: Lesson, or the welcome / continue panel ─────────── */}
        {activeLesson ? (
          <div className={`${mobileView === 'lesson' ? 'block' : 'hidden'} md:block flex-1 w-full md:w-auto min-w-0 md:min-w-[240px] md:overflow-auto min-h-[calc(100dvh-7rem)] md:min-h-0`} style={{ background: '#0C1018', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <LessonView
              key={activeLesson.id}
              id={activeLesson.id}
              title={activeLesson.title}
              content={activeLesson.content}
              defaultQuery={activeLesson.defaultQuery}
              quiz={activeLesson.quiz}
              moduleId={activeLessonModuleId || undefined}
              onRunSample={q => { workspace.setQuery(q); runQuery(q); }}
              runsSample
              challengeSlot={activeLesson.challenge && (
                <ChallengeCard
                  lessonId={activeLesson.id}
                  challenge={activeLesson.challenge}
                  grade={challengeUi.grade}
                  checking={challengeUi.checking}
                  xpAwarded={challengeUi.xpAwarded}
                  onCheck={checkChallenge}
                  onResetStarter={() => {
                    if (window.confirm('Replace the editor contents with the starting query?')) {
                      workspace.setQuery(activeLesson.challenge!.starter);
                      setMobileView('editor');
                    }
                  }}
                  onUseSolution={sql => { workspace.setQuery(sql); setMobileView('editor'); }}
                  onNextLesson={nextLesson ? () => openStep(nextLesson) : undefined}
                  explain={explainForEngine}
                  engineMismatch={engineMismatch ? {
                    lessonEngine: ENGINE_LABEL[lessonEngine!],
                    currentEngine: ENGINE_LABEL[dbType],
                    onSwitchBack: () => switchEngine(lessonEngine!),
                  } : undefined}
                />
              )}
              onClose={() => { setActiveLesson(null); setActiveLessonModuleId(null); }}
              onEdit={
                !CURRICULUM.some(m => m.lessons.some(l => l.id === activeLesson.id))
                  ? newContent => handleUpdateLessonContent(activeLesson.id, newContent)
                  : undefined
              }
            />
          </div>
        ) : !homeDismissed ? (
          <div className={`${mobileView === 'lesson' ? 'block' : 'hidden'} md:block flex-1 w-full md:w-auto min-w-0 md:min-w-[240px] md:overflow-auto min-h-[calc(100dvh-7rem)] md:min-h-0`} style={{ background: '#0C1018', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <LearnHome onStart={openStep} onDismiss={() => { dismissHome(); setMobileView('editor'); }} />
          </div>
        ) : mobileView === 'lesson' && (
          // Phones only: the Lesson tab with nothing open.
          <div className="md:hidden flex flex-col items-center justify-center gap-3 p-8 text-center min-h-[calc(100dvh-7rem)]" style={{ background: '#0C1018' }}>
            <BookOpen className="w-8 h-8" style={{ color: '#00C7BE' }} aria-hidden="true" />
            <p className="text-sm" style={{ color: '#B4BED3' }}>No lesson open.</p>
            <button onClick={() => setMobileView('path')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: '#00C7BE', color: '#07090F' }}>
              Choose a lesson
            </button>
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
          className={`${mobileView === 'editor' ? 'flex' : 'hidden'} md:flex w-full flex-col h-[calc(100dvh-7rem)] md:h-auto`}
          style={{
            background: '#07090F',
            ...(editorWidthPx !== null
              ? { width: editorWidthPx, minWidth: 280, flexShrink: 0 }
              : { flex: '1 1 auto' }),
          }}
        >

          {/* ── Editor toolbar ─────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-3 shrink-0 h-10" style={{ background: '#0C1018', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {/* Left: file-tab style label + engine switcher */}
            <div className="flex items-center gap-2 min-w-0">
              {/* Pseudo file-tab */}
              <div className={`${compactToolbar ? 'hidden' : 'hidden md:flex'} items-center gap-1.5 px-3 h-10 border-b-2 text-xs font-medium`} style={{ borderColor: '#00C7BE', color: '#EDF1FA' }}>
                <div className="w-2 h-2 rounded-full" style={{ background: dbType === 'postgres' ? '#00C7BE' : dbType === 'nosql' ? '#22C55E' : '#F59E0B' }} />
                {dbType === 'nosql' ? 'script.js' : 'query.sql'}
              </div>
              {/* Engine switcher */}
              <div role="group" aria-label="Database engine" className="flex items-center rounded-md p-0.5" style={{ background: '#07090F', border: '1px solid rgba(255,255,255,0.08)' }}>
                {(['sqlite', 'postgres', 'nosql'] as const).map(engine => {
                  const active = dbType === engine;
                  const color = engine === 'postgres' ? '#00C7BE' : engine === 'nosql' ? '#22C55E' : '#F59E0B';
                  return (
                    <button
                      key={engine}
                      onClick={() => switchEngine(engine)}
                      aria-pressed={active}
                      title={active ? `Using ${ENGINE_LABEL[engine]}` : `Switch to the ${ENGINE_LABEL[engine]} playground`}
                      className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400"
                      style={active
                        ? { color, background: `${color}1A`, boxShadow: `inset 0 0 0 1px ${color}40` }
                        : { color: '#8A97B3' }}
                    >
                      {engine === 'postgres' ? 'Postgres' : ENGINE_LABEL[engine]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Check + Save + Run. Never shrinks, so Run always stays on screen. */}
            <div className="flex items-center gap-1.5 shrink-0">
              {activeLesson?.challenge && (
                <button
                  onClick={checkChallenge}
                  disabled={challengeUi.checking || workspace.loading}
                  // aria-disabled, not disabled, on the wrong engine: browsers show
                  // no tooltip on a disabled button, and this one needs to explain itself.
                  aria-disabled={engineMismatch || undefined}
                  title={engineMismatch
                    ? `This lesson uses ${ENGINE_LABEL[lessonEngine!]}. Switch back to ${ENGINE_LABEL[lessonEngine!]} to check your answer.`
                    : "Check your answer to this lesson's challenge"}
                  aria-label={tinyToolbar ? 'Check my answer' : undefined}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${engineMismatch ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  style={{ color: '#00C7BE', background: 'rgba(0,199,190,0.08)', border: '1px solid rgba(0,199,190,0.3)' }}
                >
                  <CheckCircle2 style={{ width: 12, height: 12 }} aria-hidden="true" />
                  {!tinyToolbar && (challengeUi.checking ? 'Checking…' : 'Check')}
                </button>
              )}
              <button
                onClick={() => openSaveQueryModal(workspace.query, dbType)}
                title={`Save query (${mod}S)`}
                aria-label="Save query"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer"
                style={{ color: '#8A97B3', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {compactToolbar
                  ? <SaveIcon style={{ width: 13, height: 13 }} aria-hidden="true" />
                  : <>Save <kbd className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: '#8A97B3' }}>{mod}S</kbd></>}
              </button>
              <button
                onClick={() => runQuery()}
                disabled={workspace.loading}
                title={`Run query (${mod}Enter)`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                style={{ background: '#00C7BE', color: '#07090F', boxShadow: '0 0 12px rgba(0,199,190,0.2)' }}
              >
                <Play style={{ width: 12, height: 12 }} aria-hidden="true" /> Run {!compactToolbar && <kbd className="text-[9px] opacity-60">{mod}↵</kbd>}
              </button>
            </div>
          </div>

          {/* ── Monaco Editor ──────────────────────────────────────────────── */}
          <div className="flex-1 relative" style={{ minHeight: 120 }}>
            {workspace.loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center gap-3" style={{ background: 'rgba(7,9,15,0.75)' }} role="status" aria-live="polite">
                <div className="w-5 h-5 rounded-full border-2 animate-spin motion-reduce:animate-none" style={{ borderColor: 'rgba(0,199,190,0.2)', borderTopColor: '#00C7BE' }} />
                <span className="text-sm" style={{ color: '#B4BED3' }}>Preparing the {ENGINE_LABEL[dbType]} database…</span>
              </div>
            )}
            <SqlEditor
              value={workspace.query}
              onChange={val => workspace.setQuery(val || '')}
              onRun={text => runQuery(text)}
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
                  : { color: '#8A97B3' }
                }
              >
                Results
              </button>
              <button
                onClick={() => setResultsTab('history')}
                className="px-4 h-full text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                style={resultsTab === 'history'
                  ? { color: '#00C7BE', borderBottom: '2px solid #00C7BE' }
                  : { color: '#8A97B3' }
                }
              >
                History
              </button>

              <div className="flex-1" />

              {/* Status info */}
              <div className="flex items-center gap-3 px-3">
                {workspace.viewingTableName && !resultsCollapsed && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,199,190,0.1)', color: '#00C7BE', border: '1px solid rgba(0,199,190,0.15)' }}>
                    {workspace.viewingTableName}
                  </span>
                )}
                {resultsTab === 'results' && workspace.results.length > 0 && !resultsCollapsed && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#8A97B3' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22C55E', display: 'inline-block' }} />
                    {workspace.results.length} {dbType === 'nosql' ? 'doc' : 'row'}{workspace.results.length === 1 ? '' : 's'}
                    {workspace.lastRunDuration !== null && <span style={{ color: '#7A87A5' }}>· {workspace.lastRunDuration}ms</span>}
                  </span>
                )}
                {workspace.error && !resultsCollapsed && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#EF4444' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#EF4444', display: 'inline-block' }} />
                    Error
                  </span>
                )}
                <button
                  onClick={() => setResultsCollapsed(c => !c)}
                  title={resultsCollapsed ? 'Expand results' : 'Collapse results'}
                  className="flex items-center justify-center w-7 h-7 rounded transition-colors cursor-pointer"
                  style={{ color: '#8A97B3' }}
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
                {resultsTab === 'results' && showVerdict && challengeUi.grade && (
                  <VerdictBanner
                    grade={challengeUi.grade}
                    xpAwarded={challengeUi.xpAwarded}
                    onNext={challengeUi.grade.status === 'pass' && nextLesson ? () => openStep(nextLesson) : undefined}
                  />
                )}
                {resultsTab === 'results' && (
                  <ResultsTable
                    results={workspace.results}
                    error={workspace.error}
                    columns={workspace.resultColumns}
                    message={workspace.resultMessage}
                    hasRun={workspace.hasRun}
                    errorHint={workspace.error ? explainForEngine(workspace.error) : null}
                    query={workspace.lastRunQuery}
                  />
                )}
                {resultsTab === 'history' && (
                  <RunHistory
                    activeProjectId={projectStore.activeProjectId}
                    onLoad={body => workspace.setQuery(body)}
                    onRun={body => { workspace.setQuery(body); runQuery(body); }}
                    onSave={(body, engine) => openSaveQueryModal(body, engine)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom tab bar (phones) ─────────────────────────────────────────── */}
      <nav
        aria-label="Workspace"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 h-14 grid grid-cols-3"
        style={{ background: '#0C1018', borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        {([
          { id: 'path', label: 'Path', Icon: ListTree },
          { id: 'lesson', label: 'Lesson', Icon: BookOpen },
          { id: 'editor', label: 'Editor', Icon: Code2 },
        ] as const).map(({ id, label, Icon }) => {
          const active = mobileView === id;
          return (
            <button
              key={id}
              onClick={() => setMobileView(id)}
              aria-current={active ? 'page' : undefined}
              className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal-400"
              style={{ color: active ? '#00C7BE' : '#8A97B3' }}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </nav>

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
              <button onClick={() => setSaveQueryModal(null)} className="px-4 py-2 text-sm cursor-pointer" style={{ color: '#8A97B3' }}>Cancel</button>
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
        <span className="text-[10px] font-bold uppercase" style={{ color: engineColors[project.engine] ?? '#8A97B3' }}>
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

// ── MobileMoreMenu ────────────────────────────────────────────────────────────

/** Phones: the header actions that don't fit (Notes, Dashboard, Seed, Reset). */
function MobileMoreMenu({ onNotes, onSeed, seeding, onReset }: {
  onNotes: () => void;
  onSeed: () => void;
  seeding: boolean;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const item = 'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left min-h-[44px]';
  const run = (action: () => void) => () => { setOpen(false); action(); };

  return (
    <div className="relative sm:hidden" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
        className="flex items-center justify-center w-10 h-10 rounded-md"
        style={{ background: '#111724', border: '1px solid rgba(255,255,255,0.08)', color: '#EDF1FA' }}
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1 w-48 rounded-lg shadow-xl z-50 py-1" style={{ background: '#111724', border: '1px solid rgba(255,255,255,0.08)', color: '#EDF1FA' }}>
          <button role="menuitem" className={item} onClick={run(onNotes)}><NotebookPen className="w-4 h-4" style={{ color: '#8A97B3' }} /> Notes</button>
          <Link role="menuitem" href="/dashboard" className={item}><BarChart3 className="w-4 h-4" style={{ color: '#8A97B3' }} /> Dashboard</Link>
          <button role="menuitem" className={item} onClick={run(onSeed)} disabled={seeding}><Sprout className="w-4 h-4" style={{ color: '#8A97B3' }} /> {seeding ? 'Seeding…' : 'Seed sample data'}</button>
          <button role="menuitem" className={item} onClick={run(onReset)} style={{ color: '#EF4444' }}><RotateCcw className="w-4 h-4" /> Reset database</button>
        </div>
      )}
    </div>
  );
}
