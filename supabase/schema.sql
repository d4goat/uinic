-- ============================================================================
-- PPI-Link — skema P0 (UINIC 8.0)
-- Jalankan di Supabase SQL Editor, urutan: schema.sql -> seed.sql.
--
-- Prinsip desain (satu sumber otorisasi):
--   * RBAC  = RLS policy, bukan kode klien. Klien tidak bisa melewatinya.
--   * Validasi = constraint (CHECK/UNIQUE/FK), bukan validasi app.
--   * Audit (F12) = trigger generik, tidak ada kode app yang perlu ingat mencatat.
--   * Aksi multi-tabel (draf PPI, transfer, sesi) = RPC security definer, atomik.
--   * Catatan sensitif = pgcrypto pgp_sym_encrypt; kunci hidup di tabel
--     app_secrets yang tidak punya policy RLS sama sekali -> hanya fungsi
--     definer yang bisa membacanya.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- enum ------
create type user_role        as enum ('guru','gpk','koordinator','orang_tua','admin');
create type capaian_status   as enum ('belum','sebagian','tercapai');
create type barrier_tingkat  as enum ('ringan','sedang','berat');
create type bukti_tingkat    as enum ('lemah','lemah-sedang','sedang','sedang-kuat','kuat');
create type consent_jenis    as enum ('berbagi_rekam','partisipasi');
create type consent_status   as enum ('menunggu','disetujui','ditolak','dicabut');
create type ppi_status       as enum ('draf','aktif','diarsipkan');
create type varian_jenis     as enum ('teks_besar','kalimat_pendek','bacakan');

-- --------------------------------------------------------------- tabel ------
create table schools (
  id            uuid primary key default gen_random_uuid(),
  nama          text not null,
  kode_instansi text not null unique,
  dibuat_pada   timestamptz not null default now()
);

-- PRD menyebut tabel `users`; di Supabase identitas auth tinggal di auth.users,
-- jadi profil + role + school_id disimpan di sini (1-1 dengan auth.users).
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  school_id  uuid references schools(id) on delete restrict,
  nama       text not null,
  email      text not null,
  role       user_role not null,
  dibuat_pada timestamptz not null default now(),
  -- hanya admin sistem yang tidak terikat satu sekolah
  constraint staf_punya_sekolah check (role = 'admin' or school_id is not null)
);
create index profiles_school_idx on profiles(school_id);

-- F2: pseudonim. Tidak ada kolom NIK/nama lengkap siswa; `inisial` maks 3 huruf.
create table students (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  kode        text not null,
  inisial     text not null,
  tahun_lahir int  not null,
  kelas       text not null,
  dibuat_pada timestamptz not null default now(),
  unique (school_id, kode),
  constraint kode_format      check (kode ~ '^[A-Z0-9-]{3,12}$'),
  constraint inisial_pendek   check (inisial ~ '^[A-Z]{1,3}$'),
  constraint tahun_wajar      check (tahun_lahir between 1990 and extract(year from now())::int)
);
create index students_school_idx on students(school_id);

create table guardian_links (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  hubungan   text not null default 'wali',
  unique (student_id, user_id)
);
create index guardian_links_user_idx on guardian_links(user_id);

-- ------------------------------------------------- tabel referensi (§8) ----
create table barriers (
  id        uuid primary key default gen_random_uuid(),
  kode      text not null unique,
  nama      text not null,
  deskripsi text
);

create table accommodations (
  id           uuid primary key default gen_random_uuid(),
  kode         text not null unique,
  nama         text not null,
  deskripsi    text,
  tingkat_bukti bukti_tingkat not null default 'sedang',
  sumber       text
);

-- Tabel aturan inilah "transparansi" PPI-Link: setiap saran akomodasi membawa
-- alasan + tingkat bukti + sumber, dan ditinjau oleh orang nyata (kolom di bawah).
create table barrier_accommodation_rules (
  barrier_id       uuid not null references barriers(id) on delete cascade,
  accommodation_id uuid not null references accommodations(id) on delete cascade,
  alasan           text not null,
  ditinjau_oleh    text not null,
  tanggal_tinjau   date not null default current_date,
  primary key (barrier_id, accommodation_id)
);

-- ----------------------------------------------------------- asesmen --------
create table assessments (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references students(id) on delete cascade,
  dibuat_oleh uuid not null references auth.users(id) on delete restrict,
  tanggal     timestamptz not null default now(),
  catatan_enc bytea           -- pgp_sym_encrypt, lihat rpc_assessment_save()
);

create table assessment_barriers (
  assessment_id uuid not null references assessments(id) on delete cascade,
  barrier_id    uuid not null references barriers(id) on delete restrict,
  tingkat       barrier_tingkat not null default 'sedang',
  primary key (assessment_id, barrier_id)
);

-- --------------------------------------------------------------- PPI --------
create table ppis (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references students(id) on delete cascade,
  status      ppi_status not null default 'draf',
  versi_aktif int not null default 1,
  unique (student_id)
);

