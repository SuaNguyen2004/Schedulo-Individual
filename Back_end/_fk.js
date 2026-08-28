const mysql = require('mysql2/promise');
(async () => {
  const p = await mysql.createPool({ host: '127.0.0.1', port: 3306, user: 'root', password: '', database: 'schedule', dateStrings: true });
  const [tables] = await p.query("SHOW TABLES");
  const names = tables.map(r => Object.values(r)[0]);
  console.log('TABLES:', names.join(', '));
  for (const t of names) {
    const [fk] = await p.query(
      `SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME, DELETE_RULE
       FROM information_schema.KEY_COLUMN_USAGE k
       JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
         ON rc.CONSTRAINT_NAME = k.CONSTRAINT_NAME AND rc.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
         AND rc.TABLE_NAME = k.TABLE_NAME
       WHERE k.REFERENCED_TABLE_NAME = 'users' AND k.CONSTRAINT_SCHEMA = 'schedule'`
    );
    if (fk.length) {
      fk.forEach(f => console.log(`${f.TABLE_NAME}.${f.COLUMN_NAME} -> users.${f.REFERENCED_COLUMN_NAME} [${f.DELETE_RULE}]`));
    }
  }
  await p.end();
})().catch(e => console.log('ERR', e.message));
