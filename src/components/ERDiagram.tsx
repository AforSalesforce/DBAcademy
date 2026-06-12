'use client';

import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { TableDefinition } from '@/lib/db/types';

interface ERDiagramProps {
    tables: TableDefinition[];
}

// Strip special chars so Mermaid v11 accepts the identifier
const sanitizeName = (s: string) =>
    s.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1') || '_col';

// Map raw SQL types to the small set Mermaid erDiagram accepts
const mapColType = (rawType: string): string => {
    const t = rawType.toLowerCase().replace(/\s*\(.*?\)/g, '').trim();
    if (/\bint\b|integer|bigint|smallint|serial|bigserial|tinyint/.test(t)) return 'int';
    if (/float|double|decimal|numeric|real|money|number/.test(t)) return 'float';
    if (/bool/.test(t)) return 'boolean';
    if (/date|time|timestamp/.test(t)) return 'datetime';
    if (/json/.test(t)) return 'json';
    return 'string'; // varchar, char, text, uuid, blob, etc.
};

const ERDiagram: React.FC<ERDiagramProps> = ({ tables }) => {
    const mermaidRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            securityLevel: 'loose',
            er: { useMaxWidth: true, layoutDirection: 'LR' },
        });
    }, []);

    useEffect(() => {
        if (!tables || tables.length === 0) return;

        const renderDiagram = async () => {
            if (!mermaidRef.current) return;

            let graphDefinition = 'erDiagram\n';

            tables.forEach(table => {
                const tName = sanitizeName(table.name);
                graphDefinition += `  ${tName} {\n`;
                table.columns.forEach(col => {
                    const cType = mapColType(col.type);
                    const cName = sanitizeName(col.name);
                    graphDefinition += `    ${cType} ${cName}\n`;
                });
                graphDefinition += `  }\n`;

                if (table.foreignKeys) {
                    table.foreignKeys.forEach(fk => {
                        const refName = sanitizeName(fk.referencedTable);
                        graphDefinition += `  ${tName} }|--|| ${refName} : "ref"\n`;
                    });
                }
            });

            mermaidRef.current.innerHTML = '';

            try {
                const uniqueId = `er-diagram-${Date.now()}`;
                const { svg } = await mermaid.render(uniqueId, graphDefinition);
                if (mermaidRef.current) mermaidRef.current.innerHTML = svg;
            } catch (e) {
                console.error('Mermaid render error', e);
                if (mermaidRef.current) {
                    mermaidRef.current.innerHTML = `<div style="padding:1rem;color:#EF4444;font-size:0.75rem;font-family:monospace">Failed to render diagram</div>`;
                }
            }
        };

        renderDiagram();
    }, [tables]);

    return (
        <div style={{
            width: '100%',
            height: '100%',
            overflow: 'auto',
            background: '#07090F',
            display: 'flex',
            justifyContent: 'center',
            padding: '2rem',
        }}>
            <div ref={mermaidRef} style={{ width: '100%' }} />
        </div>
    );
};

export default ERDiagram;