create table ppi_versions (
  id           uuid primary key default gen_random_uuid(),
  ppi_id       uuid not null references ppis(id) on delete cascade,
  nomor_versi  int  not null,
  dibuat_oleh  uuid not null references auth.users(id) on delete restrict,
  ringkasan    text,
  dibuat_pada  timestamptz not null default now(),
  unique (ppi_id, nomor_versi)
);

create table ppi_goals (
  id             uuid primary key default gen_random_uuid(),
  ppi_version_id uuid not null references ppi_versions(id) on delete cascade,
  tujuan         text not null,
  indikator      text not null
);
create index ppi_goals_version_idx on ppi_goals(ppi_version_id);

create table ppi_accommodations (
  ppi_version_id   uuid not null references ppi_versions(id) on delete cascade,
  accommodation_id uuid not null references accommodations(id) on delete restrict,
  disetujui        boolean not null default false,
  catatan          text,
  primary key (ppi_version_id, accommodation_id)
);

-- F6: client_uuid membuat pengisian offline idempoten (kirim ulang = abaikan).
create table sessions (
  id             uuid primary key default gen_random_uuid(),
  ppi_id         uuid not null references ppis(id) on delete cascade,
  goal_id        uuid references ppi_goals(id) on delete set null,
  tanggal        date not null default current_date,
  status_capaian capaian_status not null,
  catatan_enc    bytea,
  client_uuid    uuid not null unique,
  dibuat_oleh    uuid not null references auth.users(id) on delete restrict,
  dibuat_pada    timestamptz not null default now()
);
create index sessions_ppi_idx on sessions(ppi_id, tanggal desc);

-- ------------------------------------------------------ materi aksesibel ----
create table materials (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  judul       text not null,
  teks_sumber text not null,
  dibuat_oleh uuid not null references auth.users(id) on delete restrict,
  dibuat_pada timestamptz not null default now()
);

create table material_variants (
  id          uuid primary key default gen_random_uuid(),
  material_id uuid not null references materials(id) on delete cascade,
  jenis       varian_jenis not null,
  teks        text,
  unique (material_id, jenis)
);

-- --------------------------------------------------------- persetujuan -----
create table consents (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references students(id) on delete cascade,
  jenis          consent_jenis  not null,
  diberikan_oleh uuid not null references auth.users(id) on delete restrict,
  status         consent_status not null default 'menunggu',
  berlaku_hingga timestamptz,
  dibuat_pada    timestamptz not null default now()
);
create index consents_student_idx on consents(student_id, jenis, status);

create table transfers (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references students(id) on delete cascade,
  dari_school  uuid not null references schools(id) on delete restrict,
  ke_school    uuid not null references schools(id) on delete restrict,
  consent_id   uuid not null references consents(id) on delete restrict,
  token_hash   bytea not null unique,
  kedaluwarsa  timestamptz not null,
  dipakai_pada timestamptz,
  dibuat_oleh  uuid not null references auth.users(id) on delete restrict,
  dibuat_pada  timestamptz not null default now()
);

-- F12: setiap baca/ubah data siswa tercatat. user_id null = akses lewat token.
create table audit_logs (
  id      bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  aksi    text not null,      -- select | insert | update | delete | rpc:<nama>
  objek   text not null,      -- nama tabel
  objek_id text,
  keterangan jsonb,
  ip      inet,
  waktu   timestamptz not null default now()
);
create index audit_logs_waktu_idx on audit_logs(waktu desc);

