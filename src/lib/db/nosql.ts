
import { Query, Aggregator } from 'mingo';
import { Context } from 'mingo/core';
import * as queryOperators from 'mingo/operators/query';
import * as projectionOperators from 'mingo/operators/projection';
import * as expressionOperators from 'mingo/operators/expression';
import * as pipelineOperators from 'mingo/operators/pipeline';

import { DatabaseEngine, QueryResult, TableDefinition } from './types';

// Debug check
console.log("Mingo Query Ops Keys:", Object.keys(queryOperators || {}));

// Initialize Context (Modern way)
let context: Context;
try {
    context = Context.init({
        query: queryOperators,
        projection: projectionOperators,
        expression: expressionOperators,
        pipeline: pipelineOperators
    });
    console.log("Mingo: Context initialized");
} catch (e) {
    console.warn("Mingo: Context init failed", e);
}

// Simple types for the in-memory store
type Document = Record<string, any>;
type Collection = Document[];
type DBStore = Record<string, Collection>;

export class NoSQLEngine implements DatabaseEngine {
    type = 'nosql' as const;
    private store: DBStore = {};

    async init() {
        this.store = {};
        // Seed initial data
        this.createCollection('users');
        this.insert('users', { name: "Alice", age: 30, role: "admin", skills: ["js", "python"] });
        this.insert('users', { name: "Bob", age: 25, role: "user", skills: ["go"] });
        this.insert('users', { name: "Charlie", age: 35, role: "manager", skills: ["sql"] });

        this.createCollection('logs');
        this.insert('logs', { level: "info", msg: "Server started", timestamp: new Date().toISOString() });
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

        // Mock DB Object
        const dbProxy = new Proxy({}, {
            get: (_target, colName: string) => {
                if (typeof colName !== 'string') return undefined;

                return {
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
                        return res;
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
            }
        });

        try {
            console.log("NoSQL Executing:", script);
            // Safe-ish execution using Function constructor with restricted scope
            const func = new Function('db', `return ${script}`);
            result = func(dbProxy);
            console.log("NoSQL Result Raw:", result);
        } catch (e: any) {
            console.error("NoSQL Error:", e);
            throw new Error("Syntax Error: " + e.message);
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
            if (result.length === 0) return { columns: [], rows: [], message: "No results matched query" };
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
