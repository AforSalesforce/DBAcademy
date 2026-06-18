'use client';

import { create } from 'zustand';
import { localGetAll, localPut, localDelete } from '@/lib/persistence/local-db';
import { mergeById, pullRemote, pushUpsert, pushDelete } from './sync/supabase-sync';
import { EngineType } from '@/db-engines/types';

export interface Project {
  id: string;
  name: string;
  description?: string;
  engine: EngineType;
  /** True for the auto-created playground projects that mirror the old engine dropdown. */
  isDefault: boolean;
  snapshotPath?: string;
  snapshotAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Stable IDs for the DB-engine default playground projects.
// Not every engine type has a default playground (code/arch/net don't).
export const DEFAULT_PROJECT_IDS: Partial<Record<EngineType, string>> = {
  sqlite: 'default-sqlite',
  postgres: 'default-postgres',
  nosql: 'default-nosql',
};

const DEFAULT_PROJECTS: Project[] = [
  {
    id: DEFAULT_PROJECT_IDS.sqlite!,
    name: 'SQLite Playground',
    engine: 'sqlite',
    isDefault: true,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: DEFAULT_PROJECT_IDS.postgres!,
    name: 'PostgreSQL Playground',
    engine: 'postgres',
    isDefault: true,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: DEFAULT_PROJECT_IDS.nosql!,
    name: 'NoSQL Playground',
    engine: 'nosql',
    isDefault: true,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
];

interface ProjectStore {
  projects: Project[];
  activeProjectId: string;
  hydrated: boolean;

  hydrate(): Promise<void>;
  createProject(
    name: string,
    engine: EngineType,
    description?: string
  ): Promise<Project>;
  updateProject(id: string, updates: Partial<Pick<Project, 'name' | 'description'>>): Promise<void>;
  deleteProject(id: string): Promise<void>;
  setActiveProject(id: string): void;
  getActiveProject(): Project | undefined;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: DEFAULT_PROJECTS,
  activeProjectId: DEFAULT_PROJECT_IDS.sqlite!,
  hydrated: false,

  async hydrate() {
    if (get().hydrated) return;
    try {
      const saved = await localGetAll<Project>('projects');
      // Merge: defaults are always present, then append user projects.
      const userProjects = saved.filter(p => !DEFAULT_PROJECT_IDS[p.engine as keyof typeof DEFAULT_PROJECT_IDS] || !p.isDefault);
      set({ projects: [...DEFAULT_PROJECTS, ...userProjects], hydrated: true });

      // Background Supabase sync.
      const remote = await pullRemote('projects', (r: any): Project => ({
        id: r.id,
        name: r.name,
        description: r.description,
        engine: r.engine,
        isDefault: false,
        snapshotPath: r.snapshot_path,
        snapshotAt: r.snapshot_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
      if (remote && remote.length > 0) {
        const merged = mergeById([...DEFAULT_PROJECTS, ...userProjects], remote);
        set({ projects: merged });
        // Persist merged set locally
        for (const p of merged.filter(p => !p.isDefault)) {
          await localPut('projects', p);
        }
      }
    } catch (e) {
      console.error('project-store hydrate error', e);
      set({ hydrated: true });
    }
  },

  async createProject(name: string, engine: EngineType, description?: string) {
    const now = new Date().toISOString();
    const project: Project = {
      id: crypto.randomUUID(),
      name,
      description,
      engine,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    };
    await localPut('projects', project);
    set(s => ({ projects: [...s.projects, project] }));

    await pushUpsert('projects', {
      id: project.id,
      name,
      description,
      engine,
      created_at: now,
      updated_at: now,
    });

    return project;
  },

  async updateProject(id, updates) {
    const now = new Date().toISOString();
    set(s => ({
      projects: s.projects.map(p =>
        p.id === id ? { ...p, ...updates, updatedAt: now } : p
      ),
    }));
    const updated = get().projects.find(p => p.id === id);
    if (updated && !updated.isDefault) {
      await localPut('projects', updated);
    }
  },

  async deleteProject(id) {
    const project = get().projects.find(p => p.id === id);
    if (!project || project.isDefault) return;

    set(s => ({ projects: s.projects.filter(p => p.id !== id) }));
    await localDelete('projects', id);

    // Switch active project to the engine's playground, or the SQLite fallback.
    if (get().activeProjectId === id) {
      const fallback = DEFAULT_PROJECT_IDS[project.engine] ?? DEFAULT_PROJECT_IDS.sqlite!;
      get().setActiveProject(fallback);
    }

    await pushDelete('projects', id);
  },

  setActiveProject(id) {
    set({ activeProjectId: id });
  },

  getActiveProject() {
    return get().projects.find(p => p.id === get().activeProjectId);
  },
}));
