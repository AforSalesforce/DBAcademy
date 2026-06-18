import { describe, it, expect } from 'vitest';
import { mergeById } from '@/lib/sync/supabase-sync';

interface Item { id: string; updatedAt: string; label: string }

describe('mergeById', () => {
  it('keeps local-only and remote-only entries', () => {
    const local: Item[] = [{ id: 'a', updatedAt: '2024-01-01T00:00:00Z', label: 'local-a' }];
    const remote: Item[] = [{ id: 'b', updatedAt: '2024-01-01T00:00:00Z', label: 'remote-b' }];

    const merged = mergeById(local, remote);

    expect(merged).toHaveLength(2);
    expect(merged.find(i => i.id === 'a')?.label).toBe('local-a');
    expect(merged.find(i => i.id === 'b')?.label).toBe('remote-b');
  });

  it('prefers the newer updatedAt when both sides have the same id', () => {
    const local: Item[] = [{ id: 'a', updatedAt: '2024-01-01T00:00:00Z', label: 'stale-local' }];
    const remote: Item[] = [{ id: 'a', updatedAt: '2024-06-01T00:00:00Z', label: 'fresh-remote' }];

    expect(mergeById(local, remote)[0].label).toBe('fresh-remote');
    expect(mergeById(remote, local)[0].label).toBe('fresh-remote');
  });

  it('keeps the local entry on a tie', () => {
    const local: Item[] = [{ id: 'a', updatedAt: '2024-01-01T00:00:00Z', label: 'local' }];
    const remote: Item[] = [{ id: 'a', updatedAt: '2024-01-01T00:00:00Z', label: 'remote' }];

    expect(mergeById(local, remote)[0].label).toBe('local');
  });
});
