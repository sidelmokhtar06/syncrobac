-- Série C: official subjects and coefficients (October 2026). Run once in Supabase → SQL Editor.
-- For an existing database (new databases already get this from setup.sql / seed.sql). Safe to re-run.
--   Mathématiques 9 · Physique-Chimie 8 · Sciences naturelles 4 · Arabe 3 · Français 3 ·
--   Anglais 2 · Instruction religieuse 2  (Philosophie is not a série C subject)
-- Names are set for série C only: other séries keep theirs.
begin;

update serie_subjects set coeff = 9, position = 0 where serie_id = 'C' and subject_id = 'maths';
update serie_subjects set coeff = 8, position = 1, name_fr = 'Physique-Chimie', name_ar = 'الفيزياء والكيمياء' where serie_id = 'C' and subject_id = 'physics';
update serie_subjects set coeff = 4, position = 2 where serie_id = 'C' and subject_id = 'natsci';
update serie_subjects set coeff = 3, position = 3, name_ar = 'العربية' where serie_id = 'C' and subject_id = 'arabic';
update serie_subjects set coeff = 3, position = 4, name_ar = 'الفرنسية' where serie_id = 'C' and subject_id = 'french';
update serie_subjects set coeff = 2, position = 5, name_ar = 'الإنجليزية' where serie_id = 'C' and subject_id = 'english';
update serie_subjects set coeff = 2, position = 6, name_fr = 'Instruction religieuse' where serie_id = 'C' and subject_id = 'islamic';
-- Its série C chapters go with it (students' progress on them stays on their phones, just hidden).
delete from serie_subjects where serie_id = 'C' and subject_id = 'philo';

-- Every phone replaces its cached copy on its next launch.
update app_config set value = to_jsonb((value #>> '{}')::int + 1) where key = 'content_version';

commit;
