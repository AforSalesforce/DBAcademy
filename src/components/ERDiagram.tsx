'use client';

import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { TableDefinition } from '@/lib/db/types';

interface ERDiagramProps {
    tables: TableDefinition[];
}

const ERDiagram: React.FC<ERDiagramProps> = ({ tables }) => {
    const mermaidRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: true,
            theme: 'dark',
            securityLevel: 'loose',
            er: {
                useMaxWidth: true,
                layoutDirection: 'LR'
            }
        });
    }, []);

    useEffect(() => {
        if (!tables || tables.length === 0) return;

        const renderDiagram = async () => {
            if (!mermaidRef.current) return;

            // Generate Mermaid ER Diagram Syntax
            let graphDefinition = 'erDiagram\n';

            tables.forEach(table => {
                // Table definition
                graphDefinition += `  ${table.name} {\n`;
                table.columns.forEach(col => {
                    // Type mapping for simplification
                    let type = col.type.toLowerCase();
                    if (type.includes('int')) type = 'int';
                    else if (type.includes('char') || type.includes('text')) type = 'string';

                    graphDefinition += `    ${type} ${col.name}\n`;
                });
                graphDefinition += `  }\n`;

                // Relationships
                if (table.foreignKeys) {
                    table.foreignKeys.forEach(fk => {
                        // Creating relationship line: table }|..|| referencedTable : "fk"
                        // Simplification: just showing connection
                        graphDefinition += `  ${table.name} }|--|| ${fk.referencedTable} : "references"\n`;
                    });
                }
            });

            // Clear previous
            mermaidRef.current.innerHTML = '';

            try {
                const { svg } = await mermaid.render('er-diagram-svg', graphDefinition);
                if (mermaidRef.current) {
                    mermaidRef.current.innerHTML = svg;
                }
            } catch (e) {
                console.error("Mermaid render error", e);
                if (mermaidRef.current) mermaidRef.current.innerHTML = "Failed to render diagram";
            }
        };

        renderDiagram();
    }, [tables]);

    return (
        <div style={{
            width: '100%',
            height: '100%',
            overflow: 'auto',
            background: 'var(--bg-primary)',
            display: 'flex',
            justifyContent: 'center',
            padding: '2rem'
        }}>
            <div ref={mermaidRef} style={{ width: '100%' }} />
        </div>
    );
};

export default ERDiagram;
