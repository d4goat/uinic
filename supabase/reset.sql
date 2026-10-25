-- supabase/reset.sql — hapus SEMUA objek PPI-Link supaya schema.sql bisa
-- dijalankan ulang dari nol. Pakai hanya saat skema setengah jalan / ingin bersih.
-- Data di dalamnya ikut terhapus (semua data demo, tidak ada data nyata).
drop table if exists
  audit_logs, transfers, consents, material_variants, materials, sessions,
  ppi_accommodations, ppi_goals, ppi_versions, ppis, assessment_barriers,
  assessments, barrier_accommodation_rules, accommodations, barriers,
  guardian_links, students, profiles, schools, app_secrets
  cascade;

drop function if exists
  fn_role(), fn_school(), fn_kunci(), fn_dec(bytea), fn_enc(text),
  fn_boleh_student(uuid), fn_boleh_wali(uuid), fn_audit(),
  given_by_wali_ok(uuid, uuid),
  rpc_assessment_save(uuid, jsonb, text), rpc_ppi_suggest(uuid),
  rpc_ppi_save(uuid, uuid, text, jsonb, jsonb),
  rpc_session_log(uuid, uuid, date, capaian_status, text, uuid),
  rpc_consent_save(uuid, consent_jenis, consent_status, timestamptz),
  rpc_transfer_create(uuid, uuid, int), rpc_record_fetch(text),
  rpc_student_delete(uuid), rpc_wali_ringkasan(uuid),
  rpc_log_read(text, text, jsonb)
  cascade;

drop type if exists
  user_role, capaian_status, barrier_tingkat, bukti_tingkat,
  consent_jenis, consent_status, ppi_status, varian_jenis
  cascade;
