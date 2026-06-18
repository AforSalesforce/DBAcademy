'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import SqlEditor from '@/features/learn/components/SqlEditor';
import Sidebar, { Module, Lesson } from '@/features/learn/components/Sidebar';
import { LessonView } from '@/features/learn/components/LessonView';
import { CodeOutput } from '@/features/code-playground/components/CodeOutput';
import {
  Database, GraduationCap, BarChart3, Play, BookOpen,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import type { CodeResult, CodeEngine } from '@/db-engines/types';
import type { LessonContentType } from '@/features/learn/curriculum/curriculum';
import { JavaScriptEngine } from '@/features/code-playground/engines/js-engine';
import { PythonEngine }     from '@/features/code-playground/engines/python-engine';
import { ServerCodeEngine } from '@/features/code-playground/engines/server-engine';
import { CODE_CURRICULUM,     getCodeLessonById }     from '@/features/code-playground/curriculum/code-curriculum';
import { PYTHON_CURRICULUM,   getPythonLessonById }   from '@/features/code-playground/curriculum/python-curriculum';
import { COMPILED_CURRICULUM, getCompiledLessonById } from '@/features/code-playground/curriculum/compiled-curriculum';
import { useProgressStore } from '@/stores/progress-store';
import { useCodeHistoryStore } from '@/stores/code-history-store';
import type { ModuleType } from '@/features/learn/curriculum/curriculum';

// ── Language configuration ────────────────────────────────────────────────────

const LANGUAGES = [
  { id: 'javascript', abbr: 'JS',   label: 'JavaScript', color: '#F59E0B', monacoLang: 'javascript', clientSide: true  },
  { id: 'python',     abbr: 'PY',   label: 'Python',     color: '#3B82F6', monacoLang: 'python',     clientSide: true  },
  { id: 'java',       abbr: 'Java', label: 'Java',        color: '#F97316', monacoLang: 'java',       clientSide: false },
  { id: 'c',          abbr: 'C',    label: 'C',           color: '#60A5FA', monacoLang: 'c',          clientSide: false },
  { id: 'cpp',        abbr: 'C++',  label: 'C++',         color: '#818CF8', monacoLang: 'cpp',        clientSide: false },
  { id: 'go',         abbr: 'Go',   label: 'Go',          color: '#22D3EE', monacoLang: 'go',         clientSide: false },
] as const;

type LangId = typeof LANGUAGES[number]['id'];

const DEFAULT_CODE: Record<LangId, string> = {
  javascript: `// Welcome to the JavaScript Sandbox!
// Press ⌘↵ (Ctrl+Enter) or the Run button to execute.

const greet = (name) => \`Hello, \${name}!\`;
console.log(greet("World"));

const nums = [1, 2, 3, 4, 5];
console.log("Sum:", nums.reduce((a, b) => a + b, 0));`,

  python: `# Welcome to Python!
# First run loads the Python runtime (~3 s).

def greet(name):
    return f"Hello, {name}!"

print(greet("World"))

nums = [1, 2, 3, 4, 5]
print("Sum:", sum(nums))`,

  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        int sum = 0;
        for (int i = 1; i <= 5; i++) sum += i;
        System.out.println("Sum 1-5: " + sum);
    }
}`,

  c: `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    int sum = 0;
    for (int i = 1; i <= 5; i++) sum += i;
    printf("Sum 1-5: %d\\n", sum);
    return 0;
}`,

  cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    int sum = 0;
    for (int i = 1; i <= 5; i++) sum += i;
    cout << "Sum 1-5: " << sum << endl;
    return 0;
}`,

  go: `package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
    sum := 0
    for i := 1; i <= 5; i++ {
        sum += i
    }
    fmt.Println("Sum 1-5:", sum)
}`,
};

// ── Curriculum routing ────────────────────────────────────────────────────────

function getCurriculumForLang(lang: LangId): ModuleType[] {
  if (lang === 'python') return PYTHON_CURRICULUM;
  if (lang === 'java' || lang === 'c' || lang === 'cpp' || lang === 'go') return COMPILED_CURRICULUM;
  return CODE_CURRICULUM;
}

function getLessonForLang(lang: LangId, moduleId: string, lessonId: string): LessonContentType | undefined {
  if (lang === 'python') return getPythonLessonById(moduleId, lessonId);
  if (lang === 'java' || lang === 'c' || lang === 'cpp' || lang === 'go') return getCompiledLessonById(moduleId, lessonId);
  return getCodeLessonById(moduleId, lessonId);
}

