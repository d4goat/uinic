/**
 * F4 + F5 — inti PPI-Link.
 * Setiap saran akomodasi wajib tampil bersama alasan, tingkat bukti, dan peninjau
 * dari tabel aturan; guru menyetujui atau menolak. Setiap simpan menambah versi
 * baru — versi lama tidak pernah ditimpa, dan riwayatnya bisa dibuka/dibandingkan.
 */
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ambilPpi, catatAkses, saranPpi, simpanPpi, versiPpi } from '../../lib/api';
import type { Ppi, PpiSaran, PpiVersi, SaranAkomodasi, TingkatBukti } from '../../lib/types';

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/** Tanggal ISO -> "5 Maret 2026". Sengaja tanpa Date agar tanggal asesmen tidak bergeser. */
function tanggal(nilai: string | null): string {
  if (!nilai) return 'tidak tercatat';
  const pola = /^(\d{4})-(\d{2})-(\d{2})/.exec(nilai);
  if (!pola) return nilai;
  const bulan = BULAN[Number(pola[2]) - 1] ?? pola[2];
  return `${Number(pola[3])} ${bulan} ${pola[1]}`;
}

/** Tingkat bukti tampil sebagai lencana DAN teks — warna saja tidak cukup. */
function kelasBukti(t: TingkatBukti): string {
  if (t === 'kuat' || t === 'sedang-kuat') return 'lencana lencana-kuat';
  if (t === 'sedang') return 'lencana lencana-sedang';
  return 'lencana lencana-lemah';
}

const teksBukti = (t: TingkatBukti) => `Tingkat bukti: ${t.replace('-', ' sampai ')}`;

interface Kelompok {
  akomodasi: SaranAkomodasi;
  hambatan: string[];
  alasan: string[];
}

/** Satu akomodasi bisa datang dari beberapa hambatan: gabungkan, jangan tampilkan kembar. */
function kelompokkan(daftar: SaranAkomodasi[]): Kelompok[] {
  const peta = new Map<string, Kelompok>();
  for (const a of daftar) {
    const ada = peta.get(a.accommodation_id);
    if (!ada) {
      peta.set(a.accommodation_id, { akomodasi: a, hambatan: [a.dari_hambatan], alasan: [a.alasan] });
      continue;
    }
    if (!ada.hambatan.includes(a.dari_hambatan)) ada.hambatan.push(a.dari_hambatan);
    if (!ada.alasan.includes(a.alasan)) ada.alasan.push(a.alasan);
  }
  return [...peta.values()];
}

interface BarisTujuan {
  kunci: number;
  tujuan: string;
  indikator: string;
}

interface Ubah {
  tujuan: string;
  lama: string;
  baru: string;
}

/** Beda teks tingkat tujuan/indikator; bukan diff kata-per-kata. */
function hitungBeda(tua: BarisTujuan[], baru: BarisTujuan[]) {
  const inti = (t: { tujuan: string }) => t.tujuan.trim().toLowerCase();
  const petaTua = new Map(tua.map((t) => [inti(t), t]));
  const petaBaru = new Map(baru.map((t) => [inti(t), t]));
  const tambah: string[] = [];
  const hapus: string[] = [];
  const ubah: Ubah[] = [];

  for (const b of baru) {
    const t = petaTua.get(inti(b));
    if (!t) tambah.push(`${b.tujuan} — indikator: ${b.indikator}`);
    else if (t.indikator.trim() !== b.indikator.trim()) {
      ubah.push({ tujuan: b.tujuan, lama: t.indikator, baru: b.indikator });
    }
  }
  for (const t of tua) {
    if (!petaBaru.has(inti(t))) hapus.push(`${t.tujuan} — indikator: ${t.indikator}`);
  }
  return { tambah, hapus, ubah };
}

const pesanGalat = (e: unknown) =>
  e instanceof Error && e.message ? e.message : 'Terjadi kesalahan yang tidak diketahui.';

