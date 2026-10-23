-- Séries C and D: official subjects and coefficients (October 2026). Run once in Supabase → SQL Editor.
-- For an existing database (new databases already get this from setup.sql / seed.sql). Safe to re-run.
--   C: Mathématiques 9 · Physique-Chimie 8 · Sciences naturelles 4 · Arabe 3 · Français 3 · Anglais 2 · Instruction religieuse 2
--   D: Sciences naturelles 8 · Physique-Chimie 7 · Mathématiques 6 · Arabe 3 · Français 3 · Anglais 2 · Instruction religieuse 2
--   Philosophie is not a subject of C or D.
-- Names are set for séries C and D only: the other séries keep theirs.
-- Every statement stands on its own (the SQL Editor may run them one by one).

update serie_subjects ss
   set coeff = o.coeff, position = o.position, name_fr = o.name_fr, name_ar = o.name_ar
  from (values
    ('C', 'maths',   9, 0, 'Mathématiques',          'الرياضيات'),
    ('C', 'physics', 8, 1, 'Physique-Chimie',        'الفيزياء والكيمياء'),
    ('C', 'natsci',  4, 2, 'Sciences naturelles',    'العلوم الطبيعية'),
    ('C', 'arabic',  3, 3, 'Arabe',                  'العربية'),
    ('C', 'french',  3, 4, 'Français',               'الفرنسية'),
    ('C', 'english', 2, 5, 'Anglais',                'الإنجليزية'),
    ('C', 'islamic', 2, 6, 'Instruction religieuse', 'التربية الإسلامية'),
    ('D', 'natsci',  8, 0, 'Sciences naturelles',    'العلوم الطبيعية'),
    ('D', 'physics', 7, 1, 'Physique-Chimie',        'الفيزياء والكيمياء'),
    ('D', 'maths',   6, 2, 'Mathématiques',          'الرياضيات'),
    ('D', 'arabic',  3, 3, 'Arabe',                  'العربية'),
    ('D', 'french',  3, 4, 'Français',               'الفرنسية'),
    ('D', 'english', 2, 5, 'Anglais',                'الإنجليزية'),
    ('D', 'islamic', 2, 6, 'Instruction religieuse', 'التربية الإسلامية')
  ) as o (serie_id, subject_id, coeff, position, name_fr, name_ar)
 where ss.serie_id = o.serie_id and ss.subject_id = o.subject_id;

-- Subjects not in the official lists leave C and D (Philosophie). Their chapters for C/D go with them;
-- students' progress stays on their phones, just hidden.
delete from serie_subjects
 where serie_id in ('C', 'D')
   and subject_id not in ('maths', 'physics', 'natsci', 'arabic', 'french', 'english', 'islamic');

-- Every phone replaces its cached copy on its next launch.
update app_config set value = to_jsonb((value #>> '{}')::int + 1) where key = 'content_version';
