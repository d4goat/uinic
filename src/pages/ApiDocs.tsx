import { openApiUrl } from '../lib/supabase';

/** [F9] Dokumentasi API internal: PostgREST + RPC, apa adanya dari supabase/schema.sql. */

type Rpc = {
  nama: string;
  argumen: string;
  siapa: string;
  catatan: string;
};

const RPC: Rpc[] = [
  {
    nama: 'rpc_assessment_save',
    argumen: 'p_student uuid, p_hambatan jsonb, p_catatan text',
    siapa: 'guru, gpk (authenticated), siswa harus satu sekolah; mengembalikan uuid asesmen',
    catatan: 'Menyimpan hambatan terpilih + catatan asesmen (dienkripsi pgcrypto) dalam satu transaksi.',
  },
  {
    nama: 'rpc_ppi_suggest',
    argumen: 'p_student uuid',
    siapa: 'guru, gpk, koordinator, admin (satu sekolah) dan wali yang tertaut ke siswa',
    catatan: 'Hanya membaca: hambatan terbaru + akomodasi saran beserta alasan dan tingkat bukti.',
  },
  {
    nama: 'rpc_ppi_save',
    argumen: 'p_student uuid, p_ppi uuid, p_ringkasan text, p_tujuan jsonb, p_akomodasi jsonb',
    siapa: 'guru, gpk (authenticated), siswa harus satu sekolah',
    catatan: 'Selalu menulis versi baru (nomor_versi naik); riwayat lama tidak pernah ditimpa.',
  },
  {
    nama: 'rpc_session_log',
    argumen: 'p_ppi uuid, p_goal uuid, p_tanggal date, p_status capaian_status, p_catatan text, p_client_uuid uuid',
    siapa: 'guru, gpk (authenticated), PPI harus satu sekolah',
    catatan: 'Idempoten lewat p_client_uuid, jadi aman dikirim ulang setelah offline.',
  },
  {
    nama: 'rpc_consent_save',
    argumen: 'p_student uuid, p_jenis consent_jenis, p_status consent_status, p_berlaku_hingga timestamptz',
    siapa: 'hanya wali yang tertaut ke siswa tersebut',
    catatan: 'Jenis persetujuan yang dipakai tampilan orang tua: berbagi_rekam.',
  },
  {
    nama: 'rpc_transfer_create',
    argumen: 'p_student uuid, p_ke_school uuid, p_berlaku_jam int (1-720, bawaan 72)',
    siapa: 'koordinator, admin (authenticated), siswa harus satu sekolah',
    catatan: 'Butuh persetujuan wali berbagi_rekam yang masih aktif; token asli hanya muncul sekali, yang disimpan sha256-nya.',
  },
  {
    nama: 'rpc_record_fetch',
    argumen: 'p_token text',
    siapa: 'anon dan authenticated - tanpa login, token itu sendiri yang jadi hak akses',
    catatan: 'Sekali pakai: langsung ditandai terpakai setelah berhasil dibaca. catatan_enc didekripsi di server.',
  },
  {
    nama: 'rpc_student_delete',
    argumen: 'p_student uuid',
    siapa: 'koordinator, admin (authenticated), siswa harus satu sekolah',
    catatan: 'Hapus data atas permintaan; cascade ke seluruh turunannya (asesmen, PPI, sesi, consent, transfer).',
  },
  {
    nama: 'rpc_wali_ringkasan',
    argumen: 'p_student uuid',
    siapa: 'hanya wali yang tertaut ke siswa tersebut',
    catatan: 'Baca-saja untuk [F7]: identitas, PPI versi terbaru, 10 sesi terakhir, riwayat persetujuan. Catatan asesmen tidak ikut (minimisasi data).',
  },
  {
    nama: 'rpc_log_read',
    argumen: "p_objek text, p_objek_id text, p_keterangan jsonb (bawaan '{}')",
    siapa: 'authenticated',
    catatan: 'Trigger audit tidak menangkap SELECT, jadi pembacaan sensitif dicatat eksplisit lewat fungsi ini.',
  },
  {
    nama: 'fn_dec',
    argumen: 'p bytea',
    siapa: 'authenticated saja; execute untuk anon dicabut',
    catatan: 'Dekripsi satu nilai terenkripsi (pgp_sym_decrypt). Tidak dipakai untuk menarik banyak catatan sekaligus.',
  },
];