export default function PpiEditor() {
  const { id: siswaId = '' } = useParams<{ id: string }>();

  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [saran, setSaran] = useState<PpiSaran | null>(null);
  const [ppi, setPpi] = useState<Ppi | null>(null);
  const [versi, setVersi] = useState<PpiVersi[]>([]);

  const [ringkasan, setRingkasan] = useState('');
  const [tujuan, setTujuan] = useState<BarisTujuan[]>([]);
  const [keputusan, setKeputusan] = useState<Record<string, { disetujui: boolean; catatan: string }>>({});

  const [galatSimpan, setGalatSimpan] = useState<string | null>(null);
  const [pesanSukses, setPesanSukses] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);

  const [versiDibuka, setVersiDibuka] = useState<PpiVersi | null>(null);
  const [beda, setBeda] = useState<{ tua: number; baru: number; hasil: ReturnType<typeof hitungBeda> } | null>(null);

  const kunciBerikut = useRef(1);
  const buatBaris = (): BarisTujuan => ({ kunci: kunciBerikut.current++, tujuan: '', indikator: '' });

  function isiDariVersi(v?: PpiVersi) {
    if (!v) {
      setTujuan([buatBaris()]);
      return;
    }
    setRingkasan(v.ringkasan ?? '');
    setTujuan(
      v.ppi_goals.length
        ? v.ppi_goals.map((g) => ({ kunci: kunciBerikut.current++, tujuan: g.tujuan, indikator: g.indikator }))
        : [buatBaris()],
    );
    const awal: Record<string, { disetujui: boolean; catatan: string }> = {};
    for (const a of v.ppi_accommodations) {
      awal[a.accommodation_id] = { disetujui: a.disetujui, catatan: a.catatan ?? '' };
    }
    setKeputusan(awal);
  }

  useEffect(() => {
    let aktif = true;
    (async () => {
      setMemuat(true);
      setGalat(null);
      try {
        const s = await saranPpi(siswaId);
        if (!aktif) return;
        setSaran(s);
        void catatAkses('ppi_saran', siswaId, { sumber: 'PpiEditor' }).catch(() => {});
        if (!s.assessment) {
          setMemuat(false);
          return;
        }
        const p = await ambilPpi(siswaId);
        if (!aktif) return;
        setPpi(p);
        if (p) {
          const daftar = await versiPpi(p.id);
          if (!aktif) return;
          setVersi(daftar);
          isiDariVersi(daftar[0]); // prefill dari versi terbaru supaya isi lama tidak hilang
        } else {
          setTujuan([buatBaris()]);
        }
        setMemuat(false);
      } catch (e) {
        if (!aktif) return;
        setGalat(pesanGalat(e));
        setMemuat(false);
      }
    })();
    return () => {
      aktif = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siswaId]);

  // ponytail: default tiap saran = "Setujui" supaya simpan selalu punya keputusan;
  // jadikan tiga keadaan (belum dipilih) bila guru minta ditanyakan eksplisit.
  const pilihan = (id: string) => keputusan[id] ?? { disetujui: true, catatan: '' };

  const putuskan = (id: string, disetujui: boolean) =>
    setKeputusan((lama) => ({ ...lama, [id]: { disetujui, catatan: lama[id]?.catatan ?? '' } }));

  const ubahCatatan = (id: string, catatan: string) =>
    setKeputusan((lama) => ({
      ...lama,
      [id]: { disetujui: lama[id]?.disetujui ?? true, catatan },
    }));

  function bukaBeda(versiLama: PpiVersi) {
    const terbaru = versi[0];
    if (!terbaru) return;
    setVersiDibuka(null);
    setBeda({
      tua: versiLama.nomor_versi,
      baru: terbaru.nomor_versi,
      hasil: hitungBeda(
        versiLama.ppi_goals.map((g, i) => ({ kunci: i, tujuan: g.tujuan, indikator: g.indikator })),
        terbaru.ppi_goals.map((g, i) => ({ kunci: i, tujuan: g.tujuan, indikator: g.indikator })),
      ),
    });
  }

  async function simpan(e: FormEvent) {
    e.preventDefault();
    setGalatSimpan(null);
    setPesanSukses(null);
    setBeda(null);

    const bersih = tujuan.map((t) => ({ tujuan: t.tujuan.trim(), indikator: t.indikator.trim() }));
    if (bersih.length === 0) {
      setGalatSimpan('Tambahkan minimal satu tujuan beserta indikatornya sebelum menyimpan.');
      return;
    }
    const belumLengkap = bersih.findIndex((t) => !t.tujuan || !t.indikator);
    if (belumLengkap >= 0) {
      setGalatSimpan(`Baris tujuan ${belumLengkap + 1} belum lengkap: tujuan dan indikator keduanya wajib diisi.`);
      return;
    }

    setSibuk(true);
    try {
      await simpanPpi({
        studentId: siswaId,
        ppiId: ppi?.id ?? null,
        ringkasan,
        tujuan: bersih,
        akomodasi: kelompokkan(saran?.akomodasi ?? []).map((g) => {
          const id = g.akomodasi.accommodation_id;
          const k = pilihan(id);
          return {
            accommodation_id: id,
            disetujui: k.disetujui,
            catatan: k.catatan.trim() === '' ? null : k.catatan.trim(),
          };
        }),
      });

      const p = await ambilPpi(siswaId);
      if (p) {
        setPpi(p);
        const daftar = await versiPpi(p.id);
        setVersi(daftar);
        setPesanSukses(
          daftar.length
            ? `Tersimpan sebagai versi ${daftar[0].nomor_versi} pada ${tanggal(daftar[0].dibuat_pada)}. Versi sebelumnya tetap utuh di riwayat.`
            : 'Draf tersimpan sebagai versi baru.',
        );
      }
    } catch (err) {
      setGalatSimpan(`Gagal menyimpan draf PPI: ${pesanGalat(err)}`);
    } finally {
      setSibuk(false);
    }
  }

  if (memuat) return <p className="pesan">Memuat saran akomodasi…</p>;

  if (galat) {
    return (
      <>
        <h1>Draf PPI</h1>
        <p className="pesan pesan-galat" role="alert">{galat}</p>
        <p><Link to="/siswa">Kembali ke daftar siswa</Link></p>
      </>
    );
  }

  if (!saran || !saran.student) {
    return (
      <>
        <h1>Draf PPI</h1>
        <p className="pesan pesan-galat" role="alert">Data siswa tidak ditemukan.</p>
        <p><Link to="/siswa">Kembali ke daftar siswa</Link></p>
      </>
    );
  }

  const siswa = saran.student;

  if (!saran.assessment) {
    return (
      <>
        <h1>Draf PPI: {siswa.kode} ({siswa.inisial})</h1>
        <p className="lede">Kelas {siswa.kelas}, lahir tahun {siswa.tahun_lahir}.</p>
        <p className="pesan pesan-peringatan" role="status">
          Belum ada asesmen hambatan untuk siswa ini. Saran akomodasi dihitung dari asesmen
          terakhir, jadi isi asesmen lebih dulu.
        </p>
        <p><Link className="tombol" to={`/siswa/${siswaId}/asesmen`}>Isi asesmen hambatan</Link></p>
      </>
    );
  }

  const kelompok = kelompokkan(saran.akomodasi);
  const jumlahSetuju = kelompok.filter((g) => pilihan(g.akomodasi.accommodation_id).disetujui).length;

  return (
    <>
      <h1>Draf PPI: {siswa.kode} ({siswa.inisial})</h1>
      <p className="lede">
        Kelas {siswa.kelas}, lahir tahun {siswa.tahun_lahir}. Asesmen terakhir {tanggal(saran.assessment.tanggal)}.
        {ppi ? ` Versi aktif PPI: ${ppi.versi_aktif}.` : ' Belum ada draf PPI tersimpan.'}
      </p>

      <form onSubmit={simpan} noValidate>
        <h2>Saran akomodasi dari aturan</h2>
        <p className="pesan pesan-peringatan">
          Saran ini berasal dari tabel aturan yang ditinjau manusia, bukan diagnosis. Guru boleh
          menolak saran mana pun; keputusan guru yang berlaku.
        </p>
        <p className="hint">
          {saran.hambatan.length} hambatan terpilih menghasilkan {kelompok.length} saran akomodasi.
          {saran.assessment.catatan ? ` Catatan asesmen: ${saran.assessment.catatan}` : ''}
        </p>

        {kelompok.length === 0 ? (
          <p className="pesan">
            Tidak ada aturan yang cocok untuk hambatan pada asesmen terakhir. Anda masih bisa
            menyimpan tujuan dan ringkasan PPI di bawah.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {kelompok.map((g) => {
              const a = g.akomodasi;
              const id = a.accommodation_id;
              const k = pilihan(id);
              const idc = `akomodasi-${id}`;
              return (
                <li key={id} className="kartu">
                  <h3 id={`${idc}-judul`} style={{ marginTop: 0 }}>{a.nama}</h3>
                  <p className="hint" style={{ marginBottom: '0.35rem' }}>
                    Dari hambatan: {g.hambatan.join('; ')}.
                    {a.sumber ? ` Sumber: ${a.sumber}.` : ''}
                  </p>
                  {a.deskripsi && <p style={{ marginBottom: '0.35rem' }}>{a.deskripsi}</p>}
                  {g.alasan.map((alasan, i) => (
                    <p key={i} style={{ marginBottom: '0.35rem' }}>
                      <strong>Alasan:</strong> {alasan}
                    </p>
                  ))}
                  <p className="baris" style={{ marginBottom: '0.5rem' }}>
                    <span className={kelasBukti(a.tingkat_bukti)}>{teksBukti(a.tingkat_bukti)}</span>
                    <span className="hint" style={{ margin: 0 }}>
                      Ditinjau oleh {a.ditinjau_oleh} pada {tanggal(a.tanggal_tinjau)}
                    </span>
                  </p>

                  <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                    <legend style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Keputusan guru</legend>
                    <div className="baris">
                      <label className="inline" htmlFor={`${idc}-setuju`}>
                        <input
                          type="radio"
                          id={`${idc}-setuju`}
                          name={idc}
                          checked={k.disetujui}
                          onChange={() => putuskan(id, true)}
                        />
                        Setujui
                      </label>
                      <label className="inline" htmlFor={`${idc}-tolak`}>
                        <input
                          type="radio"
                          id={`${idc}-tolak`}
                          name={idc}
                          checked={!k.disetujui}
                          onChange={() => putuskan(id, false)}
                        />
                        Tolak
                      </label>
                    </div>
                  </fieldset>

                  <p style={{ margin: '0.5rem 0 0' }}>
                    <label htmlFor={`${idc}-catatan`}>Catatan guru untuk saran ini (opsional)</label>
                    <input
                      id={`${idc}-catatan`}
                      value={k.catatan}
                      maxLength={300}
                      onChange={(e) => ubahCatatan(id, e.target.value)}
                    />
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        <h2>Tujuan dan indikator</h2>
        <p className="hint">
          Tiap baris wajib punya tujuan dan indikator terukur. Baris yang belum lengkap akan
          ditolak saat menyimpan.
        </p>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {tujuan.map((t, i) => (
            <li key={t.kunci} className="kartu">
              <p>
                <label htmlFor={`tujuan-${t.kunci}`}>Tujuan {i + 1}</label>
                <input
                  id={`tujuan-${t.kunci}`}
                  value={t.tujuan}
                  onChange={(e) =>
                    setTujuan((lama) =>
                      lama.map((b) => (b.kunci === t.kunci ? { ...b, tujuan: e.target.value } : b)),
                    )
                  }
                />
              </p>
              <p>
                <label htmlFor={`indikator-${t.kunci}`}>Indikator {i + 1}</label>
                <input
                  id={`indikator-${t.kunci}`}
                  value={t.indikator}
                  onChange={(e) =>
                    setTujuan((lama) =>
                      lama.map((b) => (b.kunci === t.kunci ? { ...b, indikator: e.target.value } : b)),
                    )
                  }
                />
              </p>
              <button
                type="button"
                className="tombol-sekunder tombol-kecil"
                onClick={() => setTujuan((lama) => lama.filter((b) => b.kunci !== t.kunci))}
              >
                Hapus baris {i + 1}
              </button>
            </li>
          ))}
        </ul>
        <p>
          <button
            type="button"
            className="tombol-sekunder"
            onClick={() => setTujuan((lama) => [...lama, buatBaris()])}
          >
            Tambah tujuan
          </button>
        </p>

        <h2>Ringkasan PPI</h2>
        <p>
          <label htmlFor="ringkasan">Ringkasan singkat untuk guru, GPK, dan orang tua</label>
          <textarea
            id="ringkasan"
            value={ringkasan}
            onChange={(e) => setRingkasan(e.target.value)}
            rows={5}
          />
        </p>

        {galatSimpan && <p className="pesan pesan-galat" role="alert">{galatSimpan}</p>}
        {pesanSukses && <p className="pesan pesan-berhasil" role="status">{pesanSukses}</p>}

        <p className="baris">
          <button type="submit" disabled={sibuk}>
            {sibuk ? 'Menyimpan…' : 'Simpan sebagai versi baru'}
          </button>
          <span className="hint" style={{ margin: 0 }}>
            {jumlahSetuju} dari {kelompok.length} saran disetujui. Versi lama tidak akan diubah.
          </span>
        </p>
      </form>

      {ppi && (
        <p>
          <Link className="tombol tombol-sekunder" to={`/ppi/${ppi.id}/sesi`}>
            Catat sesi pendampingan
          </Link>
        </p>
      )}

      <h2>Riwayat versi</h2>
      {versi.length === 0 ? (
        <p className="hint">Belum ada versi tersimpan untuk siswa ini.</p>
      ) : (
        <div className="bisa-digulir">
          <table>
            <caption>Riwayat versi draf PPI — {versi.length} versi, terbaru di atas</caption>
            <thead>
              <tr>
                <th scope="col">Versi</th>
                <th scope="col">Dibuat</th>
                <th scope="col">Ringkasan</th>
                <th scope="col">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {versi.map((v, i) => (
                <tr key={v.id}>
                  <th scope="row">
                    Versi {v.nomor_versi}
                    {i === 0 ? ' (terbaru)' : ''}
                  </th>
                  <td>{tanggal(v.dibuat_pada)}</td>
                  <td>{v.ringkasan?.trim() ? v.ringkasan : <em>tanpa ringkasan</em>}</td>
                  <td>
                    <div className="baris">
                      <button
                        type="button"
                        className="tombol-sekunder tombol-kecil"
                        aria-expanded={versiDibuka?.id === v.id}
                        onClick={() => {
                          setBeda(null);
                          setVersiDibuka((lama) => (lama?.id === v.id ? null : v));
                        }}
                      >
                        {versiDibuka?.id === v.id ? `Tutup versi ${v.nomor_versi}` : `Buka versi ${v.nomor_versi}`}
                      </button>
                      {i > 0 && (
                        <button
                          type="button"
                          className="tombol-sekunder tombol-kecil"
                          onClick={() => bukaBeda(v)}
                        >
                          Bandingkan dengan versi terbaru
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {versiDibuka && (
        <section className="kartu" aria-labelledby="isi-versi">
          <h3 id="isi-versi" style={{ marginTop: 0 }}>Isi versi {versiDibuka.nomor_versi}</h3>
          <p className="hint">
            Dibuat {tanggal(versiDibuka.dibuat_pada)}
            {versiDibuka.id === versi[0]?.id ? ' — versi terbaru.' : '.'}
          </p>
          <p>
            <strong>Ringkasan:</strong> {versiDibuka.ringkasan?.trim() || 'tanpa ringkasan'}
          </p>

          <h4>Tujuan dan indikator</h4>
          {versiDibuka.ppi_goals.length === 0 ? (
            <p className="hint">Versi ini tidak memuat tujuan.</p>
          ) : (
            <div className="bisa-digulir">
              <table>
                <caption>Tujuan dan indikator pada versi {versiDibuka.nomor_versi}</caption>
                <thead>
                  <tr>
                    <th scope="col">Tujuan</th>
                    <th scope="col">Indikator</th>
                  </tr>
                </thead>
                <tbody>
                  {versiDibuka.ppi_goals.map((g) => (
                    <tr key={g.id}>
                      <td>{g.tujuan}</td>
                      <td>{g.indikator}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h4>Akomodasi</h4>
          {versiDibuka.ppi_accommodations.length === 0 ? (
            <p className="hint">Versi ini tidak memuat akomodasi.</p>
          ) : (
            <div className="bisa-digulir">
              <table>
                <caption>Akomodasi pada versi {versiDibuka.nomor_versi}</caption>
                <thead>
                  <tr>
                    <th scope="col">Akomodasi</th>
                    <th scope="col">Tingkat bukti</th>
                    <th scope="col">Status</th>
                    <th scope="col">Catatan guru</th>
                  </tr>
                </thead>
                <tbody>
                  {versiDibuka.ppi_accommodations.map((a) => (
                    <tr key={a.accommodation_id}>
                      <td>{a.accommodations?.nama ?? a.accommodation_id}</td>
                      <td>{a.accommodations ? teksBukti(a.accommodations.tingkat_bukti) : 'tidak diketahui'}</td>
                      <td>{a.disetujui ? 'Disetujui' : 'Ditolak'}</td>
                      <td>{a.catatan?.trim() || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {beda && versi[0] && (
        <section className="kartu" aria-labelledby="judul-beda">
          <h3 id="judul-beda" style={{ marginTop: 0 }}>
            Perbandingan versi {beda.tua} dengan versi {beda.baru}
          </h3>
          {beda.hasil.tambah.length + beda.hasil.hapus.length + beda.hasil.ubah.length === 0 ? (
            <p className="hint">Tujuan dan indikator tidak berubah antara kedua versi.</p>
          ) : (
            <>
              <h4 style={{ marginBottom: '0.25rem' }}>Ditambah</h4>
              {beda.hasil.tambah.length === 0 ? (
                <p className="hint">Tidak ada tujuan yang ditambah.</p>
              ) : (
                <ul>
                  {beda.hasil.tambah.map((t) => (
                    <li key={`+${t}`}>+ {t}</li>
                  ))}
                </ul>
              )}

              <h4 style={{ marginBottom: '0.25rem' }}>Dihapus</h4>
              {beda.hasil.hapus.length === 0 ? (
                <p className="hint">Tidak ada tujuan yang dihapus.</p>
              ) : (
                <ul>
                  {beda.hasil.hapus.map((t) => (
                    <li key={`-${t}`}>- {t}</li>
                  ))}
                </ul>
              )}

              <h4 style={{ marginBottom: '0.25rem' }}>Diubah</h4>
              {beda.hasil.ubah.length === 0 ? (
                <p className="hint">Tidak ada indikator yang diubah.</p>
              ) : (
                <ul>
                  {beda.hasil.ubah.map((u) => (
                    <li key={`~${u.tujuan}`}>
                      - {u.tujuan} — indikator: {u.lama}
                      <br />+ {u.tujuan} — indikator: {u.baru}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      )}

      <p className="hint">
        <Link to={`/siswa/${siswaId}/asesmen`}>Lihat atau perbarui asesmen hambatan</Link>
        {' · '}
        <Link to="/siswa">Daftar siswa</Link>
      </p>
    </>
  );
}
