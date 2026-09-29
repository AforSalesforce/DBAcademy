
import { Query, Aggregator } from 'mingo';
import { Context } from 'mingo/core';
import * as queryOperators from 'mingo/operators/query';
import * as projectionOperators from 'mingo/operators/projection';
import * as expressionOperators from 'mingo/operators/expression';
import * as pipelineOperators from 'mingo/operators/pipeline';

import { DatabaseEngine, QueryResult, TableDefinition } from './types';

// Initialize Context (Modern way)
let context: Context;
try {
    context = Context.init({
        query: queryOperators,
        projection: projectionOperators,
        expression: expressionOperators,
        pipeline: pipelineOperators
    });
} catch (e) {
    console.warn("Mingo: Context init failed", e);
}

/** Message on an empty find(), so the UI can say "0 matched" rather than "done". */
export const NO_MATCH_MESSAGE = 'No results matched query';

// Simple types for the in-memory store
type Document = Record<string, any>;
type Collection = Document[];
type DBStore = Record<string, Collection>;

const SEED_USERS: Document[] = [
    { _id: 'u1', name: 'Alice Moreno', email: 'alice@example.com', role: 'admin', age: 34, isActive: true, city: 'Lisbon', skills: ['sql', 'python'] },
    { _id: 'u2', name: 'Bob Tanaka', email: 'bob@example.com', role: 'user', age: 25, isActive: true, city: 'Osaka', skills: ['go'] },
    { _id: 'u3', name: 'Charlie Webb', email: 'charlie@example.com', role: 'moderator', age: 41, isActive: false, city: 'Leeds', skills: ['sql'] },
    { _id: 'u4', name: 'Dana Kowalski', email: 'dana@example.com', role: 'user', age: 29, isActive: true, city: 'Kraków', skills: ['javascript', 'css'] },
    { _id: 'u5', name: 'Elif Aydın', email: 'elif@example.com', role: 'admin', age: 38, isActive: true, city: 'Izmir', skills: ['postgres', 'rust'] },
    { _id: 'u6', name: 'Farid Nasser', email: 'farid@example.com', role: 'user', age: 22, isActive: true, city: 'Amman', skills: ['python'] },
    { _id: 'u7', name: 'Grace Liu', email: 'grace@example.com', role: 'guest', age: 31, isActive: false, city: 'Toronto', skills: [] },
    { _id: 'u8', name: 'Hugo Martin', email: 'hugo@example.com', role: 'user', age: 45, isActive: true, city: 'Lyon', skills: ['java', 'sql'] },
    { _id: 'u9', name: 'Ines Duarte', email: 'ines@example.com', role: 'moderator', age: 27, isActive: true, city: 'Porto', skills: ['mongodb'] },
    { _id: 'u10', name: 'Jamal Wright', email: 'jamal@example.com', role: 'user', age: 19, isActive: false, city: 'Atlanta', skills: ['javascript'] },
];

const SEED_LOGS: Document[] = [
    { _id: 'l1', level: 'info', msg: 'Server started', service: 'api', timestamp: '2024-03-01T09:00:00.000Z' },
    { _id: 'l2', level: 'warn', msg: 'Slow query: 1200ms', service: 'db', timestamp: '2024-03-01T09:14:22.000Z' },
    { _id: 'l3', level: 'error', msg: 'Payment provider timeout', service: 'billing', timestamp: '2024-03-01T10:02:05.000Z' },
    { _id: 'l4', level: 'info', msg: 'User u4 signed in', service: 'auth', timestamp: '2024-03-01T10:15:40.000Z' },
];

function seedStore(): DBStore {
    // Copies, so edits never leak back into the seed constants.
    return {
        users: SEED_USERS.map(d => structuredClone(d)),
        logs: SEED_LOGS.map(d => structuredClone(d)),
    };
}

/**
 * Snapshots saved before the v2 seed hold three bare users (no email) and
 * one log line. Swap those for the current seed, keeping anything the
 * learner added themselves.
 */
function upgradeLegacyStore(store: DBStore): DBStore {
    const isLegacyUser = (d: Document) => ['Alice', 'Bob', 'Charlie'].includes(d.name) && !('email' in d);
    const isLegacyLog = (d: Document) => d.msg === 'Server started' && !('service' in d);
    const users = store.users ?? [];
    if (!users.some(isLegacyUser)) return store;
    const fresh = seedStore();
    return {
        ...store,
        users: [...fresh.users, ...users.filter(d => !isLegacyUser(d))],
        logs: [...fresh.logs, ...(store.logs ?? []).filter(d => !isLegacyLog(d))],
    };
}

export class NoSQLEngine implements DatabaseEngine {
    type = 'nosql' as const;
    private store: DBStore = {};

    async init() {
        this.store = seedStore();
    }

    async reset() {
        await this.init();
    }

    private createCollection(name: string) {
        if (!this.store[name]) {
            this.store[name] = [];
        }
    }

    // Basic CRUD helpers on the store
    private insert(collection: string, doc: Document) {
        if (!this.store[collection]) this.createCollection(collection);
        // specific to NoSQL, typically _id is added
        if (!doc._id) doc._id = Math.random().toString(36).substring(7);
        this.store[collection].push(doc);
        return doc;
    }