const TABEL: { nama: string; isi: string }[] = [
  { nama: 'schools, profiles', isi: 'Tenant sekolah dan akun pengguna beserta perannya.' },
  { nama: 'students, guardian_links', isi: 'Siswa pseudonim (kode + inisial) dan tautan wali ke siswa.' },
  { nama: 'barriers, accommodations, barrier_accommodation_rules', isi: 'Tabel referensi hambatan, akomodasi, dan aturan pasangan beserta alasan.' },
  { nama: 'assessments, assessment_barriers', isi: 'Asesmen hambatan per siswa; catatan tersimpan terenkripsi.' },
  { nama: 'ppis, ppi_versions, ppi_goals, ppi_accommodations', isi: 'PPI beserta versinya, tujuan/indikator, dan akomodasi yang disetujui.' },
  { nama: 'sessions', isi: 'Log sesi dengan client_uuid unik untuk sinkronisasi idempoten.' },
  { nama: 'consents, transfers', isi: 'Persetujuan wali dan token transfer antar sekolah (hanya hash yang disimpan).' },
  { nama: 'materials, material_variants', isi: 'Materi ajar dan variannya (teks besar, kalimat pendek, bacakan).' },
  { nama: 'audit_logs', isi: 'Jejak baca dan ubah data; diisi trigger dan rpc_log_read.' },
];

