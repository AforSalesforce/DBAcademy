'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Play, StepForward, RotateCcw, Terminal, AlertCircle } from 'lucide-react';
import { CPUState, Instruction, initialCPUState, cpuStep, cpuRun, MAX_STEPS } from '@/lib/arch/cpu';
import { assemble, disassemble } from '@/lib/arch/assembler';
import SqlEditor from '@/components/SqlEditor';

interface Props {
  initialCode?: string;
  onCodeChange?: (code: string) => void;
}

const REG_NAMES = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7'];

export function CpuSimulator({ initialCode = '; Write assembly here\nHLT', onCodeChange }: Props) {
  const [code, setCode] = useState(initialCode);
  const [cpuState, setCpuState] = useState<CPUState>(initialCPUState());
  const [program, setProgram] = useState<Instruction[]>([]);
  const [asmError, setAsmError] = useState<{ error: string; line: number } | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'stepped' | 'done'>('idle');
  const runIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCodeChange = (val: string | undefined) => {
    const v = val ?? '';
    setCode(v);
    onCodeChange?.(v);
    // Reset CPU when code changes
    setCpuState(initialCPUState());
    setProgram([]);
    setAsmError(null);
    setStatus('idle');
  };

  const compile = useCallback((): Instruction[] | null => {
    const result = assemble(code);
    if (!result.ok) {
      setAsmError({ error: result.error, line: result.line });
      return null;
    }
    setAsmError(null);
    setProgram(result.instructions);
    return result.instructions;
  }, [code]);

  const handleStep = () => {
    let prog = program;
    let state = cpuState;

    if (status === 'idle' || prog.length === 0) {
      const compiled = compile();
      if (!compiled) return;
      prog = compiled;
      state = initialCPUState();
    }

    if (state.halted || state.error) return;

    const next = cpuStep(state, prog);
    setCpuState(next);
    setStatus(next.halted || next.error ? 'done' : 'stepped');
  };

  const handleRun = () => {
    let prog = program;
    let state = cpuState;

    if (status === 'idle' || prog.length === 0) {
      const compiled = compile();
      if (!compiled) return;
      prog = compiled;
      state = initialCPUState();
    }

    if (state.halted || state.error) return;

    setStatus('running');
    const final = cpuRun(state, prog);
    setCpuState(final);
    setStatus('done');
  };

  const handleReset = () => {
    if (runIntervalRef.current) clearTimeout(runIntervalRef.current);
    setCpuState(initialCPUState());
    setProgram([]);
    setAsmError(null);
    setStatus('idle');
  };

  const currentIns = program[cpuState.pc];
  const isFinished = cpuState.halted || !!cpuState.error;

  return (
    <div className="flex flex-col h-full" style={{ background: '#07090F', color: '#EDF1FA' }}>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 shrink-0"
        style={{ background: '#0C1018', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

        <span className="text-xs font-semibold mr-1" style={{ color: '#00C7BE' }}>
          CPU Simulator
        </span>

        <div className="flex-1" />

        <button
          onClick={handleStep}
          disabled={status === 'running' || isFinished}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer"
          style={{ background: 'rgba(0,199,190,0.08)', border: '1px solid rgba(0,199,190,0.2)', color: '#00C7BE' }}>
          <StepForward className="w-3.5 h-3.5" /> Step
        </button>

        <button
          onClick={handleRun}
          disabled={status === 'running' || isFinished}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer"
          style={{ background: '#00C7BE', color: '#07090F' }}>
          <Play className="w-3.5 h-3.5 fill-current" />
          {status === 'running' ? 'Running…' : 'Run All'}
        </button>

        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer"
          style={{ background: '#111724', border: '1px solid rgba(255,255,255,0.06)', color: '#5C6B8A' }}>
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Left: Editor + assembler error */}
        <div className="flex flex-col overflow-hidden" style={{ width: '45%', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

          {/* Assembler error banner */}
          {asmError && (
            <div className="flex items-start gap-2 px-3 py-2 text-xs shrink-0"
              style={{ background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)', color: '#F87171' }}>
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Line {asmError.line}: {asmError.error}</span>
            </div>
          )}

          {/* Monaco assembly editor */}
          <div className="flex-1 overflow-hidden">
            <SqlEditor
              value={code}
              onChange={handleCodeChange}
              onRun={() => handleRun()}
              language="ini"
            />
          </div>

          {/* Instruction listing */}
          {program.length > 0 && (
            <div className="shrink-0 overflow-y-auto" style={{
              maxHeight: 160,
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: '#0C1018',
            }}>
              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#5C6B8A' }}>
                Assembled Program
              </p>
              {program.map((ins, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-3 py-0.5 text-xs font-mono"
                  style={{
                    background: idx === cpuState.pc && !isFinished ? 'rgba(0,199,190,0.08)' : 'transparent',
                    color: idx === cpuState.pc && !isFinished ? '#00C7BE' : '#5C6B8A',
                  }}>
                  <span className="w-6 text-right opacity-50">{idx}</span>
                  {idx === cpuState.pc && !isFinished && <span style={{ color: '#00C7BE' }}>►</span>}
                  {(idx !== cpuState.pc || isFinished) && <span className="w-2" />}
                  <span style={{ color: idx === cpuState.pc && !isFinished ? '#EDF1FA' : '#8899BB' }}>
                    {disassemble(ins)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Registers + Output */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Registers panel */}
          <div className="shrink-0 p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#5C6B8A' }}>Registers</p>
            <div className="grid grid-cols-4 gap-1.5">
              {REG_NAMES.map((name, i) => (
                <div key={name} className="flex flex-col items-center py-1.5 px-2 rounded"
                  style={{ background: '#111724', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#5C6B8A' }}>{name}</span>
                  <span className="text-sm font-mono font-bold mt-0.5" style={{ color: '#EDF1FA' }}>
                    {cpuState.registers[i].toString().padStart(3, ' ')}
                  </span>
                  <span className="text-[9px] font-mono" style={{ color: '#3D4E6B' }}>
                    0x{cpuState.registers[i].toString(16).padStart(2, '0').toUpperCase()}
                  </span>
                </div>
              ))}
            </div>

            {/* PC + FLAGS */}
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono"
                style={{ background: '#111724', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: '#5C6B8A' }}>PC</span>
                <span className="font-bold" style={{ color: '#00C7BE' }}>{cpuState.pc}</span>
              </div>
              {(['Z', 'N', 'C'] as const).map(flag => (
                <div key={flag}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono"
                  style={{
                    background: cpuState.flags[flag] ? 'rgba(0,199,190,0.12)' : '#111724',
                    border: `1px solid ${cpuState.flags[flag] ? 'rgba(0,199,190,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    color: cpuState.flags[flag] ? '#00C7BE' : '#5C6B8A',
                  }}>
                  <span className="font-bold">{flag}</span>
                  <span>{cpuState.flags[flag] ? '1' : '0'}</span>
                </div>
              ))}
              <div className="ml-auto text-xs" style={{ color: '#5C6B8A' }}>
                Steps: {cpuState.steps}
              </div>
            </div>

            {/* Status / error */}
            {cpuState.error && (
              <div className="mt-2 flex items-center gap-1.5 text-xs px-2 py-1 rounded"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#F87171' }}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {cpuState.error}
              </div>
            )}
            {cpuState.halted && !cpuState.error && (
              <div className="mt-2 text-xs px-2 py-1 rounded"
                style={{ background: 'rgba(34,197,94,0.08)', color: '#4ADE80' }}>
                Program halted normally after {cpuState.steps} steps.
              </div>
            )}
          </div>

          {/* Output terminal */}
          <div className="flex-1 overflow-y-auto p-3"
            style={{ fontFamily: 'ui-monospace, monospace', background: '#07090F' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Terminal className="w-3.5 h-3.5" style={{ color: '#5C6B8A' }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#5C6B8A' }}>Output</span>
            </div>
            {cpuState.output.length === 0 ? (
              <p className="text-xs italic" style={{ color: '#3D4E6B' }}>
                No output yet. Use OUT Rx (numeric) or OUTC Rx (ASCII).
              </p>
            ) : (
              cpuState.output.map((line, i) => (
                <div key={i} className="text-sm" style={{ color: '#EDF1FA' }}>{line}</div>
              ))
            )}
          </div>

          {/* Memory strip (first 32 bytes) */}
          <div className="shrink-0 px-3 py-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0C1018' }}>
            <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: '#5C6B8A' }}>
              Data Memory [0..31]
            </p>
            <div className="flex flex-wrap gap-0.5">
              {cpuState.memory.slice(0, 32).map((byte, addr) => (
                <div
                  key={addr}
                  title={`[${addr}] = ${byte}`}
                  className="w-6 h-5 flex items-center justify-center text-[9px] font-mono rounded-sm"
                  style={{
                    background: byte !== 0 ? 'rgba(0,199,190,0.15)' : '#111724',
                    color: byte !== 0 ? '#00C7BE' : '#3D4E6B',
                    border: `1px solid ${byte !== 0 ? 'rgba(0,199,190,0.2)' : 'rgba(255,255,255,0.04)'}`,
                  }}>
                  {byte !== 0 ? byte : '·'}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
