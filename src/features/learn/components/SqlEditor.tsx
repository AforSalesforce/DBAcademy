'use client';

import React, { useEffect, useRef } from 'react';
import Editor, { BeforeMount, OnMount } from '@monaco-editor/react';

interface SqlEditorProps {
    value: string;
    onChange: (value: string | undefined) => void;
    onRun: () => void;
    language?: string;
}

/**
 * vs-dark, on the app's own surface colour, with comments bright enough for
 * WCAG AA (vs-dark's #608B4E on #1E1E1E is only 4.2:1).
 */
const defineTheme: BeforeMount = monaco => {
    monaco.editor.defineTheme('dbacademy-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [{ token: 'comment', foreground: '6A9955' }],
        colors: {
            'editor.background': '#0C1018',
            'editor.lineHighlightBackground': '#111724',
            'editorGutter.background': '#0C1018',
            'editorLineNumber.foreground': '#7A87A5',
            'editorLineNumber.activeForeground': '#EDF1FA',
        },
    });
};

const SqlEditor: React.FC<SqlEditorProps> = ({ value, onChange, onRun, language = 'sql' }) => {
    // Monaco keeps the command registered at mount, so read the latest
    // onRun through a ref — otherwise Cmd+Enter runs a stale query.
    const onRunRef = useRef(onRun);
    useEffect(() => {
        onRunRef.current = onRun;
    }, [onRun]);

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        // Add command to run query with Cmd+Enter or Ctrl+Enter
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            onRunRef.current();
        });
    };

    return (
        <Editor
            height="100%"
            defaultLanguage={language}
            language={language} // Dynamic update
            theme="dbacademy-dark"
            beforeMount={defineTheme}
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
