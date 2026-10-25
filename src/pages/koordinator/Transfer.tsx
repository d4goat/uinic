import { useEffect, useMemo, useState } from 'react';
import {
  ambilRekam, buatTransfer, catatAkses, daftarConsent, daftarSekolah, daftarSiswa, daftarTransfer,
} from '../../lib/api';
import type { Sekolah, Siswa, TransferHasil } from '../../lib/types';

const MASA_BERLAKU = [
  { jam: 24, label: '24 jam — berlaku 1 hari' },
  { jam: 72, label: '72 jam — berlaku 3 hari' },
  { jam: 168, label: '168 jam — berlaku 7 hari' },
];

type BarisTransfer = Awaited<ReturnType<typeof daftarTransfer>>[number];
type BarisConsent = Awaited<ReturnType<typeof daftarConsent>>[number];

const waktu = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

/** Wali aktif = consent 'berbagi_rekam' berstatus disetujui dan belum kedaluwarsa. */
const adaConsentAktif = (baris: BarisConsent[]) =>
  baris.some(
    (c) =>
      c.jenis === 'berbagi_rekam' &&
      c.status === 'disetujui' &&
      (!c.berlaku_hingga || new Date(c.berlaku_hingga) > new Date()),
  );

function unduhJson(data: unknown, namaBerkas: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = namaBerkas;
  a.click();
  URL.revokeObjectURL(url);
}

/** Peta pesan galat server -> kalimat yang bisa dibaca operator sekolah. */
function pesanAmbilRekam(e: unknown): { teks: string; saran: string } {
  const m = e instanceof Error ? e.message : String(e);
  if (/tidak dikenali/i.test(m)) {
    return {
      teks: 'Token tidak dikenali.',
      saran: 'Periksa kembali token yang Anda terima. Satu karakter salah membuat token tidak cocok.',
    };
  }
  if (/sudah dipakai/i.test(m)) {
    return {
      teks: 'Token sudah dipakai.',
      saran: 'Token hanya bisa dipakai sekali. Minta sekolah asal membuat token baru.',
    };
  }
  if (/kedaluwarsa/i.test(m)) {
    return {
      teks: 'Token sudah kedaluwarsa.',
      saran: 'Masa berlaku token habis. Minta sekolah asal membuat token baru dengan masa berlaku lebih panjang.',
    };
  }
  return { teks: 'Rekam gagal diambil.', saran: `Pesan dari server: ${m}` };
}