export default function ApiDocs() {
  return (
    <>
      <h1>Dokumentasi API</h1>
      <p className="lede">
        PPI-Link tanpa server aplikasi sendiri. Antarmuka React + Vite berbicara langsung ke
        Supabase Postgres, dan Supabase mengekspos tabel serta fungsi sebagai REST API lewat
        PostgREST. Karena itu, apa yang dijelaskan di halaman ini adalah API yang benar-benar
        dipakai aplikasi.
      </p>

      <section className="kartu">
        <h2 style={{ marginTop: 0 }}>Arsitektur singkat</h2>
        <ul>
          <li>React + Vite (TypeScript) di peramban memanggil PostgREST dengan kunci anon publik.</li>
          <li>
            Otorisasi tidak dipegang aplikasi: Row Level Security di Postgres yang menentukan baris
            dan kolom mana yang boleh dibaca atau ditulis oleh setiap peran (guru, GPK, koordinator,
            orang tua, admin), dibatasi school_id.
          </li>
          <li>
            Aksi yang menyentuh banyak tabel dibungkus fungsi Postgres <code>security definer</code>{' '}
            yang memeriksa peran sendiri, jadi tidak bisa dilewati dari klien.
          </li>
          <li>
            Audit diisi trigger Postgres pada setiap perubahan, sedangkan pembacaan sensitif dicatat
            lewat <code>rpc_log_read</code>.
          </li>
          <li>Catatan asesmen dan catatan sesi tersimpan terenkripsi (pgcrypto) di dalam basis data.</li>
        </ul>
      </section>

      <section className="kartu">
        <h2 style={{ marginTop: 0 }}>Endpoints tabel</h2>
        <p>
          Pola jalur: <code>/rest/v1/&lt;tabel&gt;</code> dengan metode GET, POST, PATCH, DELETE.
          Semua permintaan memerlukan header <code>apikey</code> dan, untuk data terlindungi,
          header <code>Authorization: Bearer &lt;access_token&gt;</code> hasil login Supabase Auth.
        </p>
        <ul>
          {TABEL.map((t) => (
            <li key={t.nama}>
              <code>{t.nama}</code> - {t.isi}
            </li>
          ))}
        </ul>
      </section>

      <section className="kartu">
        <h2 style={{ marginTop: 0 }}>Spesifikasi OpenAPI</h2>
        <p>
          PostgREST menerbitkan spesifikasi OpenAPI sendiri. Isinya selalu mengikuti skema yang
          sedang aktif, jadi tidak ada berkas dokumentasi yang bisa basi.
        </p>
        <p>
          <a href={openApiUrl} target="_blank" rel="noreferrer">
            {openApiUrl}
          </a>
        </p>
        <p className="hint">
          Buka di peramban sebagai JSON, atau impor ke alat seperti Swagger UI / Postman sebagai
          sumber OpenAPI untuk mencoba permintaan langsung.
        </p>
      </section>

      <section className="kartu">
        <h2 style={{ marginTop: 0 }}>Fungsi RPC</h2>
        <p>
          Semua fungsi dipanggil lewat <code>POST /rest/v1/rpc/&lt;nama&gt;</code> dengan isi JSON
          berisi argumen, misalnya <code>{'{"p_student":"<uuid>"}'}</code>. Argumen yang punya nilai
          bawaan boleh dihilangkan.
        </p>
        <div className="bisa-digulir">
          <table>
            <caption>Fungsi RPC PPI-Link: argumen, hak akses, dan catatan</caption>
            <thead>
              <tr>
                <th scope="col">Fungsi</th>
                <th scope="col">Metode</th>
                <th scope="col">Jalur contoh</th>
                <th scope="col">Argumen</th>
                <th scope="col">Siapa yang boleh</th>
                <th scope="col">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {RPC.map((r) => (
                <tr key={r.nama}>
                  <td>
                    <code>{r.nama}</code>
                  </td>
                  <td>POST</td>
                  <td>
                    <code>/rest/v1/rpc/{r.nama}</code>
                  </td>
                  <td>{r.argumen}</td>
                  <td>{r.siapa}</td>
                  <td>{r.catatan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="kartu">
        <h2 style={{ marginTop: 0 }}>Contoh permintaan</h2>
        <p>
          Ganti <code>$SUPABASE_URL</code>, <code>$ANON_KEY</code>, dan <code>$ACCESS_TOKEN</code>{' '}
          dengan nilai proyek Anda. Kunci tidak pernah ditulis di dalam kode aplikasi ini.
        </p>
        <h3>Saran akomodasi dengan akun guru</h3>
        <pre className="bisa-digulir">
          <code>{`curl -X POST "$SUPABASE_URL/rest/v1/rpc/rpc_ppi_suggest" \\
  -H "apikey: $ANON_KEY" \\
  -H "Authorization: Bearer $ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"p_student":"00000000-0000-0000-0000-000000000000"}'`}</code>
        </pre>
        <h3>Ambil rekam dengan token sekali pakai (tanpa login)</h3>
        <pre className="bisa-digulir">
          <code>{`curl -X POST "$SUPABASE_URL/rest/v1/rpc/rpc_record_fetch" \\
  -H "apikey: $ANON_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"p_token":"<token dari koordinator>"}'`}</code>
        </pre>
      </section>

      <section className="kartu">
        <h2 style={{ marginTop: 0 }}>Kode galat</h2>
        <div className="bisa-digulir">
          <table>
            <caption>Kode galat Postgres yang mungkin muncul di halaman ini</caption>
            <thead>
              <tr>
                <th scope="col">Kode</th>
                <th scope="col">Arti</th>
                <th scope="col">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>42501</code>
                </td>
                <td>Tidak berhak: peran tidak sesuai, siswa di luar sekolah, atau wali tidak tertaut ke siswa itu.</td>
                <td>Masuk dengan akun yang sesuai; jangan coba menembus lewat klien.</td>
              </tr>
              <tr>
                <td>
                  <code>22023</code>
                </td>
                <td>Token tidak valid, sudah kedaluwarsa, atau sudah dipakai.</td>
                <td>Minta koordinator menerbitkan token baru; token sekali pakai tidak bisa diulang.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
