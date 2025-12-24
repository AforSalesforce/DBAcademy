
import { NoSQLEngine } from './src/lib/db/nosql.js';

async function test() {
    const engine = new NoSQLEngine();
    await engine.init();

    try {
        console.log("Testing find all...");
        // db.users.find({})
        let res = await engine.execute("db.users.find({})");
        console.log("Find All Result Rows:", res.rows.length);

        console.log("Testing find with filter {$gt: 30}...");
        // db.users.find({ age: { $gt: 30 } })
        res = await engine.execute("db.users.find({ age: { $gt: 30 } })");
        console.log("Find Filter Result:", JSON.stringify(res.rows, null, 2));

        console.log("Testing count...");
        // db.users.count()
        res = await engine.execute("db.users.count()");
        console.log("Count Result:", JSON.stringify(res, null, 2));

    } catch (e) {
        console.error("Test failed:", e);
    }
}

test();
