
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

const db = new Database('zenflow.db');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
const schema = readFileSync(join(process.cwd(), 'db.sql'), 'utf8');
db.exec(schema);

export default db;
