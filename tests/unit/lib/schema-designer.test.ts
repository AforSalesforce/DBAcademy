import { describe, it, expect } from 'vitest';
import { generateDDL, introspectToDesign, type SchemaDesign } from '@/stores/schema-designer';

function design(overrides: Partial<SchemaDesign> = {}): SchemaDesign {
  return {
    id: 'd1',
    name: 'Test',
    projectId: null,
    engine: 'postgres',
    tables: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('generateDDL', () => {
  it('emits referenced tables before tables that reference them', () => {
    const d = design({
      tables: [
        {
          name: 'orders',
          position: { x: 0, y: 0 },
          columns: [{ name: 'user_id', type: 'int' }],
          foreignKeys: [{ column: 'user_id', refTable: 'users', refColumn: 'id' }],
        },
        {
          name: 'users',
          position: { x: 0, y: 0 },
          columns: [{ name: 'id', type: 'int', pk: true }],
          foreignKeys: [],
        },
      ],
    });

    const ddl = generateDDL(d);
    expect(ddl.indexOf('CREATE TABLE users')).toBeLessThan(ddl.indexOf('CREATE TABLE orders'));
  });

  it('maps dialect-neutral types per engine', () => {
    const d = design({
      engine: 'sqlite',
      tables: [{
        name: 't',
        position: { x: 0, y: 0 },
        columns: [{ name: 'amount', type: 'decimal(10,2)' }],
        foreignKeys: [],
      }],
    });
    expect(generateDDL(d)).toContain('amount REAL');
  });

  it('renders PK, NOT NULL, UNIQUE, and DEFAULT constraints', () => {
    const d = design({
      tables: [{
        name: 't',
        position: { x: 0, y: 0 },
        columns: [
          { name: 'id', type: 'int', pk: true },
          { name: 'email', type: 'text', unique: true, nullable: false },
          { name: 'status', type: 'text', nullable: true, default: "'active'" },
        ],
        foreignKeys: [],
      }],
    });
    const ddl = generateDDL(d);
    expect(ddl).toContain('id SERIAL PRIMARY KEY');
    expect(ddl).toContain('email TEXT NOT NULL UNIQUE');
    expect(ddl).toContain("status TEXT DEFAULT 'active'");
  });

  it('does not infinite-loop on a self-referencing or circular FK', () => {
    const d = design({
      tables: [
        {
          name: 'a',
          position: { x: 0, y: 0 },
          columns: [{ name: 'b_id', type: 'int' }],
          foreignKeys: [{ column: 'b_id', refTable: 'b', refColumn: 'id' }],
        },
        {
          name: 'b',
          position: { x: 0, y: 0 },
          columns: [{ name: 'a_id', type: 'int' }],
          foreignKeys: [{ column: 'a_id', refTable: 'a', refColumn: 'id' }],
        },
      ],
    });
    expect(() => generateDDL(d)).not.toThrow();
  });
});

describe('introspectToDesign', () => {
  it('lays out tables in a grid and carries over foreign keys', () => {
    const result = introspectToDesign(
      [
        { name: 'users', columns: [{ name: 'id', type: 'int' }] },
        { name: 'orders', columns: [{ name: 'user_id', type: 'int' }], foreignKeys: [{ column: 'user_id', referencedTable: 'users', referencedColumn: 'id' }] },
      ],
      'postgres'
    );

    expect(result.tables.map(t => t.name)).toEqual(['users', 'orders']);
    expect(result.tables[1].foreignKeys).toEqual([{ column: 'user_id', refTable: 'users', refColumn: 'id' }]);
  });
});
