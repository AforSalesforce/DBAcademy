'use client';

import React from 'react';
import { NO_MATCH_MESSAGE } from '@/db-engines/nosql';

interface ResultsTableProps {
    results: any[];
    error?: string | null;
    /** Column names from the last run; empty when the statement returns none. */
    columns?: string[];
    /** Engine note for an empty result (NoSQL reports "No results matched query"). */
    message?: string | null;
    /** Whether anything has run yet, to tell "nothing yet" from "0 rows". */
    hasRun?: boolean;
    /** Plain-language explanation of `error`, when there is one. */
    errorHint?: string | null;
    /** The query that produced these results, to word an empty result correctly. */
    query?: string | null;
}

/** A read (SELECT, WITH, find…) that returned nothing matched 0 rows; it never "changed the database". */
function looksLikeRead(query: string | null | undefined): boolean {
    if (!query) return false;
    const code = query.replace(/--[^\n]*|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '').trim();
    const last = code.split(';').map(s => s.trim()).filter(Boolean).pop() ?? '';
    return /^(SELECT|WITH|VALUES|EXPLAIN|PRAGMA|SHOW|TABLE)\b/i.test(last) || /\.(find|findOne|count|aggregate)\s*\(/.test(last);
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
    return (
        <div className="p-4" role="status">
            <p className="text-sm font-medium" style={{ color: '#EDF1FA' }}>{title}</p>
            <p className="text-xs mt-1" style={{ color: '#8A97B3' }}>{detail}</p>
        </div>
    );
}

const ResultsTable: React.FC<ResultsTableProps> = ({ results, error, columns: runColumns = [], message, hasRun = true, errorHint, query }) => {
    if (error) {
        return (
            <div role="alert">
                <div className="query-error">Error: {error}</div>
                {errorHint && (
                    <p className="px-4 -mt-2 pb-4 text-sm" style={{ color: '#EDF1FA' }}>
                        <span className="font-semibold" style={{ color: '#F59E0B' }}>Tip: </span>{errorHint}
                    </p>
                )}
            </div>
        );
    }

    if (!results || results.length === 0) {
        if (!hasRun) {
            return <EmptyState title="Nothing run yet" detail="Write a query and press Run (⌘↵ / Ctrl+↵). Results appear here." />;
        }
        if (runColumns.length > 0 || message === NO_MATCH_MESSAGE || looksLikeRead(query)) {
            return <EmptyState title="Query ran: 0 rows matched" detail="Nothing fits those conditions. Check your filters or spelling; text comparisons are exact." />;
        }
        return <EmptyState title="Done" detail="That statement ran. Statements like CREATE, INSERT, UPDATE and DELETE don't return rows; run a SELECT to see your data." />;
    }

    const columns = Object.keys(results[0]);

    return (
        <div className="table-container">
            <table>
                <thead>
                    <tr>
                        {columns.map((col) => (
                            <th key={col}>{col}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {results.map((row, i) => (
                        <tr key={i}>
                            {columns.map((col) => (
                                <td key={`${i}-${col}`}>{formatCell(row[col])}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

/** NoSQL documents hold arrays and objects; show them as JSON, not "[object Object]". */
function formatCell(value: unknown): string {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

export default ResultsTable;
