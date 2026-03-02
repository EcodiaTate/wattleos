-- 00009_mqap_criteria_seed.sql
--
-- Seeds the mqap_criteria table with Montessori Quality: Authentic Practice
-- criteria aligned to the 7 NQS Quality Areas. The mqap_criteria table was
-- created in 00004_compliance_modules.sql — this migration populates it.
--
-- Source: Montessori Australia Foundation (MAF) MQ:AP Handbook

INSERT INTO mqap_criteria (code, quality_area, standard_number, criterion_number, criterion_text, guidance, nqs_element_alignment, sequence_order)
VALUES
  -- ── QA1: Educational Program and Practice ──────────────────────────────
  ('MQ1.1.1', 1, 'MQ1.1', 'MQ1.1.1',
   'The learning environment is prepared according to Montessori principles, with materials arranged in developmental sequence on open shelving accessible to all children.',
   'Materials are complete, clean, and in good repair. Each material has a designated place. The environment is aesthetically inviting and uncluttered.',
   '1.1.1', 1),
  ('MQ1.1.2', 1, 'MQ1.1', 'MQ1.1.2',
   'Materials span the five Montessori curriculum areas (Practical Life, Sensorial, Language, Mathematics, Cultural/Cosmic Education) appropriate to the age group served.',
   '0–3: emphasis on Practical Life, Sensorial, and early Language. 3–6: full five-area complement. 6–12: transition to abstraction, research, and going-out.',
   '1.1.2', 2),
  ('MQ1.1.3', 1, 'MQ1.1', 'MQ1.1.3',
   'The environment supports freedom of movement and choice, with ground rules that enable children to select, use, and return materials independently.',
   'Children are not confined to assigned seats. Work mats and tables are available. Transition between activities is child-directed.',
   '1.1.3', 3),
  ('MQ1.2.1', 1, 'MQ1.2', 'MQ1.2.1',
   'A minimum three-hour uninterrupted work cycle is scheduled daily for 3–6 and 6–12 environments; age-appropriate work periods for 0–3.',
   'Interruptions (whole-group activities, specialist pull-outs) are minimised during the work cycle. Any interruption is documented with reason.',
   '1.2.1', 4),
  ('MQ1.2.2', 1, 'MQ1.2', 'MQ1.2.2',
   'Educators observe and document children''s concentration, repetition, and engagement during the work cycle to inform planning.',
   'Observations note child-chosen materials, duration of engagement, and quality of concentration. Records are maintained for each child.',
   '1.2.2', 5),
  ('MQ1.3.1', 1, 'MQ1.3', 'MQ1.3.1',
   'Lessons are presented individually or in small groups, following the child''s readiness and interest rather than a fixed whole-class schedule.',
   'Lesson records show individual presentation dates. Curriculum progression follows the child, not a calendar.',
   '1.3.1', 6),
  ('MQ1.3.2', 1, 'MQ1.3', 'MQ1.3.2',
   'Each child''s progress is tracked through all five curriculum areas using a lesson record system that shows presentation stage (introduction, practice, mastery).',
   'The tracking system should be accessible to educators for planning. It replaces or supplements standardised testing.',
   '1.3.2', 7),

  -- ── QA2: Children's Health and Safety ──────────────────────────────────
  ('MQ2.1.1', 2, 'MQ2.1', 'MQ2.1.1',
   'Health and safety practices are implemented in ways that maximise children''s independence: child-height sinks, self-service snack, child-managed routines.',
   'Practical Life activities include real food preparation, cleaning, and self-care. Risk is managed, not eliminated.',
   '2.1.1', 1),
  ('MQ2.1.2', 2, 'MQ2.1', 'MQ2.1.2',
   'Children participate in maintaining the prepared environment: cleaning, caring for plants and animals, and managing personal belongings.',
   'These tasks are not chores but purposeful activities that develop concentration, coordination, independence, and order.',
   '2.1.2', 2),
  ('MQ2.2.1', 2, 'MQ2.2', 'MQ2.2.1',
   'Real tools and materials (glass, ceramics, kitchen implements) are used under guidance, with clear ground rules about safe handling taught through lessons.',
   'Montessori environments deliberately include breakable items to teach care and respect. Safety rules are demonstrated, not just stated.',
   '2.2.1', 3),

  -- ── QA3: Physical Environment ─────────────────────────────────────────
  ('MQ3.1.1', 3, 'MQ3.1', 'MQ3.1.1',
   'Furniture, fixtures, and materials are child-scaled: low shelving, child-height tables and chairs, accessible outdoor areas.',
   'Adult-sized furniture is minimised. The environment communicates ''this space belongs to you'' to the child.',
   '3.1.1', 1),
  ('MQ3.1.2', 3, 'MQ3.1', 'MQ3.1.2',
   'The indoor environment is divided into clearly defined curriculum areas with logical flow between them.',
   'Practical Life near water source, Sensorial in a quieter zone, Art near natural light. Traffic patterns do not interrupt concentrated work.',
   '3.1.2', 2),
  ('MQ3.2.1', 3, 'MQ3.2', 'MQ3.2.1',
   'The environment prioritises natural materials (wood, metal, glass, fabric) over plastic. Artwork, plants, and natural elements are incorporated.',
   'Beauty and order are deliberate design principles. The space reflects the quality of adult spaces, not a stereotypical ''childcare'' aesthetic.',
   '3.2.1', 3),
  ('MQ3.2.2', 3, 'MQ3.2', 'MQ3.2.2',
   'Outdoor environments extend the prepared environment: gardening, nature exploration, gross motor, and sensorial experiences in natural settings.',
   'Outdoor time is not separate from curriculum. Work cycle may extend outdoors. Nature walks and going-out excursions are regular.',
   '3.2.2', 4),

  -- ── QA4: Staffing Arrangements ────────────────────────────────────────
  ('MQ4.1.1', 4, 'MQ4.1', 'MQ4.1.1',
   'Each environment is led by an educator holding a recognised Montessori credential (AMI, AMS, MWEI, or Montessori Australia-approved) for the age group served.',
   'Credential must match age range: 0–3, 3–6, 6–9, 6–12, or 12–18. The lead educator is the person responsible for lesson presentations.',
   '4.1.1', 1),
  ('MQ4.1.2', 4, 'MQ4.1', 'MQ4.1.2',
   'Staff engage in ongoing Montessori professional development, including peer observation, conference attendance, and study of Montessori philosophy.',
   'Professional development includes both regulatory requirements (first aid, child protection) and Montessori-specific growth.',
   '4.1.2', 2),
  ('MQ4.2.1', 4, 'MQ4.2', 'MQ4.2.1',
   'Educators understand and practice the Montessori role as ''guide'': observing before intervening, following the child''s lead, and stepping back as competence develops.',
   'The educator''s primary tool is observation, not direction. Lessons are offered, not imposed. Praise is specific and non-evaluative.',
   '4.2.1', 3),

  -- ── QA5: Relationships with Children ──────────────────────────────────
  ('MQ5.1.1', 5, 'MQ5.1', 'MQ5.1.1',
   'Interactions with children demonstrate fundamental respect: speaking at the child''s level, waiting for the child to finish before speaking, using courteous language.',
   'Grace and courtesy lessons are part of the Practical Life curriculum. Adults model the behaviour expected of children.',
   '5.1.1', 1),
  ('MQ5.1.2', 5, 'MQ5.1', 'MQ5.1.2',
   'Conflict resolution is facilitated by the educator using peace education principles: the peace table, mediation, and non-punitive approaches.',
   'Children are guided to resolve conflicts themselves. Punishments, time-outs, and reward charts are not used.',
   '5.1.2', 2),
  ('MQ5.2.1', 5, 'MQ5.2', 'MQ5.2.1',
   'Children are grouped in three-year age spans (0–3, 3–6, 6–9, 9–12) to enable peer mentoring, leadership development, and social learning.',
   'Mixed-age grouping is a non-negotiable Montessori principle. Single-age grouping within a Montessori environment is a red flag.',
   '5.2.1', 3),

  -- ── QA6: Collaborative Partnerships ───────────────────────────────────
  ('MQ6.1.1', 6, 'MQ6.1', 'MQ6.1.1',
   'Families are supported to understand Montessori philosophy and practice through orientation sessions, observation opportunities, and ongoing communication.',
   'Parent education is not optional. Families should be invited to observe the classroom and understand why the approach differs from conventional schooling.',
   '6.1.1', 1),
  ('MQ6.1.2', 6, 'MQ6.1', 'MQ6.1.2',
   'Progress reporting to families reflects Montessori assessment methods: narrative observations, lesson records, and portfolio evidence rather than grades or comparative rankings.',
   'Report cards, if used, are supplemented with or replaced by narrative descriptions of the child''s development across all areas.',
   '6.1.2', 2),
  ('MQ6.2.1', 6, 'MQ6.2', 'MQ6.2.1',
   'The service connects with the broader Montessori community: membership in Montessori Australia, participation in Montessori events, and engagement with the wider Montessori movement.',
   'Isolation from the Montessori community limits quality improvement. Active engagement signals commitment to authentic practice.',
   '6.2.1', 3),

  -- ── QA7: Governance and Leadership ────────────────────────────────────
  ('MQ7.1.1', 7, 'MQ7.1', 'MQ7.1.1',
   'The service''s governance structure demonstrates commitment to Montessori principles: the mission statement references Montessori philosophy, and strategic decisions consider Montessori authenticity.',
   'Board or management decisions about class size, staffing, and environment should be Montessori-informed, not purely commercial.',
   '7.1.1', 1),
  ('MQ7.1.2', 7, 'MQ7.1', 'MQ7.1.2',
   'The service has a documented Montessori-specific quality improvement process that aligns with and extends the NQS QIP to address authentic practice standards.',
   'This MQ:AP self-assessment IS that process. If this criterion is unmet, the very act of completing this framework addresses it.',
   '7.1.2', 2),
  ('MQ7.2.1', 7, 'MQ7.2', 'MQ7.2.1',
   'Educational leadership is held by a Montessori-qualified professional who mentors staff, maintains curriculum integrity, and champions the prepared environment.',
   'The educational leader may be the principal, director, or a dedicated pedagogical coordinator. They must hold a Montessori credential.',
   '7.2.1', 3)
ON CONFLICT (code) DO NOTHING;
