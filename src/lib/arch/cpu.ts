// ── Instruction set ──────────────────────────────────────────────────────────

export const OPCODES = {
  HLT:  0,   // halt
  MOV:  1,   // Rd = Rs
  LDI:  2,   // Rd = immediate
  LD:   3,   // Rd = mem[addr]
  ST:   4,   // mem[addr] = Rs
  ADD:  5,   // Rd = Rd + Rs
  SUB:  6,   // Rd = Rd - Rs
  MUL:  7,   // Rd = Rd * Rs (low 8 bits)
  AND:  8,   // Rd = Rd & Rs
  OR:   9,   // Rd = Rd | Rs
  XOR:  10,  // Rd = Rd ^ Rs
  INC:  11,  // Rd++
  DEC:  12,  // Rd--
  SHL:  13,  // Rd <<= n
  SHR:  14,  // Rd >>= n
  CMP:  15,  // set flags from Rs - Rt (no result stored)
  JMP:  16,  // PC = target
  JEQ:  17,  // if Z: PC = target
  JNE:  18,  // if !Z: PC = target
  JLT:  19,  // if N: PC = target
  JGT:  20,  // if !N && !Z: PC = target
  PUSH: 21,  // stack.push(Rs)
  POP:  22,  // Rd = stack.pop()
  OUT:  23,  // print numeric value of Rs
  OUTC: 24,  // print Rs as ASCII character
  NOP:  25,  // no operation
} as const;

export type Opcode = typeof OPCODES[keyof typeof OPCODES];

// ── Instruction record ────────────────────────────────────────────────────────

export interface Instruction {
  mnemonic: string;
  opcode: Opcode;
  a: number;    // dest register (0-7) or jump target
  b: number;    // src register, immediate value, or memory address
  sourceLine: number;
}

// ── CPU state ─────────────────────────────────────────────────────────────────

export interface Flags { Z: boolean; N: boolean; C: boolean }

export interface CPUState {
  registers: number[];   // R0–R7, each 0–255
  memory:    number[];   // 256 bytes data memory
  stack:     number[];   // software stack (not in memory)
  pc:        number;     // instruction index
  flags:     Flags;
  halted:    boolean;
  output:    string[];   // OUT / OUTC results
  error:     string | null;
  steps:     number;
}

export const MAX_STEPS = 10_000;

export function initialCPUState(): CPUState {
  return {
    registers: new Array(8).fill(0),
    memory:    new Array(256).fill(0),
    stack:     [],
    pc:        0,
    flags:     { Z: false, N: false, C: false },
    halted:    false,
    output:    [],
    error:     null,
    steps:     0,
  };
}

// ── Single-step execution ─────────────────────────────────────────────────────

function clamp8(n: number): number { return ((n & 0xFF) + 256) & 0xFF; }

function setFlags(flags: Flags, raw: number): void {
  flags.Z = (raw & 0xFF) === 0;
  flags.N = (raw & 0x80) !== 0;
  flags.C = raw > 0xFF || raw < 0;
}

export function cpuStep(state: CPUState, program: Instruction[]): CPUState {
  if (state.halted || state.error !== null) return state;

  if (state.pc >= program.length) {
    return { ...state, halted: true, error: 'Program ended without HLT' };
  }

  const ins    = program[state.pc];
  const regs   = [...state.registers];
  const mem    = [...state.memory];
  const stack  = [...state.stack];
  const flags  = { ...state.flags };
  const output = [...state.output];

  let pc     = state.pc + 1;
  let halted = false;
  let error: string | null = null;

  switch (ins.opcode) {
    case OPCODES.HLT: halted = true; pc = state.pc; break;
    case OPCODES.NOP: break;

    case OPCODES.MOV: regs[ins.a] = regs[ins.b]; break;
    case OPCODES.LDI: regs[ins.a] = ins.b & 0xFF; break;

    case OPCODES.LD: {
      const addr = ins.b & 0xFF;
      regs[ins.a] = mem[addr];
      break;
    }
    case OPCODES.ST: {
      const addr = ins.b & 0xFF;
      mem[addr] = regs[ins.a] & 0xFF;
      break;
    }

    case OPCODES.ADD: { const r = regs[ins.a] + regs[ins.b]; setFlags(flags, r); regs[ins.a] = clamp8(r); break; }
    case OPCODES.SUB: { const r = regs[ins.a] - regs[ins.b]; setFlags(flags, r); regs[ins.a] = clamp8(r); break; }
    case OPCODES.MUL: { const r = regs[ins.a] * regs[ins.b]; setFlags(flags, r); regs[ins.a] = clamp8(r); break; }
    case OPCODES.AND: { const r = regs[ins.a] & regs[ins.b]; flags.Z = r === 0; flags.N = (r & 0x80) !== 0; regs[ins.a] = r; break; }
    case OPCODES.OR:  { const r = regs[ins.a] | regs[ins.b]; flags.Z = r === 0; flags.N = (r & 0x80) !== 0; regs[ins.a] = r; break; }
    case OPCODES.XOR: { const r = regs[ins.a] ^ regs[ins.b]; flags.Z = r === 0; flags.N = (r & 0x80) !== 0; regs[ins.a] = r; break; }

    case OPCODES.INC: { const r = regs[ins.a] + 1; setFlags(flags, r); regs[ins.a] = clamp8(r); break; }
    case OPCODES.DEC: { const r = regs[ins.a] - 1; setFlags(flags, r); regs[ins.a] = clamp8(r); break; }

    case OPCODES.SHL: { const r = regs[ins.a] << (ins.b & 7); setFlags(flags, r); regs[ins.a] = clamp8(r); break; }
    case OPCODES.SHR: { regs[ins.a] = (regs[ins.a] >>> (ins.b & 7)) & 0xFF; flags.Z = regs[ins.a] === 0; break; }

    case OPCODES.CMP: { const r = regs[ins.a] - regs[ins.b]; setFlags(flags, r); break; }

    case OPCODES.JMP: pc = ins.a; break;
    case OPCODES.JEQ: if (flags.Z)             pc = ins.a; break;
    case OPCODES.JNE: if (!flags.Z)            pc = ins.a; break;
    case OPCODES.JLT: if (flags.N)             pc = ins.a; break;
    case OPCODES.JGT: if (!flags.N && !flags.Z) pc = ins.a; break;

    case OPCODES.PUSH:
      stack.push(regs[ins.a] & 0xFF);
      break;
    case OPCODES.POP:
      if (stack.length === 0) { error = `Line ${ins.sourceLine}: Stack underflow`; break; }
      regs[ins.a] = stack.pop()!;
      break;

    case OPCODES.OUT:  output.push(String(regs[ins.a])); break;
    case OPCODES.OUTC: output.push(String.fromCharCode(regs[ins.a])); break;

    default: error = `Unknown opcode ${ins.opcode} at line ${ins.sourceLine}`;
  }

  return {
    registers: regs,
    memory: mem,
    stack,
    pc,
    flags,
    halted,
    output,
    error,
    steps: state.steps + 1,
  };
}

/** Run until halted, error, or MAX_STEPS reached. */
export function cpuRun(initial: CPUState, program: Instruction[]): CPUState {
  let state = initial;
  while (!state.halted && !state.error && state.steps < MAX_STEPS) {
    state = cpuStep(state, program);
  }
  if (state.steps >= MAX_STEPS && !state.halted && !state.error) {
    return { ...state, error: `Exceeded ${MAX_STEPS.toLocaleString()} steps — possible infinite loop` };
  }
  return state;
}
