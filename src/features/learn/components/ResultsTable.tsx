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
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
    return (
        <div className="p-4" role="status">
            <p className="text-sm font-medium" style={{ color: '#EDF1FA' }}>{title}</p>
            <p className="text-xs mt-1" style={{ color: '#8A97B3' }}>{detail}</p>
        </div>
    );
}

const ResultsTable: React.FC<ResultsTableProps> = ({ results, error, columns: runColumns = [], message, hasRun = true }) => {
    if (error) {
        return <div className="query-error" role="alert">Error: {error}</div>;
    }

    if (!results || results.length === 0) {
        if (!hasRun) {
            return <EmptyState title="Nothing run yet" detail="Write a query and press Run (⌘↵ / Ctrl+↵). Results appear here." />;
        }
        if (runColumns.length > 0 || message === NO_MATCH_MESSAGE) {
            return <EmptyState title="Query ran: 0 rows matched" detail="Nothing fits those conditions. Check your filters or spelling; text comparisons are exact." />;
        }
        return <EmptyState title="Statement ran successfully" detail="It changed the database but doesn't return rows. Run a SELECT to see the data." />;
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
