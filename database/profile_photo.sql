-- Die profielprent.
--
-- Ons stoor dit as 'n datastring (base64) in die databasis. Vir
-- 'n prent van 400x400 is dit omtrent 40-80 KB - heeltemal reg.
-- Vir groot beelde sou 'n aparte stoorplek (Supabase Storage) die
-- regte ding wees, maar dit is 'n ekstra diens om op te stel.

alter table public.users
  add column if not exists profile_photo text;
