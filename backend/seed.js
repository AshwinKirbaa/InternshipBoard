import { createDatabase, seedDatabase } from './db.js';

const db = createDatabase();
seedDatabase(db);
db.close();
console.log('Seeded 5 internship records.');
