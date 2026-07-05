import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import postgres from 'postgres';

const rootDir = process.cwd();
const envPath = path.join(rootDir, '.env.local');
const migrationsDir = path.join(rootDir, 'supabase', 'migrations');

async function loadLocalEnv() {
  try {
    const contents = await fs.readFile(envPath, 'utf8');
    for (const line of contents.split('\n')) {
      if (!line || line.startsWith('#') || !line.includes('=')) {
        continue;
      }

      const [key, ...valueParts] = line.split('=');
      process.env[key] ??= valueParts.join('=');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function main() {
  await loadLocalEnv();

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required. Add it to .env.local before running migrations.');
  }

  const sql = postgres(process.env.DATABASE_URL, {
    max: 1,
    ssl: 'require',
  });

  try {
    await sql`
      create table if not exists public.schema_migrations (
        version text primary key,
        applied_at timestamptz not null default now()
      )
    `;

    const files = (await fs.readdir(migrationsDir))
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const version = file.replace(/\.sql$/, '');
      const alreadyApplied = await sql`
        select 1
        from public.schema_migrations
        where version = ${version}
        limit 1
      `;

      if (alreadyApplied.length > 0) {
        console.log(`Skipping ${file}`);
        continue;
      }

      const migrationSql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      console.log(`Applying ${file}`);

      await sql.begin(async (transaction) => {
        await transaction.unsafe(migrationSql);
        await transaction`
          insert into public.schema_migrations (version)
          values (${version})
        `;
      });
    }
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
