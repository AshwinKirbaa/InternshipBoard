import { createDatabase, seedDatabase } from './db.js';

const db = createDatabase();
const overwrite = process.argv.includes('--reset');
seedDatabase(db, { overwrite });
db.close();
console.log(overwrite ? 'Reset 5 internship seed records.' : 'Added any missing internship seed records.');
