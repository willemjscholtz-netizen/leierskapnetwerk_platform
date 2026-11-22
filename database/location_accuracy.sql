-- Die akkuraatheid van die ligging, in meters.
--
-- Die blaaier se ligging-API gee 'n "accuracy"-veld terug: die
-- radius waarbinne die toestel dink dit is, met 95% vertroue.
--
-- DIT IS DIE BELANGRIKSTE GETAL OOR DIE LIGGING. Sonder dit weet
-- jy nie of '-25.8251, 28.2070' 'n GPS-lesing van 5 meter is of
-- 'n IP-skatting van 200 kilometer nie.

alter table public.users
  add column if not exists location_accuracy double precision;

-- Wanneer die ligging opgeneem is. So kan 'n mens sien of dit
-- vars is of ou data.
alter table public.users
  add column if not exists location_updated_at timestamptz;
