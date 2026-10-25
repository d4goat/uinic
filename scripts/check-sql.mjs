// Cek sintaks SQL pakai parser Postgres asli (libpg-query), bukan regex.
// Pakai: npm run check:sql   → jalankan sebelum commit perubahan schema/seed.
import { parse } from 'libpg-query';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'supabase');
const files = readdirSync(dir).filter((f) => f.endsWith('.sql'));
let gagal = 0;

for (const f of files) {
  try {
    const r = await parse(readFileSync(join(dir, f), 'utf8'));
    console.log(`OK   ${f} — ${r.stmts.length} pernyataan`);
  } catch (e) {
    gagal++;
    console.error(`GAGAL ${f}\n  ${e.message}`);
  }
}
process.exit(gagal ? 1 : 0);