function createEngine(lang: LangId): CodeEngine {
  if (lang === 'javascript') return new JavaScriptEngine();
  if (lang === 'python')     return new PythonEngine();
  return new ServerCodeEngine(lang);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CodePage() {
  const [language, setLanguage] = useState<LangId>('javascript');
  const activeLang = LANGUAGES.find(l => l.id === language)!;

  const [code, setCode]     = useState(DEFAULT_CODE.javascript);
  const [output, setOutput] = useState<CodeResult | null>(null);
  const [running, setRunning] = useState(false);

  const [modules, setModules] = useState<Module[]>([]);
  const [activeLesson, setActiveLesson] = useState<LessonContentType | null>(null);
  const [activeLessonModuleId, setActiveLessonModuleId] = useState<string | null>(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [resultsPanelHeight, setResultsPanelHeight] = useState(220);
  const [editorWidthPx, setEditorWidthPx] = useState<number | null>(null);

  const vResizeDragging = useRef(false);
  const vResizeStartY   = useRef(0);
  const vResizeStartH   = useRef(0);
  const hResizeDragging = useRef(false);
  const hResizeStartX   = useRef(0);
  const hResizeStartW   = useRef(0);

  // Engine map — lazy-init each engine on first use
  const enginesRef       = useRef<Partial<Record<LangId, CodeEngine>>>({});
  const initializedLangs = useRef<Set<LangId>>(new Set(['javascript']));

  const { incrementQueries } = useProgressStore();
  const { progress }         = useProgressStore();
  const codeHistoryStore     = useCodeHistoryStore();

  // ── Boot ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const jsEngine = new JavaScriptEngine();
    jsEngine.init();
    enginesRef.current['javascript'] = jsEngine;
    codeHistoryStore.hydrate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setEditorWidthPx(Math.round(window.innerWidth * 0.5));
    }
  }, []);

  // ── Language switching ────────────────────────────────────────────────────

  useEffect(() => {
    const curriculum = getCurriculumForLang(language);
    setModules(curriculum.map(m => ({
      id: m.id,
      title: m.title,
      engine: m.engine,
      lessons: m.lessons.map(l => ({
        id: l.id,
        title: l.title,
        completed: Boolean(progress.lessonProgress[l.id]?.completed),
      })),
    })));
    setActiveLesson(null);
    setActiveLessonModuleId(null);
    setCode(DEFAULT_CODE[language]);
    setOutput(null);
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Progress sync ─────────────────────────────────────────────────────────

  useEffect(() => {
    setModules(prev => prev.map(m => ({
      ...m,
      lessons: m.lessons.map(l => ({
        ...l,
        completed: Boolean(progress.lessonProgress[l.id]?.completed),
      })),
    })));
  }, [progress.lessonsCompleted]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard shortcut ─────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        runCode();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [code, language]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Resize handlers ───────────────────────────────────────────────────────

  const onVResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    vResizeDragging.current = true;
    vResizeStartY.current = e.clientY;
    vResizeStartH.current = resultsPanelHeight;
    const onMove = (ev: MouseEvent) => {
      if (!vResizeDragging.current) return;
      const delta = vResizeStartY.current - ev.clientY;
      setResultsPanelHeight(Math.max(80, Math.min(500, vResizeStartH.current + delta)));
    };
    const onUp = () => {
      vResizeDragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [resultsPanelHeight]);

  const onHResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    hResizeDragging.current = true;
    hResizeStartX.current = e.clientX;
    hResizeStartW.current = editorWidthPx ?? Math.round(window.innerWidth * 0.5);
    const onMove = (ev: MouseEvent) => {
      if (!hResizeDragging.current) return;
      const delta = hResizeStartX.current - ev.clientX;
      const clamped = Math.max(280, Math.min(Math.round(window.innerWidth * 0.85), hResizeStartW.current + delta));
      setEditorWidthPx(clamped);
    };
    const onUp = () => {
      hResizeDragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [editorWidthPx]);

  // ── Run code ──────────────────────────────────────────────────────────────

  const runCode = async () => {
    if (running) return;
    setRunning(true);
    setOutput(null);
    try {
      let engine = enginesRef.current[language];
      if (!engine) {
        engine = createEngine(language);
        enginesRef.current[language] = engine;
      }
      await engine.init();
      initializedLangs.current.add(language);

      const result = await engine.execute(code);
      setOutput(result);
      incrementQueries();
      await codeHistoryStore.addRun({
        language,
        code,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        durationMs: result.durationMs ?? 0,
      });
    } finally {
      setRunning(false);
    }
  };

  // ── Lesson selection ──────────────────────────────────────────────────────

  const handleSelectLesson = (lesson: Lesson, moduleId: string) => {
    const full = getLessonForLang(language, moduleId, lesson.id);
    if (!full) return;
    setActiveLesson(full);
    setActiveLessonModuleId(moduleId);
    if (full.defaultQuery) setCode(full.defaultQuery);
    setOutput(null);
  };

  const handleRemoveModule = (moduleId: string) => {
    setModules(prev => prev.filter(m => m.id !== moduleId));
    if (activeLessonModuleId === moduleId) {
      setActiveLesson(null);
      setActiveLessonModuleId(null);
    }
  };

  const handleRemoveLesson = (moduleId: string, lessonId: string) => {
    setModules(prev => prev.map(m => m.id === moduleId
      ? { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) }
      : m
    ));
    if (activeLesson?.id === lessonId) {
      setActiveLesson(null);
      setActiveLessonModuleId(null);
    }
  };

  // ── Derived state ─────────────────────────────────────────────────────────

  const isFirstPython   = language === 'python' && !initializedLangs.current.has('python');
  const isServerLang    = !activeLang.clientSide;
  const runButtonLabel  = running
    ? (isFirstPython ? 'Loading Python…' : 'Running…')
    : 'Run';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col w-full min-h-screen md:h-screen md:overflow-hidden"
      style={{ background: '#07090F', color: '#EDF1FA' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="h-14 flex items-center justify-between px-4 shrink-0 z-10"
        style={{ background: '#0C1018', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Left */}
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/" className="flex items-center gap-3 select-none cursor-pointer">
            <div className="relative w-9 h-9 flex items-center justify-center rounded-xl ring-1 ring-white/10"
              style={{ background: 'linear-gradient(135deg, #00C7BE, #0096A0)' }}>
              <Database className="w-5 h-5 text-white" strokeWidth={2} />
              <div className="absolute -bottom-1.5 -right-1.5 rounded-full p-1"
                style={{ background: '#07090F', border: '1px solid rgba(255,255,255,0.1)' }}>
                <GraduationCap className="w-3 h-3" style={{ color: '#00C7BE' }} />
              </div>
            </div>
            <h1 className="text-xl font-bold tracking-tight font-display hidden sm:block" style={{ color: '#EDF1FA' }}>
              DBAcademy
            </h1>
          </Link>

          <div className="h-6 w-px hidden sm:block" style={{ background: 'rgba(255,255,255,0.08)' }} />

          {/* Domain switcher */}
          <div className="hidden sm:flex items-center gap-0.5 p-0.5 rounded-lg"
            style={{ background: '#111724', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Link href="/learn"
              className="px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer"
              style={{ color: '#5C6B8A' }}>
              Database
            </Link>
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold"
              style={{ background: '#1C2940', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}>
              Code
            </span>
          </div>

          <div className="h-6 w-px hidden md:block" style={{ background: 'rgba(255,255,255,0.08)' }} />

          {/* Language selector */}
          <div className="hidden md:flex items-center gap-0.5 p-0.5 rounded-lg"
            style={{ background: '#111724', border: '1px solid rgba(255,255,255,0.06)' }}>
            {LANGUAGES.map(lang => (
              <button
                key={lang.id}
                onClick={() => setLanguage(lang.id)}
                title={lang.label + (lang.clientSide ? ' (in-browser)' : ' (server)')}
                className="px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer"
                style={language === lang.id
                  ? { background: lang.color + '18', color: lang.color, border: `1px solid ${lang.color}30` }
                  : { color: '#5C6B8A' }
                }>
                {lang.abbr}
              </button>
            ))}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {isServerLang && (
            <span className="hidden sm:block text-[10px] px-2 py-1 rounded"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#5C6B8A', border: '1px solid rgba(255,255,255,0.06)' }}>
              Runs on server
            </span>
          )}

          <button
            onClick={runCode}
            disabled={running}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            style={{ background: activeLang.color, color: '#07090F' }}
            title="Run (⌘↵)">
            {running
              ? <div className="w-3.5 h-3.5 rounded-full border-2 border-current/30 border-t-current animate-spin" />
              : <Play className="w-3.5 h-3.5 fill-current" />}
            {runButtonLabel}
          </button>

          <Link href="/dashboard"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer"
            style={{ background: '#111724', border: '1px solid rgba(255,255,255,0.08)', color: '#5C6B8A' }}>
            <BarChart3 className="w-3.5 h-3.5" /> Dashboard
          </Link>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row flex-1 md:overflow-hidden">

        {/* Navigation sidebar */}
        <div className={`flex flex-row transition-all duration-200 overflow-hidden ${
          sidebarCollapsed ? 'shrink-0 md:w-12' : 'flex-1 md:min-w-[240px] md:max-w-[320px]'
        }`}
          style={{ borderRight: '1px solid rgba(255,255,255,0.06)', background: '#0C1018' }}>

          <div className="flex flex-col items-center py-3 gap-1 shrink-0"
            style={{ width: 48, borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => setSidebarCollapsed(c => !c)}
              className="p-2 rounded-md transition-colors cursor-pointer mb-1"
              style={{ color: '#5C6B8A' }}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
            <button
              className="p-2 rounded-md"
              style={{ background: `${activeLang.color}18`, color: activeLang.color }}
              title="Curriculum">
              <BookOpen className="w-4 h-4" />
            </button>
          </div>

          {!sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto py-2">
              <Sidebar
                modules={modules}
                activeLessonId={activeLesson?.id}
                onSelectLesson={handleSelectLesson}
                onAddModule={() => {}}
                onAddLesson={() => {}}
                onRemoveModule={handleRemoveModule}
                onRemoveLesson={handleRemoveLesson}
              />
            </div>
          )}
        </div>

        {/* Horizontal drag handle */}
        <div
          onMouseDown={onHResizeStart}
          className="hidden md:flex items-center justify-center shrink-0 group cursor-col-resize"
          style={{ width: 8, background: '#07090F' }}>
          <div className="w-0.5 h-8 rounded-full transition-all group-hover:h-16"
            style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Editor panel */}
        <div
          className="flex flex-col overflow-hidden"
          style={editorWidthPx
            ? { width: editorWidthPx, minWidth: 280, flexShrink: 0 }
            : { flex: '1 1 auto' }}>

          <div className="flex-1 overflow-hidden" style={{ minHeight: 120 }}>
            <SqlEditor
              value={code}
              onChange={v => setCode(v ?? '')}
              onRun={runCode}
              language={activeLang.monacoLang}
            />
          </div>

          <div
            onMouseDown={onVResizeStart}
            className="hidden md:flex items-center justify-center shrink-0 group cursor-row-resize"
            style={{ height: 8, background: '#07090F' }}>
            <div className="h-0.5 w-8 rounded-full transition-all group-hover:w-16"
              style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <div
            className="shrink-0 overflow-hidden"
            style={{ height: resultsPanelHeight, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <CodeOutput result={output} running={running} />
          </div>
        </div>

        {/* Lesson panel */}
        <div
          className="flex-1 md:min-w-[260px] overflow-y-auto"
          style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
          {activeLesson ? (
            <LessonView
              id={activeLesson.id}
              title={activeLesson.title}
              content={activeLesson.content}
              defaultQuery={activeLesson.defaultQuery}
              quiz={activeLesson.quiz}
              moduleId={activeLessonModuleId ?? undefined}
              onRunSample={(snippet) => { setCode(snippet); setOutput(null); }}
              onClose={() => setActiveLesson(null)}
              onEdit={(newContent) => {
                setActiveLesson((prev: LessonContentType | null) =>
                  prev ? { ...prev, content: newContent } : null
                );
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: `${activeLang.color}10`,
                  border: `1px solid ${activeLang.color}25`,
                }}>
                <BookOpen className="w-7 h-7" style={{ color: activeLang.color }} />
              </div>
              <div>
                <p className="font-semibold mb-1" style={{ color: '#EDF1FA' }}>
                  {activeLang.label} Playground
                </p>
                <p className="text-sm" style={{ color: '#5C6B8A' }}>
                  {activeLang.clientSide
                    ? 'Runs entirely in your browser — no server needed.'
                    : 'Runs on the server via a sandboxed executor (Piston).'}
                </p>
                <p className="text-sm mt-2" style={{ color: '#5C6B8A' }}>
                  Select a lesson from the curriculum or write your own code.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
