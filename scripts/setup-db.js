const { Client } = require('pg');

async function setup() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: '',
    database: 'postgres'
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL with empty password.');
    await client.query("ALTER USER postgres WITH PASSWORD 'postgres';");
    console.log("Successfully set postgres user password to 'postgres'.");
  } catch (err) {
    console.log('Attempting connection with password postgres...', err.message);
    const client2 = new Client({
      host: '127.0.0.1',
      port: 5432,
      user: 'postgres',
      password: 'postgres',
      database: 'postgres'
    });
    await client2.connect();
    console.log('Connected to PostgreSQL with password postgres.');
    client = client2;
  }

  // Check and create school_attendance database
  const activeClient = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres'
  });
  await activeClient.connect();

  const res = await activeClient.query("SELECT 1 FROM pg_database WHERE datname = 'school_attendance'");
  if (res.rowCount === 0) {
    await activeClient.query('CREATE DATABASE school_attendance');
    console.log("Database 'school_attendance' created successfully.");
  } else {
    console.log("Database 'school_attendance' already exists.");
  }

  await activeClient.end();
  console.log('Database setup complete.');
}

setup().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
