/**
 * Ditampilkan saat pemeriksaan sesi gagal atau melewati batas waktu.
 *
 * Kenapa ini ada: sebelumnya kegagalan pemeriksaan sesi membuat halaman berhenti
 * di teks "Memuat..." selamanya — pengguna tidak tahu apa yang salah dan tidak
 * punya jalan keluar. Sekarang penyebabnya ditulis, dan ada tombol untuk mencoba
 * lagi atau masuk ulang.
 */
export default function GalatSesi({
  galat, segarkan,
}: { galat: string; segarkan: () => Promise<void> }) {
  return (
    <main className="wadah" style={{ maxWidth: '40rem' }}>
      <h1>Sesi tidak dapat diperiksa</h1>
      <p className="pesan pesan-galat" role="alert">{galat}</p>
      <p className="hint">
        Halaman dihentikan di sini supaya Anda tidak terjebak di layar tunggu. Kalau
        ini terjadi saat jaringan sekolah tidak stabil, coba lagi; pemeriksaan hanya
        memerlukan beberapa detik ketika koneksi normal.
      </p>
      <p className="baris">
        <button type="button" onClick={() => void segarkan()}>Coba lagi</button>
        <a className="tombol tombol-sekunder" href="/login">Masuk ulang</a>
      </p>
    </main>
  );
}