    async execute(script: string): Promise<QueryResult> {
        // We will simple "eval" logic by providing a `db` proxy.
        // The user writes: db.users.find({ age: {$gt: 25} })

        let result: any = null;
        let outputMessage = "";
        // A multi-statement script returns the value of its last db call.
        let lastCall: unknown = undefined;
        const track = <T,>(value: T): T => { lastCall = value; return value; };

        // Mock DB Object
        const dbProxy = new Proxy({}, {
            get: (_target, colName: string) => {
                if (typeof colName !== 'string') return undefined;

                const methods = {
                    find: (query: any = {}) => {
                        if (!this.store[colName]) return [];
                        // Pass context explicitly
                        return new Query(query, { context }).find(this.store[colName]);
                    },
                    findOne: (query: any = {}) => {
                        if (!this.store[colName]) return null;
                        const cursor = new Query(query, { context }).find(this.store[colName]);
                        return cursor.next() || null;
                    },
                    insert: (doc: Document) => {
                        const res = this.insert(colName, doc);
                        outputMessage = `Inserted 1 document into ${colName}`;
                        return res;
                    },
                    insertOne: (doc: Document) => {
                        const res = this.insert(colName, doc);
                        outputMessage = `Inserted 1 document into ${colName}`;
                        return { acknowledged: true, insertedId: res._id };
                    },
                    insertMany: (docs: Document[]) => {
                        if (!Array.isArray(docs)) throw new Error('insertMany expects an array of documents');
                        const ids = docs.map(d => this.insert(colName, d)._id);
                        outputMessage = `Inserted ${ids.length} documents into ${colName}`;
                        return { acknowledged: true, insertedIds: ids };
                    },
                    count: (query: any = {}) => {
                        if (!this.store[colName]) return 0;
                        const cursor = new Query(query, { context }).find(this.store[colName]);
                        return cursor.all().length;
                    },
                    remove: (query: any = {}) => {
                        if (!this.store[colName]) return 0;
                        const queryObj = new Query(query, { context });
                        const initialLen = this.store[colName].length;
                        this.store[colName] = this.store[colName].filter(doc => !queryObj.test(doc));
                        const deletedCount = initialLen - this.store[colName].length;
                        outputMessage = `Removed ${deletedCount} documents`;
                        return { deletedCount };
                    },
                    aggregate: (pipeline: any[] = []) => {
                        if (!this.store[colName]) return [];
                        try {
                            if (Aggregator) {
                                return new Aggregator(pipeline, { context }).run(this.store[colName]);
                            }
                        } catch (e) {
                            console.warn("Aggregator run failed", e);
                        }
                        throw new Error("Aggregation not supported in this environment");
                    }
                };
                // Record each call's return value (see `lastCall`).
                return Object.fromEntries(Object.entries(methods).map(([name, fn]) =>
                    [name, (...args: unknown[]) => track((fn as (...a: unknown[]) => unknown)(...args))]
                ));
            }
        });

        try {
            // A single expression (the common case) is returned directly.
            // Wrapping in parentheses also keeps a leading `// comment` line
            // from turning into `return;`. Anything else — several statements,
            // `const x = ...` — runs as a function body and yields the last
            // db call's result.
            const expr = script.trim().replace(/;+\s*$/, '');
            let run: (db: unknown) => unknown;
            let isExpression = true;
            try {
                run = new Function('db', `return (\n${expr}\n);`) as typeof run;
            } catch {
                run = new Function('db', script) as typeof run;
                isExpression = false;
            }
            const value = run(dbProxy);
            result = isExpression ? value : lastCall;
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            throw new Error((e instanceof SyntaxError ? 'Syntax Error: ' : '') + message);
        }

        // Handle Mingo Cursor (if result is a cursor, resolve it to array)
        if (result && typeof result.all === 'function') {
            result = result.all();
        }

        // Format Result
        if (result === undefined) {
            return { columns: [], rows: [], message: outputMessage || "Success" };
        }

        if (Array.isArray(result)) {
            if (result.length === 0) return { columns: [], rows: [], message: NO_MATCH_MESSAGE };
            // Determine columns dynamically from all keys in result
            const keys = new Set<string>();
            result.forEach(doc => {
                if (typeof doc === 'object' && doc !== null) {
                    Object.keys(doc).forEach(k => keys.add(k));
                }
            });
            return {
                columns: Array.from(keys),
                rows: result
            };
        } else if (typeof result === 'object' && result !== null) {
            // Single document result
            return {
                columns: Object.keys(result),
                rows: [result],
                message: outputMessage
            };
        } else {
            // Primitive result (e.g. count)
            return {
                columns: ['value'],
                rows: [{ value: result }],
                message: outputMessage
            };
        }
    }

    async serialize(): Promise<Uint8Array> {
        return new TextEncoder().encode(JSON.stringify(this.store));
    }

    async restore(data: Uint8Array): Promise<void> {
        this.store = upgradeLegacyStore(JSON.parse(new TextDecoder().decode(data)));
    }

    async getSchema(): Promise<TableDefinition[]> {
        return Object.keys(this.store).map(colName => {
            const firstDoc = this.store[colName][0];
            const columns = firstDoc
                ? Object.keys(firstDoc).map(k => ({ name: k, type: typeof firstDoc[k] }))
                : [];

            return {
                name: colName,
                columns: columns
            };
        });
    }
}
