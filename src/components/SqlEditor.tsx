'use client';

import React from 'react';
import Editor, { OnMount } from '@monaco-editor/react';

interface SqlEditorProps {
    value: string;
    onChange: (value: string | undefined) => void;
    onRun: () => void;
    language?: 'sql' | 'javascript';
}

const SqlEditor: React.FC<SqlEditorProps> = ({ value, onChange, onRun, language = 'sql' }) => {
    const handleEditorDidMount: OnMount = (editor, monaco) => {
        // Add command to run query with Cmd+Enter or Ctrl+Enter
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            onRun();
        });
    };

    return (
        <Editor
            height="100%"
            defaultLanguage={language}
            language={language} // Dynamic update
            theme="vs-dark"
            value={value}
            onChange={onChange}
            onMount={handleEditorDidMount}
            options={{
                minimap: { enabled: false },
                fontSize: 14,
                padding: { top: 10, bottom: 10 },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                fontFamily: "'Fira Code', 'Droid Sans Mono', 'monospace', monospace",
                contextmenu: false,
            }}
        />
    );
};

export default SqlEditor;
