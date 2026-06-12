'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar, { Module, Lesson } from '@/components/Sidebar';
import { SubnetCalculator } from '@/components/net/SubnetCalculator';
import { OSIStack }         from '@/components/net/OSIStack';
import {
  Database, GraduationCap, BarChart3, BookOpen,
  PanelLeftClose, PanelLeftOpen, Cpu, Network, Code,
  Calculator, Layers,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  NET_CURRICULUM,
  getNetLessonById,
  netModulesForSidebar,
  type NetLesson,
} from '@/lib/net-curriculum';
import { useProgressStore } from '@/lib/progress-store';

type ToolId = 'osi' | 'subnet';

const TOOLS: { id: ToolId; label: string; icon: React.ReactNode }[] = [
  { id: 'osi',    label: 'OSI Model',         icon: <Layers className="w-3.5 h-3.5" /> },
  { id: 'subnet', label: 'Subnet Calculator', icon: <Calculator className="w-3.5 h-3.5" /> },
];

const INITIAL_MODULES: Module[] = netModulesForSidebar().map(m => ({
  ...m,
  engine: 'nosql' as const,
}));

export default function NetPage() {
  const [activeTool, setActiveTool] = useState<ToolId>('osi');
  const [activeLesson, setActiveLesson] = useState<NetLesson | null>(null);
  const [activeLessonModuleId, setActiveLessonModuleId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [modules, setModules] = useState<Module[]>(INITIAL_MODULES);

  const { progress } = useProgressStore();

  useEffect(() => {
    setModules(prev => prev.map(m => ({
      ...m,
      lessons: m.lessons.map(l => ({
        ...l,
        completed: Boolean(progress.lessonProgress[l.id]?.completed),
      })),
    })));
  }, [progress.lessonsCompleted]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectLesson = (lesson: Lesson, moduleId: string) => {
    const full = getNetLessonById(moduleId, lesson.id);
    if (!full) return;
    setActiveLesson(full);
    setActiveLessonModuleId(moduleId);
    if (full.tool) setActiveTool(full.tool === 'dns' ? 'osi' : full.tool);
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
            <Link href="/arch"
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer"
              style={{ color: '#5C6B8A' }}>
              <Cpu className="w-3 h-3" /> Arch
            </Link>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold"
              style={{ background: '#1C2940', color: '#22D3EE', border: '1px solid rgba(34,211,238,0.2)' }}>
              <Network className="w-3 h-3" /> Networking
            </span>
          </div>

          <div className="h-6 w-px hidden sm:block" style={{ background: 'rgba(255,255,255,0.08)' }} />

          {/* Tool tabs */}
          <div className="hidden sm:flex items-center gap-0.5 p-0.5 rounded-lg"
            style={{ background: '#111724', border: '1px solid rgba(255,255,255,0.06)' }}>
            {TOOLS.map(tool => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer"
                style={activeTool === tool.id
                  ? { background: 'rgba(34,211,238,0.12)', color: '#22D3EE', border: '1px solid rgba(34,211,238,0.2)' }
                  : { color: '#5C6B8A' }
                }>
                {tool.icon}
                {tool.label}
              </button>
            ))}
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
              style={{ background: 'rgba(34,211,238,0.12)', color: '#22D3EE' }}
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

        {/* Main tool area */}
        <div className="flex-1 md:min-w-0 overflow-hidden flex flex-col">
          {/* Mobile tool tabs */}
          <div className="flex sm:hidden items-center gap-1 p-2 shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0C1018' }}>
            {TOOLS.map(tool => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer"
                style={activeTool === tool.id
                  ? { background: 'rgba(34,211,238,0.12)', color: '#22D3EE' }
                  : { color: '#5C6B8A' }
                }>
                {tool.icon}{tool.label}
              </button>
            ))}
          </div>

          {/* Tool display */}
          <div className="flex-1 overflow-hidden">
            {activeTool === 'osi'    && <OSIStack />}
            {activeTool === 'subnet' && <SubnetCalculator />}
          </div>
        </div>

        {/* Lesson panel */}
        <div
          className="md:w-80 lg:w-96 shrink-0 overflow-y-auto"
          style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
          {activeLesson ? (
            <div className="p-5">
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
                      return <code className="px-1 py-0.5 rounded text-xs" style={{ background: '#111724', color: '#22D3EE' }}>{children}</code>;
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
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.15)' }}>
                <Network className="w-7 h-7" style={{ color: '#22D3EE' }} />
              </div>
              <div>
                <p className="font-semibold mb-1" style={{ color: '#EDF1FA' }}>Computer Networking</p>
                <p className="text-sm" style={{ color: '#5C6B8A' }}>
                  Select a lesson from the curriculum to explore networking concepts.
                </p>
                <p className="text-sm mt-2" style={{ color: '#5C6B8A' }}>
                  Use the OSI model explorer and subnet calculator on the left.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
