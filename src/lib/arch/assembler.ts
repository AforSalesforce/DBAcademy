import { OPCODES, Instruction, Opcode } from './cpu';

export type AssemblerResult =
  | { ok: true;  instructions: Instruction[] }
  | { ok: false; error: string; line: number };

// ── Token helpers ─────────────────────────────────────────────────────────────

function parseReg(tok: string): number | null {
  const m = tok?.match(/^[Rr]([0-7])$/);
  return m ? parseInt(m[1], 10) : null;
}

function parseImm(tok: string | undefined): number | null {
  if (!tok) return null;
  const clean = tok.replace(/^#/, '');
  const n = clean.toLowerCase().startsWith('0x')
    ? parseInt(clean, 16)
    : parseInt(clean, 10);
  return isNaN(n) ? null : n;
}

function stripBrackets(tok: string | undefined): string | undefined {
  return tok?.replace(/^\[/, '').replace(/\]$/, '');
}

// ── Main assembler ────────────────────────────────────────────────────────────

export function assemble(source: string): AssemblerResult {
  // Strip comments and trim
  const rawLines = source.split('\n').map((l, i) => ({
    text: l.replace(/;.*$/, '').trim(),
    lineNum: i + 1,
  }));

  // Pass 1: collect label → instruction index
  const labels: Record<string, number> = {};
  let instrIdx = 0;

  for (const { text } of rawLines) {
    if (!text) continue;
    if (text.endsWith(':')) {
      const label = text.slice(0, -1).toLowerCase();
      if (label in labels) {
        const lnum = rawLines.findIndex(l => l.text === text) + 1;
        return { ok: false, error: `Duplicate label '${label}'`, line: lnum };
      }
      labels[label] = instrIdx;
    } else {
      instrIdx++;
    }
  }

  // Pass 2: emit instructions
  const instructions: Instruction[] = [];

  function resolveTarget(tok: string | undefined, lineNum: number): number | null {
    if (!tok) return null;
    const key = tok.toLowerCase();
    if (key in labels) return labels[key];
    return parseImm(tok);
  }

  for (const { text, lineNum } of rawLines) {
    if (!text || text.endsWith(':')) continue;

    // Tokenise, splitting on whitespace and commas
    const tokens = text.split(/[\s,]+/).filter(Boolean);
    const mnemonic = tokens[0].toUpperCase();
    const t = (i: number) => tokens[i];

    function emit(opcode: Opcode, a: number, b: number): void {
      instructions.push({ mnemonic, opcode, a, b, sourceLine: lineNum });
    }

    function twoReg(opcode: Opcode): AssemblerResult | null {
      const rd = parseReg(t(1));
      const rs = parseReg(t(2));
      if (rd === null || rs === null) return { ok: false, error: `${mnemonic} requires two registers (Rd, Rs)`, line: lineNum };
      emit(opcode, rd, rs);
      return null;
    }

    switch (mnemonic) {
      case 'HLT': emit(OPCODES.HLT, 0, 0); break;
      case 'NOP': emit(OPCODES.NOP, 0, 0); break;

      case 'MOV': {
        const e = twoReg(OPCODES.MOV); if (e) return e; break;
      }
      case 'LDI': {
        const rd  = parseReg(t(1));
        const imm = parseImm(t(2));
        if (rd === null || imm === null) return { ok: false, error: 'LDI requires a register and immediate: LDI Rd, #n', line: lineNum };
        emit(OPCODES.LDI, rd, imm & 0xFF);
        break;
      }
      case 'LD': {
        const rd   = parseReg(t(1));
        const addr = parseImm(stripBrackets(t(2)));
        if (rd === null || addr === null) return { ok: false, error: 'LD requires a register and address: LD Rd, [addr]', line: lineNum };
        emit(OPCODES.LD, rd, addr & 0xFF);
        break;
      }
      case 'ST': {
        const addr = parseImm(stripBrackets(t(1)));
        const rs   = parseReg(t(2));
        if (addr === null || rs === null) return { ok: false, error: 'ST requires an address and register: ST [addr], Rs', line: lineNum };
        emit(OPCODES.ST, rs, addr & 0xFF);
        break;
      }

      case 'ADD': { const e = twoReg(OPCODES.ADD); if (e) return e; break; }
      case 'SUB': { const e = twoReg(OPCODES.SUB); if (e) return e; break; }
      case 'MUL': { const e = twoReg(OPCODES.MUL); if (e) return e; break; }
      case 'AND': { const e = twoReg(OPCODES.AND); if (e) return e; break; }
      case 'OR':  { const e = twoReg(OPCODES.OR);  if (e) return e; break; }
      case 'XOR': { const e = twoReg(OPCODES.XOR); if (e) return e; break; }
      case 'CMP': { const e = twoReg(OPCODES.CMP); if (e) return e; break; }

      case 'INC': {
        const rd = parseReg(t(1));
        if (rd === null) return { ok: false, error: 'INC requires one register: INC Rd', line: lineNum };
        emit(OPCODES.INC, rd, 0);
        break;
      }
      case 'DEC': {
        const rd = parseReg(t(1));
        if (rd === null) return { ok: false, error: 'DEC requires one register: DEC Rd', line: lineNum };
        emit(OPCODES.DEC, rd, 0);
        break;
      }

      case 'SHL':
      case 'SHR': {
        const rd  = parseReg(t(1));
        const n   = parseImm(t(2));
        if (rd === null || n === null) return { ok: false, error: `${mnemonic} requires a register and shift count`, line: lineNum };
        emit(mnemonic === 'SHL' ? OPCODES.SHL : OPCODES.SHR, rd, n & 7);
        break;
      }

      case 'JMP':
      case 'JEQ':
      case 'JNE':
      case 'JLT':
      case 'JGT': {
        const opMap: Record<string, Opcode> = {
          JMP: OPCODES.JMP, JEQ: OPCODES.JEQ, JNE: OPCODES.JNE,
          JLT: OPCODES.JLT, JGT: OPCODES.JGT,
        };
        const target = resolveTarget(t(1), lineNum);
        if (target === null) return { ok: false, error: `${mnemonic}: unknown label or invalid address '${t(1)}'`, line: lineNum };
        emit(opMap[mnemonic], target, 0);
        break;
      }

      case 'PUSH': {
        const rs = parseReg(t(1));
        if (rs === null) return { ok: false, error: 'PUSH requires a register', line: lineNum };
        emit(OPCODES.PUSH, rs, 0);
        break;
      }
      case 'POP': {
        const rd = parseReg(t(1));
        if (rd === null) return { ok: false, error: 'POP requires a register', line: lineNum };
        emit(OPCODES.POP, rd, 0);
        break;
      }

      case 'OUT': {
        const rs = parseReg(t(1));
        if (rs === null) return { ok: false, error: 'OUT requires a register: OUT Rs', line: lineNum };
        emit(OPCODES.OUT, rs, 0);
        break;
      }
      case 'OUTC': {
        const rs = parseReg(t(1));
        if (rs === null) return { ok: false, error: 'OUTC requires a register: OUTC Rs', line: lineNum };
        emit(OPCODES.OUTC, rs, 0);
        break;
      }

      default:
        return { ok: false, error: `Unknown instruction: '${mnemonic}'`, line: lineNum };
    }
  }

  return { ok: true, instructions };
}

/** Format an instruction back to human-readable assembly (for display). */
export function disassemble(ins: Instruction): string {
  const R = (n: number) => `R${n}`;
  switch (ins.opcode) {
    case OPCODES.HLT:  return 'HLT';
    case OPCODES.NOP:  return 'NOP';
    case OPCODES.MOV:  return `MOV  ${R(ins.a)}, ${R(ins.b)}`;
    case OPCODES.LDI:  return `LDI  ${R(ins.a)}, ${ins.b}`;
    case OPCODES.LD:   return `LD   ${R(ins.a)}, [${ins.b}]`;
    case OPCODES.ST:   return `ST   [${ins.b}], ${R(ins.a)}`;
    case OPCODES.ADD:  return `ADD  ${R(ins.a)}, ${R(ins.b)}`;
    case OPCODES.SUB:  return `SUB  ${R(ins.a)}, ${R(ins.b)}`;
    case OPCODES.MUL:  return `MUL  ${R(ins.a)}, ${R(ins.b)}`;
    case OPCODES.AND:  return `AND  ${R(ins.a)}, ${R(ins.b)}`;
    case OPCODES.OR:   return `OR   ${R(ins.a)}, ${R(ins.b)}`;
    case OPCODES.XOR:  return `XOR  ${R(ins.a)}, ${R(ins.b)}`;
    case OPCODES.CMP:  return `CMP  ${R(ins.a)}, ${R(ins.b)}`;
    case OPCODES.INC:  return `INC  ${R(ins.a)}`;
    case OPCODES.DEC:  return `DEC  ${R(ins.a)}`;
    case OPCODES.SHL:  return `SHL  ${R(ins.a)}, ${ins.b}`;
    case OPCODES.SHR:  return `SHR  ${R(ins.a)}, ${ins.b}`;
    case OPCODES.JMP:  return `JMP  ${ins.a}`;
    case OPCODES.JEQ:  return `JEQ  ${ins.a}`;
    case OPCODES.JNE:  return `JNE  ${ins.a}`;
    case OPCODES.JLT:  return `JLT  ${ins.a}`;
    case OPCODES.JGT:  return `JGT  ${ins.a}`;
    case OPCODES.PUSH: return `PUSH ${R(ins.a)}`;
    case OPCODES.POP:  return `POP  ${R(ins.a)}`;
    case OPCODES.OUT:  return `OUT  ${R(ins.a)}`;
    case OPCODES.OUTC: return `OUTC ${R(ins.a)}`;
    default: return `??? (${ins.opcode})`;
  }
}
