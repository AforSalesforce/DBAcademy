'use client';

import React from 'react';

interface ResultsTableProps {
    results: any[];
    error?: string | null;
}

const ResultsTable: React.FC<ResultsTableProps> = ({ results, error }) => {
    if (error) {
        return <div className="query-error">Error: {error}</div>;
    }

    if (!results || results.length === 0) {
        return <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>No results to display</div>;
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
                                <td key={`${i}-${col}`}>{row[col]?.toString() ?? 'NULL'}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ResultsTable;
