const { spawn, execSync } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');

function checkPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function ensurePostgresRunning() {
  console.log('🔍 Checking PostgreSQL connection on port 5432...');
  const isRunning = await checkPort(5432);
  if (!isRunning) {
    console.log('⚡ PostgreSQL is not responding on 5432. Attempting to start PostgreSQL service...');
    try {
      execSync('powershell -Command "Start-Service postgresql-x64-16 -ErrorAction SilentlyContinue"');
    } catch (e) {
      // Ignored
    }

    let retries = 10;
    while (retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      if (await checkPort(5432)) {
        console.log('✅ PostgreSQL service is now running on port 5432.');
        return;
      }
      retries--;
    }

    console.warn('⚠️ Could not connect to PostgreSQL on port 5432. Please ensure PostgreSQL is running.');
  } else {
    console.log('✅ PostgreSQL is actively running on port 5432.');
  }
}

async function main() {
  // 1. Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // 2. Ensure PostgreSQL is up
  await ensurePostgresRunning();

  // 3. Start Next.js dev server
  console.log('🚀 Starting NexTurn School Attendance Management System...');
  const child = spawn('npx', ['next', 'dev'], {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

main().catch(err => {
  console.error('Failed to launch dev server:', err);
  process.exit(1);
});
