import type { LessonContentType } from './curriculum';

export interface ArchLesson {
  id: string;
  title: string;
  content: string;
  defaultCode: string;
}

export interface ArchModule {
  id: string;
  title: string;
  lessons: ArchLesson[];
}

export const ARCH_CURRICULUM: ArchModule[] = [
  {
    id: 'arch-1',
    title: 'Module 1: Inside the CPU',
    lessons: [
      {
        id: 'arch-1-1',
        title: 'What is a CPU?',
        content: `
# What is a CPU?

A Central Processing Unit (CPU) is the "brain" of a computer. It executes instructions — one at a time, billions per second.

## Key Components

| Component | Role |
|-----------|------|
| **Registers** | Ultra-fast named storage inside the CPU (R0–R7 in our simulator) |
| **ALU** | Arithmetic Logic Unit — performs ADD, SUB, AND, OR, CMP |
| **Control Unit** | Decodes instructions and orchestrates execution |
| **PC (Program Counter)** | Points to the *next* instruction to execute |
| **FLAGS** | Z (zero), N (negative), C (carry) — result of the last operation |

## The Fetch-Decode-Execute Cycle

Every CPU repeats this forever:
1. **Fetch** — read the instruction at the address in PC
2. **Decode** — figure out what the instruction means
3. **Execute** — carry it out, update registers/memory/flags
4. Increment PC → repeat

## Try It
The assembly code loads two numbers, adds them, and outputs the result.
Click **Step** to execute one instruction at a time and watch the registers change.
        `,
        defaultCode: `; Add two numbers and print the result
LDI R0, 12   ; R0 = 12
LDI R1, 30   ; R1 = 30
ADD R0, R1   ; R0 = R0 + R1  (42)
OUT R0       ; print R0
HLT          ; stop`,
      },
      {
        id: 'arch-1-2',
        title: 'Registers & Flags',
        content: `
# Registers & Flags

## Registers
Our simulator has **8 general-purpose registers**: R0 through R7.
Each holds an 8-bit value (0–255). They're like scratch variables inside the CPU — much faster than memory.

\`\`\`asm
LDI R0, 100  ; R0 ← 100
LDI R1, 200  ; R1 ← 200
ADD R0, R1   ; R0 ← 300 → overflows to 44 (300 - 256)
\`\`\`

## FLAGS Register
After arithmetic/compare operations, three flags are set:

| Flag | Set when… |
|------|-----------|
| **Z** (Zero) | Result is 0 |
| **N** (Negative) | Bit 7 of result is 1 (≥ 128 in unsigned) |
| **C** (Carry) | Result exceeded 255 or went below 0 |

Conditional jumps (JEQ, JNE, JLT, JGT) branch based on these flags.

## Try It
Run the code below and observe how flags change after each instruction.
        `,
        defaultCode: `; Demonstrating flags
LDI R0, 5
LDI R1, 5
SUB R0, R1   ; R0 = 0 → Z flag SET
OUT R0       ; prints 0

LDI R0, 3
LDI R1, 10
SUB R0, R1   ; 3 - 10 = -7 → wraps to 249, N flag SET
OUT R0       ; prints 249

LDI R0, 200
LDI R1, 100
ADD R0, R1   ; 200 + 100 = 300 → wraps to 44, C flag SET
OUT R0       ; prints 44
HLT`,
      },
      {
        id: 'arch-1-3',
        title: 'Loops in Assembly',
        content: `
# Loops in Assembly

High-level loops (\`for\`, \`while\`) don't exist in assembly. You build them from:
1. A **counter** in a register
2. A **compare** instruction (CMP) that sets the Z flag
3. A **conditional jump** (JEQ, JNE) that checks the flag

\`\`\`asm
; Count from 0 to 4
      LDI R0, 0    ; counter
      LDI R1, 5    ; limit
loop:
      CMP R0, R1   ; Z=1 when R0 == R1
      JEQ done     ; exit when equal
      OUT R0       ; print counter
      INC R0       ; counter++
      JMP loop     ; repeat
done:
      HLT
\`\`\`

## Jump Types
- **JMP** — unconditional: always jumps
- **JEQ** — jump if equal (Z flag is set)
- **JNE** — jump if not equal
- **JLT** — jump if less than (N flag is set)
- **JGT** — jump if greater than (not N, not Z)
        `,
        defaultCode: `; Print multiples of 3 up to 30
      LDI R0, 0    ; accumulator (0, 3, 6, ...)
      LDI R1, 3    ; step size
      LDI R2, 30   ; limit

loop:
      CMP R0, R2
      JGT done     ; if R0 > 30, stop
      OUT R0       ; print current value
      ADD R0, R1   ; add 3
      JMP loop

done:
      HLT`,
      },
      {
        id: 'arch-1-4',
        title: 'Memory & Stack',
        content: `
# Memory & Data Storage

## Data Memory
The CPU has **256 bytes** of data memory (separate from the program).
- **LD Rd, [addr]** — load byte from memory address into register
- **ST [addr], Rs** — store register value to memory address

\`\`\`asm
LDI R0, 42
ST  [10], R0    ; mem[10] = 42
LDI R0, 0       ; clear R0
LD  R0, [10]    ; R0 = mem[10]  (= 42)
OUT R0
\`\`\`

## The Stack
A **LIFO** (last-in, first-out) structure. PUSH adds to the top; POP removes from the top.
Used to save register values before calling subroutines.

\`\`\`asm
PUSH R0   ; save R0
; ... do something that modifies R0 ...
POP  R0   ; restore R0
\`\`\`

## Try It
The program below stores a value, overwrites it, then loads and prints the original.
        `,
        defaultCode: `; Memory store and load
LDI R0, 99
ST  [0], R0     ; save 99 to address 0
LDI R0, 0       ; zero out R0
LD  R0, [0]     ; load from address 0
OUT R0           ; should print 99

; Stack example
LDI R0, 10
LDI R1, 20
PUSH R0          ; save 10
MOV R0, R1       ; R0 = 20
OUT R0           ; prints 20
POP R0           ; restore 10
OUT R0           ; prints 10
HLT`,
      },
    ],
  },
  {
    id: 'arch-2',
    title: 'Module 2: Programs',
    lessons: [
      {
        id: 'arch-2-1',
        title: 'Subroutines',
        content: `
# Subroutines

A subroutine is a reusable block of code. Without CALL/RET instructions, you simulate them with PUSH/POP and direct jumps.

## Pattern: Manual Subroutine
1. Push the return address onto the stack (using a register convention)
2. JMP to the subroutine
3. At the end, POP the return address and JMP back

This is exactly how real CPUs implement function calls at the hardware level.

## Factorial Example
The code below computes 5! (120) using a loop-based subroutine.
R0 is the input, R2 is the result (convention: caller sets up, subroutine returns in R2).
        `,
        defaultCode: `; Compute factorial of R0, result in R2
; Convention: caller sets R0 = n before JMP fact
      LDI R0, 5    ; compute 5!
      JMP fact

      ; (subroutine result comes back to here in R2)
      OUT R2
      HLT

fact:
      LDI R2, 1    ; result = 1
      LDI R1, 1    ; divisor = 1
floop:
      CMP R1, R0
      JGT fdone    ; if R1 > R0, done
      MUL R2, R1   ; result *= R1
      INC R1
      JMP floop
fdone:
      JMP 5        ; jump back to OUT R2 (instruction #5)`,
      },
      {
        id: 'arch-2-2',
        title: 'FizzBuzz in Assembly',
        content: `
# FizzBuzz in Assembly

Implement FizzBuzz (print 1–20 with Fizz/Buzz for multiples of 3/5) using only registers, flags, and jumps.

## Strategy
- Use OUT to print numbers
- Use OUTC to print ASCII characters
  - 'F' = 70, 'i' = 105, 'z' = 122, 'B' = 66, 'u' = 117
- Check divisibility: a mod b == 0 when \`a - b * (a / b) == 0\`

Since we don't have a modulo instruction, use CMP + SUB loops, or count up with a separate counter.

**Hint**: Use two counters — one for the main counter (1–20), and secondary counters that reset at 3 and 5.
        `,
        defaultCode: `; FizzBuzz 1-20
; R0 = main counter (1..20)
; R1 = fizz counter (resets at 3)
; R2 = buzz counter (resets at 5)
; R3 = limit (20)
; R4,R5 = constants 3,5
      LDI R0, 1    ; start at 1
      LDI R1, 0    ; fizz counter
      LDI R2, 0    ; buzz counter
      LDI R3, 20   ; limit
      LDI R4, 3    ; fizz period
      LDI R5, 5    ; buzz period

loop:
      CMP R0, R3
      JGT done

      ; increment counters
      INC R1
      INC R2

      ; check fizz (R1 == 3?)
      CMP R1, R4
      JNE checkbuzz
      LDI R1, 0    ; reset fizz counter
checkbuzz:
      CMP R2, R5
      JNE output
      LDI R2, 0    ; reset buzz counter

output:
      OUT R0
      INC R0
      JMP loop
done:
      HLT`,
      },
    ],
  },
];

export function getArchLessonById(moduleId: string, lessonId: string): ArchLesson | undefined {
  return ARCH_CURRICULUM
    .find(m => m.id === moduleId)
    ?.lessons.find(l => l.id === lessonId);
}

// Convert for sidebar compatibility
export function archModulesForSidebar() {
  return ARCH_CURRICULUM.map(m => ({
    id: m.id,
    title: m.title,
    engine: 'javascript' as const,
    lessons: m.lessons.map(l => ({ id: l.id, title: l.title, completed: false })),
  }));
}
