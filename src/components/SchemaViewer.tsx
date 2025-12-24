'use client';

import React from 'react';
import { TableDefinition } from '@/lib/db/types';

interface SchemaViewerProps {
    tables: TableDefinition[];
    onViewTable?: (tableName: string) => void;
}

const SchemaViewer: React.FC<SchemaViewerProps> = ({ tables, onViewTable }) => {
    if (!tables || tables.length === 0) {
        return <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>No schema available</div>;
    }

    return (
        <div style={{ padding: '1rem' }}>
            {tables.map(table => (
                <div key={table.name} style={{ marginBottom: '1.5rem' }}>
                    <div style={{
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: 'var(--accent)' }}>▤</span> {table.name}
                        </div>
                        {onViewTable && (
                            <button
                                onClick={() => onViewTable(table.name)}
                                title="View Data (First 100 rows)"
                                style={{
                                    background: 'transparent',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = 'var(--accent)';
                                    e.currentTarget.style.borderColor = 'var(--accent)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                    e.currentTarget.style.borderColor = 'var(--border)';
                                }}
                            >
                                <span>👁️</span> View
                            </button>
                        )}
                    </div>
                    <div style={{ paddingLeft: '1.25rem' }}>
                        {table.columns.map(col => (
                            <div key={col.name} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.8rem',
                                marginBottom: '0.25rem',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                paddingBottom: '2px'
                            }}>
                                <span style={{ color: 'var(--text-secondary)' }}>{col.name}</span>
                                <span style={{ color: 'var(--text-secondary)', opacity: 0.6, fontSize: '0.75rem', fontFamily: 'monospace' }}>{col.type}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SchemaViewer;