-- Kunci enkripsi: teks hex (64 karakter = 256 bit), bukan bytea, karena
-- pgp_sym_encrypt/pgp_sym_decrypt menerima kunci bertipe text.
-- TIDAK ada policy RLS dan TIDAK ada grant -> hanya fungsi security definer
-- (baca: pemilik tabel) yang bisa menyentuhnya.
create table app_secrets (
  id    text primary key,
  kunci text not null
);
insert into app_secrets(id, kunci)
values ('catatan', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (id) do nothing;

alter table app_secrets enable row level security;
revoke all on app_secrets from anon, authenticated;

-- ========================================================================
-- Helper otorisasi. security definer supaya tidak rekursi ke RLS profiles.
-- ========================================================================
create or replace function fn_role() returns user_role
language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;

create or replace function fn_school() returns uuid
language sql stable security definer set search_path = public as
$$ select school_id from profiles where id = auth.uid() $$;

create or replace function fn_kunci() returns text
language sql stable security definer set search_path = public as
$$ select kunci from app_secrets where id = 'catatan' $$;

-- Dekripsi catatan. Aman karena barisnya sendiri tetap dijaga RLS: tanpa hak
-- SELECT atas baris, ciphertext-nya tidak pernah bisa diperoleh pemanggil.
create or replace function fn_dec(p bytea) returns text
language sql stable security definer set search_path = public, extensions as
$$ select case when p is null then null else extensions.pgp_sym_decrypt(p, fn_kunci()) end $$;

create or replace function fn_enc(p text) returns bytea
language sql stable security definer set search_path = public, extensions as
$$ select case when p is null then null else extensions.pgp_sym_encrypt(p, fn_kunci()) end $$;

-- Staf sekolah (guru/gpk/koordinator) yang mengurus siswa tertentu.
create or replace function fn_boleh_student(p_student uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (
     select 1 from students s
     where s.id = p_student
       and (fn_role() = 'admin' or s.school_id = fn_school())
   ) $$;

-- Orang tua/wali yang tertaut ke siswa tertentu.
create or replace function fn_boleh_wali(p_student uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (
     select 1 from guardian_links g
     where g.student_id = p_student and g.user_id = auth.uid()
   ) $$;

-- ============================================================ audit (F12) ==
create or replace function fn_audit() returns trigger
language plpgsql security definer set search_path = public as
$$
declare
  v_ip inet;
  v_id text;
begin
  begin
    v_ip := nullif(split_part(
              coalesce(current_setting('request.headers', true), '{}')::json ->> 'x-forwarded-for',
              ',', 1), '')::inet;
  exception when others then v_ip := null;
  end;
  begin
    v_id := coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id');
  exception when others then v_id := null;
  end;

  insert into audit_logs(user_id, aksi, objek, objek_id, ip, keterangan)
  values (auth.uid(), lower(tg_op), tg_table_name, v_id, v_ip,
          jsonb_build_object('schema', tg_table_schema));
  return case when tg_op = 'DELETE' then old else new end;
end $$;

-- Tabel yang memuat data siswa -> semua perubahan + (via view) pembacaan tercatat.
do $$
declare t text;
begin
  foreach t in array array['students','guardian_links','assessments','assessment_barriers',
                           'ppis','ppi_versions','ppi_goals','ppi_accommodations',
                           'sessions','consents','transfers','materials','material_variants']
  loop
    execute format('create trigger trg_audit after insert or update or delete on %I
                    for each row execute function fn_audit()', t);
  end loop;
end $$;

-- =============================================================== RLS ======
alter table schools              enable row level security;
alter table profiles             enable row level security;
alter table students             enable row level security;
alter table guardian_links       enable row level security;
alter table barriers             enable row level security;
alter table accommodations       enable row level security;
alter table barrier_accommodation_rules enable row level security;
alter table assessments          enable row level security;
alter table assessment_barriers  enable row level security;
alter table ppis                 enable row level security;
alter table ppi_versions         enable row level security;
alter table ppi_goals            enable row level security;
alter table ppi_accommodations   enable row level security;
alter table sessions             enable row level security;
alter table materials            enable row level security;
alter table material_variants    enable row level security;
alter table consents             enable row level security;
alter table transfers            enable row level security;
alter table audit_logs           enable row level security;

-- schools: baca sekolah sendiri (admin: semua). Tulis = admin.
create policy schools_read on schools for select to authenticated
  using (fn_role() = 'admin' or id = fn_school());
create policy schools_admin_write on schools for all to authenticated
  using (fn_role() = 'admin') with check (fn_role() = 'admin');

-- profiles: diri sendiri + rekan satu sekolah; hanya bisa ubah profil sendiri.
create policy profiles_self_read on profiles for select to authenticated
  using (id = auth.uid() or fn_role() = 'admin' or school_id = fn_school());
create policy profiles_self_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = fn_role());
create policy profiles_admin_all on profiles for all to authenticated
  using (fn_role() = 'admin') with check (fn_role() = 'admin');

-- students (F2): staf sekolah sendiri; wali hanya anak yang tertaut; admin semua.
create policy students_read on students for select to authenticated
  using (fn_role() = 'admin' or school_id = fn_school() or fn_boleh_wali(id));
create policy students_staff_write on students for all to authenticated
  using (fn_role() in ('guru','gpk','koordinator') and school_id = fn_school())
  with check (fn_role() in ('guru','gpk','koordinator') and school_id = fn_school());

-- guardian_links: staf sekolah siswa; wali melihat tautannya sendiri.
create policy guardian_links_read on guardian_links for select to authenticated
  using (user_id = auth.uid() or fn_boleh_student(student_id));
create policy guardian_links_staff_write on guardian_links for all to authenticated
  using (fn_role() in ('guru','gpk','koordinator') and fn_boleh_student(student_id))
  with check (fn_role() in ('guru','gpk','koordinator') and fn_boleh_student(student_id));

-- Tabel referensi: semua pengguna login boleh baca, hanya admin boleh ubah.
create policy barriers_read on barriers for select to authenticated using (true);
create policy barriers_admin on barriers for all to authenticated
  using (fn_role() = 'admin') with check (fn_role() = 'admin');
create policy accommodations_read on accommodations for select to authenticated using (true);
create policy accommodations_admin on accommodations for all to authenticated
  using (fn_role() = 'admin') with check (fn_role() = 'admin');
create policy rules_read on barrier_accommodation_rules for select to authenticated using (true);
create policy rules_admin on barrier_accommodation_rules for all to authenticated
  using (fn_role() = 'admin') with check (fn_role() = 'admin');

-- assessments + barrier: staf sekolah (wali tidak melihat asesmen mentah).
create policy assessments_read on assessments for select to authenticated
  using (fn_boleh_student(student_id));
create policy assessments_write on assessments for all to authenticated
  using (fn_role() in ('guru','gpk') and fn_boleh_student(student_id))
  with check (fn_role() in ('guru','gpk') and fn_boleh_student(student_id));
create policy ab_read on assessment_barriers for select to authenticated
  using (exists (select 1 from assessments a where a.id = assessment_id));
create policy ab_write on assessment_barriers for all to authenticated
  using (fn_role() in ('guru','gpk') and exists (
           select 1 from assessments a where a.id = assessment_id))
  with check (fn_role() in ('guru','gpk') and exists (
           select 1 from assessments a where a.id = assessment_id));

-- PPI: baca untuk staf sekolah + wali (F7 baca-saja); tulis hanya guru/gpk.
create policy ppis_read on ppis for select to authenticated
  using (fn_boleh_student(student_id));
create policy ppis_write on ppis for all to authenticated
  using (fn_role() in ('guru','gpk') and fn_boleh_student(student_id))
  with check (fn_role() in ('guru','gpk') and fn_boleh_student(student_id));

create policy ppi_versions_read on ppi_versions for select to authenticated
  using (exists (select 1 from ppis p where p.id = ppi_id and fn_boleh_student(p.student_id)));
create policy ppi_versions_write on ppi_versions for all to authenticated
  using (fn_role() in ('guru','gpk') and exists (
           select 1 from ppis p where p.id = ppi_id and fn_boleh_student(p.student_id)))
  with check (fn_role() in ('guru','gpk') and exists (
           select 1 from ppis p where p.id = ppi_id and fn_boleh_student(p.student_id)));

create policy ppi_goals_read on ppi_goals for select to authenticated
  using (exists (select 1 from ppi_versions v join ppis p on p.id = v.ppi_id
                 where v.id = ppi_version_id and fn_boleh_student(p.student_id)));
create policy ppi_goals_write on ppi_goals for all to authenticated
  using (fn_role() in ('guru','gpk') and exists (
           select 1 from ppi_versions v join ppis p on p.id = v.ppi_id
           where v.id = ppi_version_id and fn_boleh_student(p.student_id)))
  with check (fn_role() in ('guru','gpk') and exists (
           select 1 from ppi_versions v join ppis p on p.id = v.ppi_id
           where v.id = ppi_version_id and fn_boleh_student(p.student_id)));

create policy ppi_acc_read on ppi_accommodations for select to authenticated
  using (exists (select 1 from ppi_versions v join ppis p on p.id = v.ppi_id
                 where v.id = ppi_version_id and fn_boleh_student(p.student_id)));
create policy ppi_acc_write on ppi_accommodations for all to authenticated
  using (fn_role() in ('guru','gpk') and exists (
           select 1 from ppi_versions v join ppis p on p.id = v.ppi_id
           where v.id = ppi_version_id and fn_boleh_student(p.student_id)))
  with check (fn_role() in ('guru','gpk') and exists (
           select 1 from ppi_versions v join ppis p on p.id = v.ppi_id
           where v.id = ppi_version_id and fn_boleh_student(p.student_id)));

-- sessions (F6): dibaca staf + wali (F7 "10 sesi terakhir"); ditulis guru/gpk.
create policy sessions_read on sessions for select to authenticated
  using (exists (select 1 from ppis p where p.id = ppi_id and fn_boleh_student(p.student_id)));
create policy sessions_write on sessions for all to authenticated
  using (fn_role() in ('guru','gpk') and exists (
           select 1 from ppis p where p.id = ppi_id and fn_boleh_student(p.student_id)))
  with check (fn_role() in ('guru','gpk') and exists (
           select 1 from ppis p where p.id = ppi_id and fn_boleh_student(p.student_id)));

-- materials: staf sekolah sendiri (Mode siswa dijalankan oleh guru yang login).
create policy materials_read on materials for select to authenticated
  using (fn_role() = 'admin' or school_id = fn_school());
create policy materials_write on materials for all to authenticated
  using (fn_role() in ('guru','gpk') and school_id = fn_school())
  with check (fn_role() in ('guru','gpk') and school_id = fn_school());
create policy variants_read on material_variants for select to authenticated
  using (exists (select 1 from materials m where m.id = material_id
                 and (fn_role() = 'admin' or m.school_id = fn_school())));
create policy variants_write on material_variants for all to authenticated
  using (fn_role() in ('guru','gpk') and exists (
           select 1 from materials m where m.id = material_id and m.school_id = fn_school()))
  with check (fn_role() in ('guru','gpk') and exists (
           select 1 from materials m where m.id = material_id and m.school_id = fn_school()));

-- consents (F8): wali memberi/mencabut; staf sekolah boleh membaca.
create or replace function given_by_wali_ok(p_student uuid, p_oleh uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select p_oleh = auth.uid() and exists (
     select 1 from guardian_links g where g.student_id = p_student and g.user_id = auth.uid()
   ) $$;

create policy consents_read on consents for select to authenticated
  using (fn_boleh_wali(student_id) or fn_boleh_student(student_id));
create policy consents_wali_write on consents for insert to authenticated
  with check (given_by_wali_ok(student_id, diberikan_oleh));
create policy consents_wali_update on consents for update to authenticated
  using (fn_boleh_wali(student_id))
  with check (fn_boleh_wali(student_id) and diberikan_oleh = auth.uid());

-- transfers: koordinator sekolah asal menulis; wali anak itu boleh membaca.
create policy transfers_read on transfers for select to authenticated
  using (fn_role() = 'admin' or fn_boleh_wali(student_id)
         or (fn_role() = 'koordinator' and dari_school = fn_school()));
create policy transfers_koordinator_write on transfers for all to authenticated
  using (fn_role() = 'koordinator' and dari_school = fn_school())
  with check (fn_role() = 'koordinator' and dari_school = fn_school());

-- audit_logs: hanya admin yang membaca; penulisan lewat trigger definer.
create policy audit_admin_read on audit_logs for select to authenticated
  using (fn_role() = 'admin');
create policy audit_koordinator_read on audit_logs for select to authenticated
  using (fn_role() = 'koordinator' and user_id in (
           select id from profiles where school_id = fn_school()));

-- ========================================================================
-- RPC — aksi nyata. Semua security definer + pengecekan peran sendiri,
-- jadi klien tidak bisa memanggilnya di luar haknya walau RLS dilewati.
-- ========================================================================

-- F3: simpan asesmen (catatan dienkripsi) + hambatan terpilih, satu transaksi.
create or replace function rpc_assessment_save(
  p_student uuid, p_hambatan jsonb, p_catatan text default null
) returns uuid
language plpgsql security definer set search_path = public, extensions as
$$
declare v_id uuid; v_tingkat jsonb;
begin
  if fn_role() not in ('guru','gpk') then
    raise exception 'hanya guru/GPK yang boleh mengisi asesmen' using errcode = '42501';
  end if;
  if not fn_boleh_student(p_student) then
    raise exception 'siswa di luar sekolah Anda' using errcode = '42501';
  end if;

  insert into assessments(student_id, dibuat_oleh, catatan_enc)
  values (p_student, auth.uid(), fn_enc(nullif(p_catatan,'')))
  returning id into v_id;

  for v_tingkat in select * from jsonb_array_elements(coalesce(p_hambatan,'[]'::jsonb)) loop
    insert into assessment_barriers(assessment_id, barrier_id, tingkat)
    values (v_id,
            (v_tingkat->>'barrier_id')::uuid,
            coalesce((v_tingkat->>'tingkat')::barrier_tingkat, 'sedang'));
  end loop;

  return v_id;
end $$;

-- F4: saran akomodasi dari tabel aturan, lengkap alasan + kekuatan bukti.
-- Guru boleh menolak/mengubah; fungsi ini hanya membaca.
create or replace function rpc_ppi_suggest(p_student uuid) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as
$$
declare v jsonb;
begin
  if not (fn_boleh_student(p_student) or fn_boleh_wali(p_student)) then
    raise exception 'tidak berhak atas siswa ini' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'student', (select jsonb_build_object('id', s.id, 'kode', s.kode, 'inisial', s.inisial,
                                         'kelas', s.kelas, 'tahun_lahir', s.tahun_lahir)
                from students s where s.id = p_student),
    'assessment', (select jsonb_build_object(
                       'id', a.id, 'tanggal', a.tanggal, 'catatan', fn_dec(a.catatan_enc))
                   from assessments a where a.student_id = p_student
                   order by a.tanggal desc limit 1),
    'hambatan', coalesce((
        select jsonb_agg(jsonb_build_object('barrier_id', b.id, 'kode', b.kode,
                                            'nama', b.nama, 'tingkat', ab.tingkat))
        from assessments a
        join assessment_barriers ab on ab.assessment_id = a.id
        join barriers b on b.id = ab.barrier_id
        where a.id = (select id from assessments where student_id = p_student
                      order by tanggal desc limit 1)), '[]'::jsonb),
    'akomodasi', coalesce((
        select jsonb_agg(distinct jsonb_build_object(
                 'accommodation_id', ac.id, 'kode', ac.kode, 'nama', ac.nama,
                 'deskripsi', ac.deskripsi, 'tingkat_bukti', ac.tingkat_bukti,
                 'sumber', ac.sumber, 'alasan', r.alasan,
                 'ditinjau_oleh', r.ditinjau_oleh, 'tanggal_tinjau', r.tanggal_tinjau,
                 'dari_hambatan', b.nama))
        from assessments a
        join assessment_barriers ab on ab.assessment_id = a.id
        join barriers b on b.id = ab.barrier_id
        join barrier_accommodation_rules r on r.barrier_id = b.id
        join accommodations ac on ac.id = r.accommodation_id
        where a.id = (select id from assessments where student_id = p_student
                      order by tanggal desc limit 1)), '[]'::jsonb)
  ) into v;

  return v;
end $$;

-- F5: simpan draf PPI sebagai versi baru (riwayat tidak pernah ditimpa).
create or replace function rpc_ppi_save(
  p_student uuid,
  p_ppi uuid default null,
  p_ringkasan text default null,
  p_tujuan jsonb default '[]'::jsonb,
  p_akomodasi jsonb default '[]'::jsonb
) returns uuid
language plpgsql security definer set search_path = public, extensions as
$$
declare v_ppi uuid := p_ppi; v_versi uuid; v_no int; v_item jsonb;
begin
  if fn_role() not in ('guru','gpk') then
    raise exception 'hanya guru/GPK yang menyusun PPI' using errcode = '42501';
  end if;
  if not fn_boleh_student(p_student) then
    raise exception 'siswa di luar sekolah Anda' using errcode = '42501';
  end if;

  if v_ppi is null then
    insert into ppis(student_id) values (p_student)
    on conflict (student_id) do update set status = 'draf'
    returning id into v_ppi;
  end if;

  select coalesce(max(nomor_versi), 0) + 1 into v_no from ppi_versions where ppi_id = v_ppi;

  insert into ppi_versions(ppi_id, nomor_versi, dibuat_oleh, ringkasan)
  values (v_ppi, v_no, auth.uid(), p_ringkasan)
  returning id into v_versi;

  for v_item in select * from jsonb_array_elements(coalesce(p_tujuan,'[]'::jsonb)) loop
    insert into ppi_goals(ppi_version_id, tujuan, indikator)
    values (v_versi, v_item->>'tujuan', v_item->>'indikator');
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_akomodasi,'[]'::jsonb)) loop
    insert into ppi_accommodations(ppi_version_id, accommodation_id, disetujui, catatan)
    values (v_versi, (v_item->>'accommodation_id')::uuid,
            coalesce((v_item->>'disetujui')::boolean, false), v_item->>'catatan');
  end loop;

  update ppis set versi_aktif = v_no, status = 'draf' where id = v_ppi;
  return v_versi;
end $$;

-- F6: catat satu sesi. Idempoten lewat client_uuid -> aman dikirim ulang offline.
create or replace function rpc_session_log(
  p_ppi uuid, p_goal uuid, p_tanggal date, p_status capaian_status,
  p_catatan text, p_client_uuid uuid
) returns uuid
language plpgsql security definer set search_path = public, extensions as
$$
declare v_id uuid; v_student uuid;
begin
  if fn_role() not in ('guru','gpk') then
    raise exception 'hanya guru/GPK yang mencatat sesi' using errcode = '42501';
  end if;

  select student_id into v_student from ppis where id = p_ppi;
  if v_student is null or not fn_boleh_student(v_student) then
    raise exception 'PPI di luar sekolah Anda' using errcode = '42501';
  end if;

  insert into sessions(ppi_id, goal_id, tanggal, status_capaian, catatan_enc,
                       client_uuid, dibuat_oleh)
  values (p_ppi, p_goal, coalesce(p_tanggal, current_date), p_status,
          fn_enc(nullif(p_catatan,'')), p_client_uuid, auth.uid())
  on conflict (client_uuid) do nothing
  returning id into v_id;

  if v_id is null then                    -- sudah pernah tersinkron
    select id into v_id from sessions where client_uuid = p_client_uuid;
  end if;

  insert into audit_logs(user_id, aksi, objek, objek_id, keterangan)
  values (auth.uid(), 'rpc:session_log', 'sessions', v_id::text,
          jsonb_build_object('idempoten', v_id is not null));
  return v_id;
end $$;

-- F8: wali memberi persetujuan berbagi rekam.
create or replace function rpc_consent_save(
  p_student uuid, p_jenis consent_jenis, p_status consent_status,
  p_berlaku_hingga timestamptz default null
) returns uuid
language plpgsql security definer set search_path = public as
$$
declare v_id uuid;
begin
  if not fn_boleh_wali(p_student) then
    raise exception 'hanya wali siswa ini yang boleh memberi persetujuan'
      using errcode = '42501';
  end if;
  insert into consents(student_id, jenis, diberikan_oleh, status, berlaku_hingga)
  values (p_student, p_jenis, auth.uid(), p_status, p_berlaku_hingga)
  returning id into v_id;

  insert into audit_logs(user_id, aksi, objek, objek_id, keterangan)
  values (auth.uid(), 'rpc:consent', 'consents', v_id::text,
          jsonb_build_object('status', p_status, 'jenis', p_jenis));
  return v_id;
end $$;

-- F8: koordinator membuat token sekali pakai. Token asli hanya muncul di sini
-- sekali; yang tersimpan hanya sha256-nya.
create or replace function rpc_transfer_create(
  p_student uuid, p_ke_school uuid, p_berlaku_jam int default 72
) returns jsonb
language plpgsql security definer set search_path = public, extensions as
$$
declare v_consent uuid; v_dari uuid; v_token text; v_id uuid;
begin
  if fn_role() not in ('koordinator','admin') then
    raise exception 'hanya koordinator yang mengajukan transfer' using errcode = '42501';
  end if;
  if not fn_boleh_student(p_student) then
    raise exception 'siswa di luar sekolah Anda' using errcode = '42501';
  end if;
  if p_berlaku_jam is null or p_berlaku_jam < 1 or p_berlaku_jam > 720 then
    raise exception 'masa berlaku token harus 1-720 jam';
  end if;

  select id into v_consent from consents
  where student_id = p_student and jenis = 'berbagi_rekam' and status = 'disetujui'
    and (berlaku_hingga is null or berlaku_hingga > now())
  order by dibuat_pada desc limit 1;

  if v_consent is null then
    raise exception 'belum ada persetujuan wali yang aktif' using errcode = '42501';
  end if;

  select school_id into v_dari from students where id = p_student;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into transfers(student_id, dari_school, ke_school, consent_id, token_hash,
                        kedaluwarsa, dibuat_oleh)
  values (p_student, v_dari, p_ke_school, v_consent,
          extensions.digest(v_token, 'sha256'), now() + make_interval(hours => p_berlaku_jam),
          auth.uid())
  returning id into v_id;

  insert into audit_logs(user_id, aksi, objek, objek_id, keterangan)
  values (auth.uid(), 'rpc:transfer_create', 'transfers', v_id::text,
          jsonb_build_object('ke_school', p_ke_school, 'jam', p_berlaku_jam));

  return jsonb_build_object('transfer_id', v_id, 'token', v_token,
                            'kedaluwarsa', now() + make_interval(hours => p_berlaku_jam));
end $$;

-- F8/F9: sekolah tujuan mengambil rekam dengan token. Sekali pakai.
-- Dipanggil dengan anon key (token = kapabilitas), maka GRANT ke anon.
create or replace function rpc_record_fetch(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as
$$
declare v transfers; v_ppi uuid; v_versi uuid; v_out jsonb;
begin
  select * into v from transfers
  where token_hash = extensions.digest(p_token, 'sha256')
  for update;

  if v.id is null then
    raise exception 'token tidak dikenali' using errcode = '22023';
  end if;
  if v.dipakai_pada is not null then
    raise exception 'token sudah dipakai' using errcode = '22023';
  end if;
  if v.kedaluwarsa <= now() then
    raise exception 'token kedaluwarsa' using errcode = '22023';
  end if;

  update transfers set dipakai_pada = now() where id = v.id;

  select id into v_ppi from ppis where student_id = v.student_id;
  select id into v_versi from ppi_versions where ppi_id = v_ppi
  order by nomor_versi desc limit 1;

  select jsonb_build_object(
    'diambil_pada', now(),
    'dari_sekolah', (select jsonb_build_object('nama', s.nama, 'kode_instansi', s.kode_instansi)
                     from schools s where s.id = v.dari_school),
    'siswa', (select jsonb_build_object('kode', st.kode, 'inisial', st.inisial,
                                        'tahun_lahir', st.tahun_lahir, 'kelas', st.kelas)
              from students st where st.id = v.student_id),
    'ppi', jsonb_build_object(
      'versi', (select nomor_versi from ppi_versions where id = v_versi),
      'ringkasan', (select ringkasan from ppi_versions where id = v_versi),
      'tujuan', coalesce((select jsonb_agg(jsonb_build_object('tujuan', tujuan,
                                                              'indikator', indikator))
                          from ppi_goals where ppi_version_id = v_versi), '[]'::jsonb),
      'akomodasi', coalesce((select jsonb_agg(jsonb_build_object(
                                'nama', ac.nama, 'disetujui', pa.disetujui,
                                'catatan', pa.catatan, 'tingkat_bukti', ac.tingkat_bukti))
                             from ppi_accommodations pa
                             join accommodations ac on ac.id = pa.accommodation_id
                             where pa.ppi_version_id = v_versi), '[]'::jsonb),
      'sesi', coalesce((select jsonb_agg(jsonb_build_object(
                                'tanggal', se.tanggal, 'capaian', se.status_capaian,
                                'catatan', fn_dec(se.catatan_enc))
                            order by se.tanggal desc)
                        from (select * from sessions where ppi_id = v_ppi
                              order by tanggal desc limit 20) se), '[]'::jsonb)
    )
  ) into v_out;

  insert into audit_logs(user_id, aksi, objek, objek_id, keterangan)
  values (auth.uid(), 'rpc:record_fetch', 'transfers', v.id::text,
          jsonb_build_object('token_hash_pendek', left(encode(v.token_hash,'hex'), 12)));
  return v_out;
end $$;

-- F2: hapus data atas permintaan (cascade ke semua turunannya).
create or replace function rpc_student_delete(p_student uuid) returns void
language plpgsql security definer set search_path = public as
$$
begin
  if fn_role() not in ('koordinator','admin') then
    raise exception 'hanya koordinator/admin yang boleh menghapus data siswa'
      using errcode = '42501';
  end if;
  if not fn_boleh_student(p_student) then
    raise exception 'siswa di luar sekolah Anda' using errcode = '42501';
  end if;
  delete from students where id = p_student;
end $$;

-- F7: satu panggilan untuk tampilan orang tua — baca-saja, tanpa data asesmen
-- mentah, maksimal 10 sesi terakhir. Dipisah dari rpc_ppi_suggest supaya wali
-- tidak pernah menerima catatan asesmen (minimisasi data, PRD §7).
create or replace function rpc_wali_ringkasan(p_student uuid) returns jsonb
language plpgsql security definer set search_path = public, extensions as
$$
declare v_ppi uuid; v_versi uuid; v_out jsonb;
begin
  if not fn_boleh_wali(p_student) then
    raise exception 'Anda tidak tertaut ke siswa ini' using errcode = '42501';
  end if;

  select id into v_ppi from ppis where student_id = p_student;
  select id into v_versi from ppi_versions where ppi_id = v_ppi
  order by nomor_versi desc limit 1;

  select jsonb_build_object(
    'siswa', (select jsonb_build_object('id', s.id, 'kode', s.kode, 'inisial', s.inisial,
                                        'kelas', s.kelas)
              from students s where s.id = p_student),
    'sekolah', (select s.nama from students st join schools s on s.id = st.school_id
                where st.id = p_student),
    'ppi', case when v_versi is null then null else jsonb_build_object(
      'ppi_id', v_ppi,
      'versi', (select nomor_versi from ppi_versions where id = v_versi),
      'ringkasan', (select ringkasan from ppi_versions where id = v_versi),
      'diperbarui', (select dibuat_pada from ppi_versions where id = v_versi),
      'tujuan', coalesce((select jsonb_agg(jsonb_build_object('tujuan', tujuan,
                                                              'indikator', indikator))
                          from ppi_goals where ppi_version_id = v_versi), '[]'::jsonb),
      'akomodasi', coalesce((select jsonb_agg(jsonb_build_object(
                                'nama', ac.nama, 'disetujui', pa.disetujui))
                             from ppi_accommodations pa
                             join accommodations ac on ac.id = pa.accommodation_id
                             where pa.ppi_version_id = v_versi), '[]'::jsonb)) end,
    'sesi', coalesce((select jsonb_agg(x) from (
        select jsonb_build_object('tanggal', se.tanggal, 'capaian', se.status_capaian,
                                  'catatan', fn_dec(se.catatan_enc)) as x
        from sessions se where se.ppi_id = v_ppi
        order by se.tanggal desc limit 10) q), '[]'::jsonb),
    'persetujuan', coalesce((select jsonb_agg(jsonb_build_object(
                                'id', c.id, 'status', c.status, 'jenis', c.jenis,
                                'berlaku_hingga', c.berlaku_hingga, 'dibuat_pada', c.dibuat_pada)
                             order by c.dibuat_pada desc)
                             from consents c where c.student_id = p_student), '[]'::jsonb)
  ) into v_out;

  insert into audit_logs(user_id, aksi, objek, objek_id, keterangan)
  values (auth.uid(), 'select', 'wali_ringkasan', p_student::text, '{}'::jsonb);
  return v_out;
end $$;

-- F12: trigger di atas tidak bisa menangkap SELECT (Postgres tidak punya trigger
-- baca). Untuk pembacaan yang benar-benar sensitif (membuka satu siswa, tampilan
-- orang tua, unduh rekam) klien memanggil ini secara eksplisit.
create or replace function rpc_log_read(p_objek text, p_objek_id text, p_keterangan jsonb default '{}'::jsonb)
returns void
language plpgsql security definer set search_path = public as
$$
begin
  insert into audit_logs(user_id, aksi, objek, objek_id, keterangan, ip)
  values (auth.uid(), 'select', p_objek, p_objek_id, p_keterangan, null);
end $$;

-- ============================================================== grants =====
revoke all on function rpc_assessment_save(uuid, jsonb, text) from public;
revoke all on function rpc_ppi_save(uuid, uuid, text, jsonb, jsonb) from public;
revoke all on function rpc_session_log(uuid, uuid, date, capaian_status, text, uuid) from public;
revoke all on function rpc_consent_save(uuid, consent_jenis, consent_status, timestamptz) from public;
revoke all on function rpc_transfer_create(uuid, uuid, int) from public;
revoke all on function rpc_student_delete(uuid) from public;
revoke all on function rpc_record_fetch(text) from public;
revoke all on function fn_dec(bytea) from anon;
revoke all on function fn_enc(text) from anon;

grant execute on function rpc_assessment_save(uuid, jsonb, text)        to authenticated;
grant execute on function rpc_ppi_suggest(uuid)                        to authenticated;
grant execute on function rpc_ppi_save(uuid, uuid, text, jsonb, jsonb) to authenticated;
grant execute on function rpc_session_log(uuid, uuid, date, capaian_status, text, uuid) to authenticated;
grant execute on function rpc_consent_save(uuid, consent_jenis, consent_status, timestamptz) to authenticated;
grant execute on function rpc_transfer_create(uuid, uuid, int)         to authenticated;
grant execute on function rpc_student_delete(uuid)                     to authenticated;
grant execute on function rpc_log_read(text, text, jsonb)               to authenticated;
grant execute on function rpc_wali_ringkasan(uuid)                     to authenticated;
grant execute on function fn_dec(bytea)                                to authenticated;
grant execute on function rpc_record_fetch(text)                       to anon, authenticated;

-- ponytail: rpc_record_fetch belum punya rate limit / lockout selain
-- sekali-pakai + kedaluwarsa. Tambahkan rate limit di edge function bila
-- demo diuji adversarial.
