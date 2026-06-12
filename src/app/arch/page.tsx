'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar, { Module, Lesson } from '@/components/Sidebar';
import { CpuSimulator } from '@/components/arch/CpuSimulator';
import {
  Database, GraduationCap, BarChart3, BookOpen,
  PanelLeftClose, PanelLeftOpen, Cpu, Network, Code,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  ARCH_CURRICULUM,
  getArchLessonById,
  archModulesForSidebar,
  type ArchLesson,
} from '@/lib/arch-curriculum';
import { useProgressStore } from '@/lib/progress-store';

const INITIAL_MODULES: Module[] = archModulesForSidebar();

const WELCOME_CODE = `; Welcome to the CPU Simulator!
; Click Step or Run All to execute.
; Try the lessons on the right to learn assembly.

LDI R0, 10   ; load 10 into R0
LDI R1, 32   ; load 32 into R1
ADD R0, R1   ; R0 = R0 + R1  (42)
OUT R0       ; print R0
HLT          ; done`;

export default function ArchPage() {
  const [activeLesson, setActiveLesson] = useState<ArchLesson | null>(null);
  const [activeLessonModuleId, setActiveLessonModuleId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [editorWidthPx, setEditorWidthPx] = useState<number | null>(null);
  const [modules, setModules] = useState<Module[]>(INITIAL_MODULES);

  const { progress } = useProgressStore();

  const hResizeDragging = React.useRef(false);
  const hResizeStartX   = React.useRef(0);
  const hResizeStartW   = React.useRef(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setEditorWidthPx(Math.round(window.innerWidth * 0.6));
    }
  }, []);

  useEffect(() => {
    setModules(prev => prev.map(m => ({
      ...m,
      lessons: m.lessons.map(l => ({
        ...l,
        completed: Boolean(progress.lessonProgress[l.id]?.completed),
      })),
    })));
  }, [progress.lessonsCompleted]); // eslint-disable-line react-hooks/exhaustive-deps

  const onHResizeStart = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    hResizeDragging.current = true;
    hResizeStartX.current = e.clientX;
    hResizeStartW.current = editorWidthPx ?? Math.round(window.innerWidth * 0.6);
    const onMove = (ev: MouseEvent) => {
      if (!hResizeDragging.current) return;
      const delta = hResizeStartX.current - ev.clientX;
      const clamped = Math.max(320, Math.min(Math.round(window.innerWidth * 0.85), hResizeStartW.current + delta));
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

  const handleSelectLesson = (lesson: Lesson, moduleId: string) => {
    const full = getArchLessonById(moduleId, lesson.id);
    if (!full) return;
    setActiveLesson(full);
    setActiveLessonModuleId(moduleId);
  };

  return (
    <div className="flex flex-col w-full min-h-screen md:h-screen md:overflow-hidden"
      style={{ background: '#07090F', color: '#EDF1FA' }}>

      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 shrink-0 z-10"
        style={{ background: '#0C1018', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

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
            <Link href="/code"
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer"
              style={{ color: '#5C6B8A' }}>
              <Code className="w-3 h-3" /> Code
            </Link>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold"
              style={{ background: '#1C2940', color: '#00C7BE', border: '1px solid rgba(0,199,190,0.2)' }}>
              <Cpu className="w-3 h-3" /> Architecture
            </span>
            <Link href="/net"
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer"
              style={{ color: '#5C6B8A' }}>
              <Network className="w-3 h-3" /> Net
            </Link>
          </div>

          <div className="h-6 w-px hidden sm:block" style={{ background: 'rgba(255,255,255,0.08)' }} />

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold"
            style={{ background: 'rgba(0,199,190,0.08)', border: '1px solid rgba(0,199,190,0.2)', color: '#00C7BE' }}>
            <Cpu className="w-3.5 h-3.5" />
            <span>8-bit CPU Simulator</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer"
            style={{ background: '#111724', border: '1px solid rgba(255,255,255,0.08)', color: '#5C6B8A' }}>
            <BarChart3 className="w-3.5 h-3.5" /> Dashboard
          </Link>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-col md:flex-row flex-1 md:overflow-hidden">

        {/* Navigation sidebar */}
        <div className={`flex flex-row transition-all duration-200 overflow-hidden ${
          sidebarCollapsed ? 'shrink-0 md:w-12' : 'flex-1 md:min-w-[220px] md:max-w-[280px]'
        }`}
          style={{ borderRight: '1px solid rgba(255,255,255,0.06)', background: '#0C1018' }}>

          <div className="flex flex-col items-center py-3 gap-1 shrink-0"
            style={{ width: 48, borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => setSidebarCollapsed(c => !c)}
              className="p-2 rounded-md transition-colors cursor-pointer mb-1"
              style={{ color: '#5C6B8A' }}>
              {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
            <button
              className="p-2 rounded-md"
              style={{ background: 'rgba(0,199,190,0.12)', color: '#00C7BE' }}
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

        {/* CPU Simulator panel */}
        <div
          className="flex flex-col overflow-hidden"
          style={editorWidthPx
            ? { width: editorWidthPx, minWidth: 320, flexShrink: 0 }
            : { flex: '1 1 auto' }}>
          <CpuSimulator
            initialCode={activeLesson?.defaultCode ?? WELCOME_CODE}
            key={activeLesson?.id ?? 'welcome'}
          />
        </div>

        {/* Lesson / detail panel */}
        <div
          className="flex-1 md:min-w-[260px] overflow-y-auto"
          style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
          {activeLesson ? (
            <div className="p-5">
              {/* Lesson header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold" style={{ color: '#EDF1FA' }}>
                  {activeLesson.title}
                </h2>
                <button
                  onClick={() => setActiveLesson(null)}
                  className="text-xs px-2 py-1 rounded transition-colors cursor-pointer"
                  style={{ color: '#5C6B8A' }}>
                  ✕
                </button>
              </div>

              {/* Markdown content */}
              <div className="prose prose-sm max-w-none"
                style={{ '--tw-prose-body': '#8899BB', '--tw-prose-headings': '#EDF1FA' } as React.CSSProperties}>
                <div className="text-sm leading-relaxed space-y-3" style={{ color: '#8899BB' }}>
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 className="text-base font-bold mb-3" style={{ color: '#EDF1FA' }}>{children}</h1>,
                      h2: ({ children }) => <h2 className="text-sm font-bold mt-4 mb-2" style={{ color: '#EDF1FA' }}>{children}</h2>,
                      h3: ({ children }) => <h3 className="text-xs font-bold mt-3 mb-1.5 uppercase tracking-wider" style={{ color: '#5C6B8A' }}>{children}</h3>,
                      p: ({ children }) => <p className="mb-2 text-sm" style={{ color: '#8899BB' }}>{children}</p>,
                      code: ({ children, className }) => {
                        const isBlock = className?.includes('language-');
                        if (isBlock) return (
                          <pre className="rounded-lg p-3 my-2 text-xs overflow-x-auto"
                            style={{ background: '#111724', color: '#EDF1FA', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <code>{children}</code>
                          </pre>
                        );
                        return <code className="px-1 py-0.5 rounded text-xs" style={{ background: '#111724', color: '#00C7BE' }}>{children}</code>;
                      },
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-3">
                          <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>{children}</table>
                        </div>
                      ),
                      th: ({ children }) => <th className="px-2 py-1.5 text-left font-semibold" style={{ color: '#EDF1FA', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{children}</th>,
                      td: ({ children }) => <td className="px-2 py-1.5" style={{ color: '#8899BB', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{children}</td>,
                      strong: ({ children }) => <strong style={{ color: '#EDF1FA' }}>{children}</strong>,
                      li: ({ children }) => <li className="text-sm mb-0.5" style={{ color: '#8899BB' }}>{children}</li>,
                    }}>
                    {activeLesson.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(0,199,190,0.08)', border: '1px solid rgba(0,199,190,0.15)' }}>
                <Cpu className="w-7 h-7" style={{ color: '#00C7BE' }} />
              </div>
              <div>
                <p className="font-semibold mb-1" style={{ color: '#EDF1FA' }}>Computer Architecture</p>
                <p className="text-sm" style={{ color: '#5C6B8A' }}>
                  Select a lesson from the curriculum to learn assembly programming.
                </p>
                <p className="text-sm mt-2" style={{ color: '#5C6B8A' }}>
                  Use the simulator on the left to step through programs instruction by instruction.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