export default function Transfer() {
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [sekolah, setSekolah] = useState<Sekolah[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galatMuat, setGalatMuat] = useState<string | null>(null);

  const [siswaId, setSiswaId] = useState('');
  const [keSchoolId, setKeSchoolId] = useState('');
  const [jam, setJam] = useState(72);

  const [consent, setConsent] = useState<BarisConsent[] | null>(null);
  const [memuatConsent, setMemuatConsent] = useState(false);
  const [galatConsent, setGalatConsent] = useState<string | null>(null);

  const [hasil, setHasil] = useState<TransferHasil | null>(null);
  const [galatBuat, setGalatBuat] = useState<string | null>(null);
  const [sedangBuat, setSedangBuat] = useState(false);
  const [statusSalin, setStatusSalin] = useState<string | null>(null);
  const [sedangUnduh, setSedangUnduh] = useState(false);

  const [riwayat, setRiwayat] = useState<BarisTransfer[]>([]);
  const [galatRiwayat, setGalatRiwayat] = useState<string | null>(null);

  const [token, setToken] = useState('');
  const [hasilAmbil, setHasilAmbil] = useState<unknown>(null);
  const [galatAmbil, setGalatAmbil] = useState<{ teks: string; saran: string } | null>(null);
  const [sedangAmbil, setSedangAmbil] = useState(false);

  // F12: halaman ini membaca tabel transfers -> catat pembacaan secara eksplisit.
  useEffect(() => {
    catatAkses('transfers', '-', { aksi: 'buka' }).catch(() => {});
    (async () => {
      try {
        const [s, sk, tr] = await Promise.all([daftarSiswa(), daftarSekolah(), daftarTransfer()]);
        setSiswa(s);
        setSekolah(sk);
        setRiwayat(tr);
      } catch (e) {
        setGalatMuat(e instanceof Error ? e.message : 'Daftar siswa dan sekolah gagal dimuat.');
      } finally {
        setMemuat(false);
      }
    })();
  }, []);

  const siswaDipilih = useMemo(() => siswa.find((s) => s.id === siswaId) ?? null, [siswa, siswaId]);

  // Sekolah asal siswa tidak boleh jadi tujuan: rekam hanya dikirim ke instansi lain.
  const sekolahTujuan = useMemo(
    () => sekolah.filter((s) => !siswaDipilih || s.id !== siswaDipilih.school_id),
    [sekolah, siswaDipilih],
  );

  const namaSekolah = (id: string) => sekolah.find((s) => s.id === id)?.nama ?? id;

  // Persetujuan diperiksa ulang setiap siswa berganti.
  useEffect(() => {
    setHasil(null);
    setGalatBuat(null);
    setStatusSalin(null);
    setKeSchoolId('');
    if (!siswaId) {
      setConsent(null);
      return;
    }
    setMemuatConsent(true);
    setGalatConsent(null);
    (async () => {
      try {
        setConsent(await daftarConsent(siswaId));
      } catch (e) {
        setConsent(null);
        setGalatConsent(e instanceof Error ? e.message : 'Persetujuan gagal dimuat.');
      } finally {
        setMemuatConsent(false);
      }
    })();
  }, [siswaId]);

  const bolehBuat = Boolean(
    siswaId && keSchoolId && jam > 0 && consent && adaConsentAktif(consent) && !memuatConsent,
  );

  async function salinToken() {
    if (!hasil) return;
    try {
      await navigator.clipboard.writeText(hasil.token);
      setStatusSalin('Token disalin ke papan klip.');
    } catch {
      setStatusSalin('Penyalinan otomatis ditolak peramban. Salin token dengan tangan dari kotak di atas.');
    }
  }

  async function buat() {
    setSedangBuat(true);
    setGalatBuat(null);
    setStatusSalin(null);
    try {
      const h = await buatTransfer(siswaId, keSchoolId, jam);
      setHasil(h);
      setRiwayat(await daftarTransfer());
    } catch (e) {
      const m = e instanceof Error ? e.message : '';
      setGalatBuat(
        /persetujuan/i.test(m)
          ? 'Transfer tidak dapat dibuat: persetujuan wali yang aktif tidak ditemukan.'
          : `Token gagal dibuat. ${m || 'Coba lagi sebentar lagi.'}`,
      );
    } finally {
      setSedangBuat(false);
    }
  }

  async function unduhRekamDenganToken() {
    if (!hasil) return;
    setSedangUnduh(true);
    setGalatBuat(null);
    try {
      const rekam = await ambilRekam(hasil.token);
      unduhJson(rekam, `rekam-${siswaDipilih?.kode ?? 'siswa'}.json`);
    } catch (e) {
      const { teks, saran } = pesanAmbilRekam(e);
      setGalatBuat(`${teks} ${saran}`);
    } finally {
      setSedangUnduh(false);
    }
  }

  async function muatRiwayat() {
    setGalatRiwayat(null);
    try {
      setRiwayat(await daftarTransfer());
    } catch (e) {
      setGalatRiwayat(e instanceof Error ? e.message : 'Riwayat transfer gagal dimuat.');
    }
  }

  async function ambil() {
    setSedangAmbil(true);
    setGalatAmbil(null);
    setHasilAmbil(null);
    try {
      setHasilAmbil(await ambilRekam(token.trim()));
    } catch (e) {
      setGalatAmbil(pesanAmbilRekam(e));
    } finally {
      setSedangAmbil(false);
    }
  }

  return (
    <div className="wadah wadah-lebar">
      <h1>Transfer rekam antar sekolah</h1>
      <p className="lede">
        Koordinator membuat token sekali pakai untuk memindahkan rekam siswa ke sekolah tujuan. Transfer hanya
        berlaku antar dua instansi demo di PPI-Link dan tidak terhubung ke Dapodik — tidak ada integrasi resmi
        dengan sistem mana pun.
      </p>

      {galatMuat && (
        <p className="pesan pesan-galat" role="alert">
          {galatMuat}
        </p>
      )}

      <section className="kartu" aria-labelledby="judul-buat">
        <h2 id="judul-buat">1. Buat token transfer</h2>
        {memuat ? (
          <p className="hint">Memuat daftar siswa dan sekolah…</p>
        ) : (
          <>
            <div>
              <label htmlFor="pilih-siswa">Siswa</label>
              <select id="pilih-siswa" value={siswaId} onChange={(e) => setSiswaId(e.target.value)}>
                <option value="">— pilih siswa —</option>
                {siswa.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.kode} — {s.inisial} ({s.kelas}, {namaSekolah(s.school_id)})
                  </option>
                ))}
              </select>
            </div>

            {siswaId && memuatConsent && <p className="hint">Memeriksa persetujuan wali…</p>}

            {siswaId && galatConsent && (
              <p className="pesan pesan-galat" role="alert">
                Persetujuan gagal diperiksa. {galatConsent}
              </p>
            )}

            {siswaId && !memuatConsent && !galatConsent && consent && !adaConsentAktif(consent) && (
              <p className="pesan pesan-peringatan" role="status">
                Transfer menunggu persetujuan orang tua. Belum ada persetujuan berbagi rekam yang aktif untuk
                siswa ini, jadi token belum bisa dibuat. Minta wali memberi persetujuan lebih dulu, atau tunggu
                persetujuan sebelumnya masih berlaku.
              </p>
            )}

            {siswaId && !memuatConsent && !galatConsent && consent && adaConsentAktif(consent) && (
              <p className="pesan pesan-berhasil" role="status">
                Persetujuan wali aktif. Token transfer boleh dibuat.
              </p>
            )}

            <div>
              <label htmlFor="pilih-tujuan">Sekolah tujuan</label>
              <select
                id="pilih-tujuan"
                value={keSchoolId}
                onChange={(e) => setKeSchoolId(e.target.value)}
                disabled={!siswaId}
              >
                <option value="">— pilih sekolah tujuan —</option>
                {sekolahTujuan.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama} ({s.kode_instansi})
                  </option>
                ))}
              </select>
              <p className="hint">
                Sekolah asal siswa tidak muncul di daftar ini: rekam hanya dikirim ke instansi lain.
              </p>
            </div>

            <fieldset style={{ border: 0, padding: 0, margin: '0 0 0.5rem' }}>
              <legend style={{ fontWeight: 600, padding: 0 }}>Masa berlaku token</legend>
              <p className="hint" id="hint-masa">
                Token otomatis tidak berlaku lagi setelah masa ini lewat, meskipun belum dipakai.
              </p>
              {MASA_BERLAKU.map((p) => (
                <label className="pilihan" key={p.jam}>
                  <input
                    type="radio"
                    name="masa-berlaku"
                    value={p.jam}
                    checked={jam === p.jam}
                    onChange={() => setJam(p.jam)}
                    aria-describedby="hint-masa"
                  />
                  <span className="pilihan-teks">{p.label}</span>
                </label>
              ))}
            </fieldset>

            <div className="baris">
              <button type="button" onClick={buat} disabled={!bolehBuat || sedangBuat}>
                {sedangBuat ? 'Membuat token…' : 'Buat token'}
              </button>
              {!siswaId && <span className="hint">Pilih siswa lebih dulu.</span>}
            </div>

            {galatBuat && (
              <p className="pesan pesan-galat" role="alert">
                {galatBuat}
              </p>
            )}
          </>
        )}

        {hasil && (
          <div className="pesan pesan-berhasil" role="status">
            <h3>Token transfer dibuat</h3>
            <p>
              <strong>Perhatian:</strong> token ini hanya tampil sekarang, sekali saja. Salin atau catat sebelum
              meninggalkan halaman — setelah halaman ditutup, token tidak bisa ditampilkan lagi. Token juga
              hanya bisa dipakai satu kali oleh sekolah tujuan.
            </p>
            <p className="bisa-digulir">
              <code style={{ fontSize: '1.1rem', wordBreak: 'break-all' }}>{hasil.token}</code>
            </p>
            <p>
              Kedaluwarsa: <strong>{waktu(hasil.kedaluwarsa)}</strong>
            </p>
            <div className="baris">
              <button type="button" className="tombol-sekunder tombol-kecil" onClick={salinToken}>
                Salin token
              </button>
              <button
                type="button"
                className="tombol-sekunder tombol-kecil"
                onClick={unduhRekamDenganToken}
                disabled={sedangUnduh}
              >
                {sedangUnduh ? 'Mengunduh…' : 'Unduh rekam dengan token ini'}
              </button>
            </div>
            <p className="hint">
              Mengunduh rekam dengan token ini juga menandai token sudah terpakai dan hangus.
            </p>
            {statusSalin && (
              <p className="hint" role="status">
                {statusSalin}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="kartu" aria-labelledby="judul-ambil">
        <h2 id="judul-ambil">2. Ambil rekam di sekolah tujuan</h2>
        <p className="hint">
          Bagian ini dipakai petugas sekolah tujuan. Token dari sekolah asal cukup ditempel di sini; petugas
          tidak perlu akun PPI-Link sekolah asal.
        </p>
        <div>
          <label htmlFor="input-token">Token transfer</label>
          <input
            id="input-token"
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="baris">
          <button type="button" onClick={ambil} disabled={!token.trim() || sedangAmbil}>
            {sedangAmbil ? 'Mengambil rekam…' : 'Ambil rekam'}
          </button>
        </div>

        {galatAmbil && (
          <p className="pesan pesan-galat" role="alert">
            <strong>{galatAmbil.teks}</strong> {galatAmbil.saran}
          </p>
        )}

        {hasilAmbil !== null && (
          <div>
            <p className="pesan pesan-berhasil" role="status">
              Rekam berhasil diambil. Token sekarang sudah terpakai dan tidak bisa dipakai lagi.
            </p>
            <pre
              className="bisa-digulir"
              style={{ border: '1px solid var(--garis)', padding: '0.75rem', maxHeight: '28rem' }}
            >
              {JSON.stringify(hasilAmbil, null, 2)}
            </pre>
            <button
              type="button"
              className="tombol-sekunder tombol-kecil"
              onClick={() => unduhJson(hasilAmbil, `rekam-${token.trim().slice(0, 8) || 'token'}.json`)}
            >
              Unduh rekam sebagai JSON
            </button>
          </div>
        )}
      </section>

      <section className="kartu" aria-labelledby="judul-riwayat">
        <div className="baris renggang">
          <h2 id="judul-riwayat">3. Riwayat transfer</h2>
          <button type="button" className="tombol-sekunder tombol-kecil" onClick={muatRiwayat}>
            Muat ulang
          </button>
        </div>
        {galatRiwayat && (
          <p className="pesan pesan-galat" role="alert">
            {galatRiwayat}
          </p>
        )}
        {riwayat.length === 0 ? (
          <p className="hint">Belum ada transfer tercatat.</p>
        ) : (
          <div className="bisa-digulir">
            <table>
              <caption>Token transfer yang pernah dibuat, terbaru lebih dulu</caption>
              <thead>
                <tr>
                  <th scope="col">Siswa</th>
                  <th scope="col">Ke sekolah</th>
                  <th scope="col">Dibuat</th>
                  <th scope="col">Kedaluwarsa</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {riwayat.map((r) => {
                  const s = siswa.find((x) => x.id === r.student_id);
                  return (
                    <tr key={r.id}>
                      <td>{s ? `${s.kode} — ${s.inisial}` : r.student_id}</td>
                      <td>{namaSekolah(r.ke_school)}</td>
                      <td>{waktu(r.dibuat_pada)}</td>
                      <td>{waktu(r.kedaluwarsa)}</td>
                      <td>
                        <span className="lencana">{r.dipakai_pada ? 'Sudah dipakai' : 'Belum dipakai'}</span>{' '}
                        <span className="hint">
                          {r.dipakai_pada ? `diambil ${waktu(r.dipakai_pada)}` : 'menunggu diambil'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="hint">
          Token aslinya tidak disimpan di basis data, hanya sidik SHA-256-nya, sehingga token lama tidak bisa
          ditampilkan lagi di halaman ini.
        </p>
      </section>
    </div>
  );
}
