-- 00064_montessori_literacy_hub.sql
-- Parent Montessori Literacy Hub — in-app guides explaining Montessori concepts,
-- linked contextually from observations and portfolios.

-- ── Enums ─────────────────────────────────────────────────────────────────────

CREATE TYPE hub_article_category AS ENUM (
  'philosophy',
  'language',
  'mathematics',
  'practical_life',
  'sensorial',
  'cultural',
  'cosmic_education',
  'child_development',
  'home_connection',
  'three_period_lesson',
  'sensitive_periods',
  'work_cycle',
  'normalization',
  'prepared_environment'
);

CREATE TYPE hub_article_age_band AS ENUM (
  'birth_3',
  'three_6',
  'six_9',
  'nine_12',
  'all_ages'
);

CREATE TYPE hub_article_status AS ENUM (
  'draft',
  'published',
  'archived'
);

-- ── Tables ────────────────────────────────────────────────────────────────────

-- Articles: tenant-scoped or global (tenant_id IS NULL = platform default)
CREATE TABLE montessori_hub_articles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL = platform article

  title           TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  slug            TEXT NOT NULL CHECK (char_length(slug) BETWEEN 3 AND 100),
  category        hub_article_category NOT NULL,
  age_bands       hub_article_age_band[] NOT NULL DEFAULT '{}',
  status          hub_article_status NOT NULL DEFAULT 'draft',

  -- Content
  summary         TEXT NOT NULL CHECK (char_length(summary) BETWEEN 10 AND 500),
  body_md         TEXT NOT NULL,                   -- full markdown body
  key_takeaways   TEXT[] NOT NULL DEFAULT '{}',    -- bullet list (max 5)
  home_tips       TEXT[] NOT NULL DEFAULT '{}',    -- practical home suggestions

  -- Contextual linking: which curriculum areas/materials this maps to
  linked_area_ids TEXT[] NOT NULL DEFAULT '{}',    -- montessori area slugs
  linked_keywords TEXT[] NOT NULL DEFAULT '{}',    -- for fuzzy search / auto-linking

  -- Authoring
  author_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at    TIMESTAMPTZ,
  sort_order      SMALLINT NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,

  CONSTRAINT unique_tenant_slug UNIQUE NULLS NOT DISTINCT (tenant_id, slug)
);

-- Per-user read tracking
CREATE TABLE montessori_hub_reads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  article_id  UUID NOT NULL REFERENCES montessori_hub_articles(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  bookmarked  BOOLEAN NOT NULL DEFAULT false,

  UNIQUE (tenant_id, article_id, user_id)
);

-- Per-user article feedback (helpful / not helpful)
CREATE TABLE montessori_hub_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  article_id  UUID NOT NULL REFERENCES montessori_hub_articles(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  helpful     BOOLEAN NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, article_id, user_id)
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE montessori_hub_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE montessori_hub_reads    ENABLE ROW LEVEL SECURITY;
ALTER TABLE montessori_hub_feedback ENABLE ROW LEVEL SECURITY;

-- Articles: readable by tenant members (platform articles have tenant_id IS NULL)
CREATE POLICY "hub_articles_tenant_read" ON montessori_hub_articles
  FOR SELECT USING (
    deleted_at IS NULL AND (
      tenant_id IS NULL  -- platform default articles
      OR tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "hub_articles_tenant_write" ON montessori_hub_articles
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "hub_reads_tenant_isolation" ON montessori_hub_reads
  USING (tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "hub_feedback_tenant_isolation" ON montessori_hub_feedback
  USING (tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1));

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX ON montessori_hub_articles (tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX ON montessori_hub_articles (category) WHERE deleted_at IS NULL AND status = 'published';
CREATE INDEX ON montessori_hub_articles USING GIN (linked_keywords);
CREATE INDEX ON montessori_hub_articles USING GIN (age_bands);
CREATE INDEX ON montessori_hub_reads (tenant_id, user_id);
CREATE INDEX ON montessori_hub_reads (article_id, bookmarked) WHERE bookmarked = true;
CREATE INDEX ON montessori_hub_feedback (article_id);

-- ── updated_at triggers ──────────────────────────────────────────────────────

CREATE TRIGGER update_montessori_hub_articles_updated_at
  BEFORE UPDATE ON montessori_hub_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Seed platform articles ───────────────────────────────────────────────────
-- tenant_id IS NULL = available to all tenants out of the box

INSERT INTO montessori_hub_articles
  (tenant_id, title, slug, category, age_bands, status, summary, body_md,
   key_takeaways, home_tips, linked_area_ids, linked_keywords, sort_order, published_at)
VALUES

-- Philosophy & Foundation
(NULL, 'What is Montessori?', 'what-is-montessori', 'philosophy', ARRAY['all_ages']::hub_article_age_band[],
 'published',
 'An introduction to the Montessori method — its core beliefs about the child as a natural learner and the role of the prepared environment.',
 E'## The Montessori Approach\n\nDeveloped by Dr Maria Montessori in the early 1900s, the Montessori method is a child-centred educational approach grounded in scientific observation. Dr Montessori observed that children learn most effectively when they are given freedom within structure, allowed to follow their natural curiosity, and provided with purposeful materials.\n\n## The Child as the Teacher\n\nOne of the most powerful ideas in Montessori is that the child is their own best teacher. The adult''s role shifts from instructor to *guide* — carefully observing the child, preparing the environment, and offering materials at the right moment.\n\n## Key Principles\n\n- **Freedom within limits** — children choose their work within a structured environment\n- **Mixed-age groups** — children learn from and teach each other\n- **Uninterrupted work cycles** — long blocks of time for deep concentration\n- **Intrinsic motivation** — no grades, stickers, or external rewards\n- **Hands-on materials** — concrete before abstract, always\n\n## The Three-Year Cycle\n\nMontessori classrooms span three-year age bands (0–3, 3–6, 6–9, 9–12). This means your child spends three full years in the same community, building deep relationships and returning to materials with growing sophistication each year.',
 ARRAY['Children are self-directed learners when given the right environment', 'The teacher''s role is to observe and guide, not instruct', 'Mixed-age groups accelerate social and academic growth', 'Long uninterrupted work cycles build focus and deep learning'],
 ARRAY['Follow your child''s lead — notice what captures their interest', 'Offer "can I show you?" rather than directing', 'Allow children to repeat tasks until they feel satisfied'],
 ARRAY['philosophy'], ARRAY['montessori', 'method', 'approach', 'philosophy', 'introduction'], 1,
 now()),

(NULL, 'The Prepared Environment', 'prepared-environment', 'prepared_environment', ARRAY['all_ages']::hub_article_age_band[],
 'published',
 'How the physical and social environment is intentionally arranged to support independence, concentration, and natural development.',
 E'## What is the Prepared Environment?\n\nIn Montessori, the *prepared environment* is not just a tidy classroom — it is a carefully designed space that invites exploration, supports independence, and matches the child''s developmental needs.\n\n## Key Features\n\n**Beauty and order** — materials are displayed on low, accessible shelves. Everything has a place, and the order of the environment helps the child develop inner order.\n\n**Child-sized everything** — furniture, tools, and materials are sized for children so they can act with genuine independence.\n\n**Freedom of movement** — children choose where to work, may move around the room, and work on floor mats or tables.\n\n**Real materials** — glass cups, sharp knives (in Practical Life), real plants. When children are trusted with real things, they treat them with care.\n\n## The Three-Part Environment\n\n1. **Physical** — the arrangement of materials, furniture, and space\n2. **Social** — the community of children and adults\n3. **Temporal** — the rhythm of the day, including the uninterrupted 3-hour work cycle\n\n## At Home\n\nThe prepared environment at home doesn''t require a remodel — it starts with noticing what your child *can''t* reach that they want to, and finding small ways to offer access.',
 ARRAY['The environment is a teaching tool in itself', 'Order in the environment supports order within the child', 'Child-sized spaces invite genuine independence', 'Beauty and real materials foster respect and care'],
 ARRAY['Create a low shelf with a few carefully chosen toys or books', 'Let your child help set the table with real (not plastic) dishes', 'Keep one area of the home that is genuinely theirs to manage'],
 ARRAY['prepared_environment', 'philosophy'], ARRAY['environment', 'prepared', 'shelves', 'order', 'independence'], 2,
 now()),

-- Sensitive Periods
(NULL, 'Sensitive Periods in Child Development', 'sensitive-periods', 'sensitive_periods', ARRAY['birth_3', 'three_6', 'six_9']::hub_article_age_band[],
 'published',
 'Sensitive periods are windows of heightened neurological readiness where children learn certain skills almost effortlessly. Understanding them helps adults offer the right experiences at the right time.',
 E'## What are Sensitive Periods?\n\nDr Montessori observed that children pass through *sensitive periods* — phases of intense, focused interest in specific types of experience. During these windows, learning happens rapidly and joyfully. Outside these windows, the same learning requires much more effort.\n\nSensitive periods are **transient** (they pass), **universal** (all children experience them), and **powerful** (the child is almost compelled toward the relevant activity).\n\n## The Key Sensitive Periods\n\n| Period | Peak Window | Signs You''ll See |\n|---|---|---|\n| **Language** | Birth – 6 yrs | Explosion of words; fascination with sounds, letters |\n| **Order** | 1 – 3 yrs | Distress if routines change; insisting things go "back" |\n| **Small Objects** | 1 – 2 yrs | Intense focus on tiny things; picking up crumbs |\n| **Movement** | 1 – 4 yrs | Compelled to climb, carry, pour, repeat |\n| **Social Behaviour** | 2.5 – 6 yrs | Interest in groups, rules, manners |\n| **Music** | Birth – 6 yrs | Response to rhythm, song; humming, tapping |\n\n## What To Do\n\nThe guide''s job is to **observe** and **respond** — not to rush or manufacture sensitive periods. When a child is in a sensitive period, offer rich experiences. When it passes, move on without concern.\n\n## When a Period Is Blocked\n\nIf a child''s sensitive period is not met (e.g. the environment doesn''t offer what they need), they may show frustration, tantrums, or unusual behaviours. This is a signal, not a defect.',
 ARRAY['Sensitive periods are time-limited windows of optimal learning', 'Observation is the key to knowing which period a child is in', 'Blocking a sensitive period can cause frustration', 'Following the sensitive period with the right materials accelerates growth'],
 ARRAY['Watch for intense repetition — it signals a sensitive period in action', 'Resist the urge to "move on" when a child keeps repeating the same thing', 'Talk to your child''s guide about what sensitive periods are currently active'],
 ARRAY['sensitive_periods', 'language', 'child_development'], ARRAY['sensitive period', 'language', 'order', 'movement', 'development'], 3,
 now()),

-- Three Period Lesson
(NULL, 'The Three-Period Lesson', 'three-period-lesson', 'three_period_lesson', ARRAY['three_6', 'six_9', 'nine_12']::hub_article_age_band[],
 'published',
 'The Three-Period Lesson is the core teaching technique in Montessori — a three-step sequence that builds from introduction to recognition to recall, following the child''s pace.',
 E'## What is the Three-Period Lesson?\n\nThe Three-Period Lesson (3PL) is a sequence developed by Dr Séguin and refined by Dr Montessori for introducing vocabulary and concepts. It consists of three distinct stages that move from guided introduction to independent mastery.\n\n## The Three Periods\n\n### Period 1 — Introduction (The Naming Period)\n*"This is..."*\n\nThe guide presents the concept directly. "This is *rough*. This is *smooth*." Only one or two concepts at a time. The child listens and touches. No testing yet.\n\n### Period 2 — Association (The Recognition Period)\n*"Show me..."*\n\nThe guide asks the child to identify, without yet naming. "Show me rough." "Put your hand on smooth." This period can take days or weeks — the guide repeats it until the child responds easily. **This is where most of the learning happens.**\n\n### Period 3 — Recall (The Recall Period)\n*"What is this?"*\n\nNow the child names the concept independently. If they hesitate, the guide goes back to Period 2 — never corrects, never tests before the child is ready.\n\n## Why It Works\n\nThe 3PL separates *teaching* from *testing*. Children are never asked to perform before they''re ready. The adult tracks progress, not the child. This removes anxiety and builds genuine mastery.\n\n## What You''ll See in Reports\n\nIn your child''s progress reports, you may see materials listed as:\n- **Introduced** (Period 1 completed)\n- **Associating** (Period 2 in progress)\n- **Recalled** (Period 3 — mastered)',
 ARRAY['The three periods are: Introduction → Association → Recall', 'Period 2 (Association) is where most learning happens — it may last weeks', 'The guide never tests before the child is ready', 'If a child hesitates at Period 3, they return to Period 2 without correction'],
 ARRAY['When teaching your child something new, show it without quizzing first', 'Ask "show me..." before "what is this?" — recognition comes before recall', 'Praise the process ("you''re working hard") not the result ("you got it right")'],
 ARRAY['three_period_lesson', 'language', 'mathematics'], ARRAY['three period lesson', 'introduction', 'association', 'recall', 'teaching technique'], 4,
 now()),

-- Work Cycle
(NULL, 'The Three-Hour Work Cycle', 'three-hour-work-cycle', 'work_cycle', ARRAY['three_6', 'six_9', 'nine_12']::hub_article_age_band[],
 'published',
 'The three-hour uninterrupted work cycle is the heartbeat of a Montessori classroom. Understanding it helps families support deep focus at home too.',
 E'## What is the Work Cycle?\n\nIn a Montessori classroom, children have a minimum **three-hour uninterrupted block** of time — the *work cycle* — during which they choose their own work, move freely, and engage at their own pace. There are no bells, no forced transitions, no compulsory activities during this time.\n\n## Why Three Hours?\n\nResearch and observation show that genuine *deep work* (concentration, flow) takes time to develop within a single session. The first hour is often exploratory — the child settles, chooses materials, warms up. The second hour is where deep concentration often emerges. The third hour brings consolidation and a sense of completion.\n\nInterrupting the cycle repeatedly — for assemblies, specialist lessons, or early pickups — fragments this process and prevents deep learning.\n\n## The Normalisation Connection\n\nOver time, consistent uninterrupted work cycles lead to *normalisation* — the Montessori term for a child who has found their inner rhythm: calm, focused, self-directed, and joyful in their work. This is not a personality type; it''s a developmental achievement available to every child.\n\n## What Interruptions Look Like\n\nWhen the work cycle is regularly interrupted, children may:\n- Struggle to settle into work\n- Flit between activities without completing them\n- Show restlessness or low frustration tolerance\n- Seek adult direction rather than self-initiating\n\n## At Home\n\nYou can support deep work at home by offering **long stretches of uninterrupted play** — ideally 45–60 minutes without screen transitions, and without redirecting your child too quickly when they appear "just playing".',
 ARRAY['The 3-hour work cycle allows deep focus to develop naturally', 'Frequent interruptions fragment learning and prevent normalisation', 'Normalisation is the goal — calm, focused, self-directed children', 'Home environments can support deep work with uninterrupted play blocks'],
 ARRAY['Protect at least one 45-minute block of uninterrupted play each day', 'Resist redirecting your child when they''re focused, even if the activity seems simple', 'Arrive and depart at consistent times to protect the classroom work cycle'],
 ARRAY['work_cycle', 'normalization', 'philosophy'], ARRAY['work cycle', 'three hour', 'concentration', 'normalisation', 'deep work'], 5,
 now()),

-- Normalisation
(NULL, 'Understanding Normalisation', 'normalisation', 'normalization', ARRAY['three_6', 'six_9']::hub_article_age_band[],
 'published',
 'Normalisation is one of the most important and least understood concepts in Montessori — what it means, how it happens, and why it matters for your child''s development.',
 E'## What is Normalisation?\n\nIn Montessori, *normalisation* does not mean making children "normal" in a conformist sense. It describes the process by which a child finds their **natural developmental path** — becoming calm, focused, self-directed, and joyful in their work.\n\nA normalised child:\n- Chooses purposeful work and sticks with it\n- Is calm without being passive\n- Shows genuine care for others and the environment\n- Does not need external rewards or constant adult direction\n- Can repeat an activity many times with growing satisfaction\n\n## The Path to Normalisation\n\nNormalisation is not a switch — it''s a **process**. It requires:\n1. A properly prepared environment (order, beauty, accessible materials)\n2. Consistent three-hour work cycles without interruption\n3. Freedom of choice within appropriate limits\n4. Adults who observe without interfering unnecessarily\n\n## Signs of Emerging Normalisation\n\n- Your child talks about specific works from class with enthusiasm\n- They seek to repeat, complete, and put things back in order\n- They self-regulate frustration more easily than before\n- They show spontaneous generosity and social grace\n\n## What About Difficult Behaviour?\n\nDr Montessori described *deviations* — behaviours that emerge when a child''s developmental needs are unmet. These include both over-activity (running, shouting, disrupting) and under-activity (passivity, dependence, fantasy). Both can resolve as normalisation deepens.\n\nDeviations are not character flaws — they are signals.',
 ARRAY['Normalisation means finding natural focus, calm, and self-direction', 'It is a process, not a personality type — every child can achieve it', 'It requires consistent uninterrupted work time and freedom within structure', 'Difficult behaviours (deviations) can resolve as normalisation deepens'],
 ARRAY['Notice when your child is deeply absorbed and protect that state', 'Reduce screen time in the hours before school to support settling', 'Trust the process — normalisation often emerges over weeks, not days'],
 ARRAY['normalization', 'philosophy', 'child_development'], ARRAY['normalisation', 'normalization', 'focus', 'concentration', 'deviation', 'self-directed'], 6,
 now()),

-- Language
(NULL, 'How Montessori Teaches Reading', 'montessori-reading', 'language', ARRAY['birth_3', 'three_6']::hub_article_age_band[],
 'published',
 'Montessori takes a phonics-first, hands-on approach to reading — starting with sounds before letters, and letters before whole words. Here''s how it unfolds.',
 E'## The Montessori Language Sequence\n\nMontessori literacy begins long before a child holds a pencil. The sequence is intentional, multi-sensory, and moves at the child''s pace.\n\n## Stage 1 — Oral Language (Birth – 3)\n\nRich spoken language is the foundation. Guides and parents speak clearly and fully, naming everything, telling stories, singing songs. Vocabulary is built through real experience — not flashcards.\n\n## Stage 2 — Phonemic Awareness (3 – 4)\n\nChildren learn to hear the **sounds** in words before they see letters. Games like *I Spy* ("I spy something that starts with /mmm/") train the ear. The child learns that words are made of sounds.\n\n## Stage 3 — Sandpaper Letters\n\nChildren meet letters through touch and sound simultaneously. Each sandpaper letter card lets the child trace the letter shape while the guide says the *sound* (not the name). "This says /s/." The multi-sensory experience encodes the phoneme deeply.\n\n## Stage 4 — The Moveable Alphabet\n\nBefore children can write fluently, they can *encode* words using large wooden letters. "Can you build *cat*?" The moveable alphabet allows composition without the motor demand of handwriting.\n\n## Stage 5 — Blending and Decoding\n\nPhonetic reading begins with short, regular words. Then word families. Then exceptions. The progression is systematic but always follows the child''s readiness.\n\n## Stage 6 — Explosion into Reading\n\nMany Montessori children experience a sudden *explosion* — reading ability that seems to appear overnight. This is the result of months of phonemic preparation coming together.',
 ARRAY['Montessori literacy starts with sounds, not letter names', 'Sandpaper letters encode phonemes through touch and sound simultaneously', 'The moveable alphabet allows composition before handwriting is fluent', 'A reading explosion is the result of invisible phonemic preparation'],
 ARRAY['Read aloud daily — varied vocabulary matters more than the book level', 'Play oral sound games: "what sound does dog start with?"', 'Never force reading — follow your child''s curiosity'],
 ARRAY['language'], ARRAY['reading', 'phonics', 'sandpaper letters', 'moveable alphabet', 'literacy', 'phonemic'], 7,
 now()),

-- Mathematics
(NULL, 'Montessori Mathematics — Concrete to Abstract', 'montessori-mathematics', 'mathematics', ARRAY['three_6', 'six_9', 'nine_12']::hub_article_age_band[],
 'published',
 'In Montessori, every mathematical concept is introduced with beautiful physical materials before numbers are written. This grounds abstract thinking in real experience.',
 E'## Why Concrete First?\n\nDr Montessori observed that young children understand the physical world before the symbolic. A child who can feel the difference between 1 bead and 1000 beads understands magnitude in a way no worksheet can provide.\n\nThe Montessori approach to mathematics follows a consistent arc: **concrete → pictorial → abstract**.\n\n## Key Materials and What They Teach\n\n**Number Rods** — quantities 1–10 in proportional red-and-blue rods. The child holds "ten" and "one" simultaneously, internalising their relationship.\n\n**Sandpaper Numbers** — like sandpaper letters, these encode the numeral symbol through touch.\n\n**Spindle Boxes** — introduce *zero* as a concept (an empty box = nothing).\n\n**Golden Bead Material** — units, tens, hundreds, thousands in physical beads. Children carry thousands-cubes, building a felt sense of place value before learning the algorithm.\n\n**Stamp Game** — the first step toward abstraction: coloured tiles represent place value, but the beads are gone.\n\n**Checkerboard and Bead Frames** — multiplication and large number operations using progressively abstract representations.\n\n## Why Children Love It\n\nMontessori maths materials are *beautiful* and *purposeful*. Children work with them independently, check their own work (built-in error control), and progress at their own pace. There is no stigma around taking longer — the material itself shows the child if they''re right.',
 ARRAY['All maths begins with physical materials, not symbols', 'The Golden Bead Material builds a felt sense of place value', 'Children check their own work through built-in error control', 'The arc is always concrete → pictorial → abstract'],
 ARRAY['Count real objects (beans, buttons, steps) rather than just numbers on paper', 'Cook together — measuring and dividing are powerful maths experiences', 'Ask "how many do you think?" before counting — estimation matters'],
 ARRAY['mathematics'], ARRAY['mathematics', 'golden beads', 'concrete', 'abstract', 'place value', 'numeration'], 8,
 now()),

-- Practical Life
(NULL, 'Why Practical Life Matters', 'practical-life', 'practical_life', ARRAY['birth_3', 'three_6']::hub_article_age_band[],
 'published',
 'Practical Life activities — pouring, sweeping, buttoning, cooking — are not just chores. They are the foundation of concentration, coordination, independence, and self-confidence.',
 E'## More Than Chores\n\nPractical Life in Montessori encompasses all activities that help children care for themselves, their environment, and others. Pouring water without spilling. Washing a table. Folding a cloth. Preparing a snack.\n\nTo adults these seem trivial. To a child between 2 and 6, they are profoundly important.\n\n## What Practical Life Develops\n\n**Concentration** — practical life activities have a clear beginning, middle, and end. Children repeat them until they achieve mastery, building the attention span that underpins all future learning.\n\n**Coordination** — the fine and gross motor control required for pouring, spooning, and transferring prepares the hand for writing.\n\n**Independence** — when children can dress themselves, pour their own drink, and clean up their own mess, their self-concept transforms.\n\n**Order** — practical life sequences are predictable and complete. Working through a sequence builds the child''s sense of inner order.\n\n**Care for Others** — activities like flower arranging, table setting, and food preparation connect children to their community.\n\n## The Indirect Purpose\n\nEvery Montessori material has a *direct* purpose (washing hands) and an *indirect* purpose (building focus, developing grip). The child doesn''t need to know this — the guide does.\n\n## At Home\n\nPractical life at home is the original Montessori environment. Let your child help — even if it''s slower, messier, and less efficient. The development is worth it.',
 ARRAY['Practical Life builds concentration, coordination, independence, and order', 'Each activity has a direct purpose and an indirect developmental purpose', 'Repetition until mastery is the goal — never rush the child', 'Home is the richest practical life environment available'],
 ARRAY['Let your child help with real tasks: cooking, cleaning, gardening', 'Resist the urge to do it faster yourself — the process is the point', 'Set up a low shelf with cleaning materials sized for your child'],
 ARRAY['practical_life', 'child_development'], ARRAY['practical life', 'independence', 'coordination', 'concentration', 'pouring', 'care'], 9,
 now()),

-- Home Connection
(NULL, 'Supporting Montessori at Home', 'montessori-at-home', 'home_connection', ARRAY['all_ages']::hub_article_age_band[],
 'published',
 'You don''t need to buy Montessori materials to extend the approach at home. Small shifts in how you set up space, respond to children, and structure time can make a meaningful difference.',
 E'## The Home as Prepared Environment\n\nYour home is already a Montessori environment — it just needs a few intentional adjustments. You don''t need to buy anything from a Montessori catalogue.\n\n## Five Shifts That Make a Difference\n\n### 1. Lower Everything\nChildren gain independence when they can access things themselves. A low hook for bags and coats. A step stool at the sink. A shelf at their height with a rotation of a few toys. These small changes communicate: *you are capable*.\n\n### 2. Say Yes to Real Tasks\nLet your child sweep (badly). Pour their own water (with spills). Help cook (slower than you''d like). The mess and inefficiency are temporary. The capability is permanent.\n\n### 3. Slow Down Your Language\nMontessori guides speak slowly and clearly, name things precisely, and use full sentences. When you narrate what you''re doing ("I''m putting the red lid on the blue pot"), you build vocabulary in context.\n\n### 4. Follow the Child\nWhen your child is deeply absorbed in something — stacking stones, lining up toys, drawing the same shape over and over — protect that time. Don''t redirect. Don''t add. The absorption is the learning.\n\n### 5. Step Back Before Helping\nBefore stepping in to help, wait. Wait a little longer than feels comfortable. Children often solve the problem themselves if adults resist the reflex to assist immediately. When you do help, ask "would you like help with that?" rather than just taking over.\n\n## What To Discuss With the Guide\n\nIf you''re ever unsure whether what you''re doing at home supports or conflicts with the classroom approach, ask your guide. They love these conversations.',
 ARRAY['Independence grows when children can access things themselves', 'Real tasks (cooking, cleaning) develop capability, not just skill', 'Following the child''s deep focus protects the work cycle', 'Slow your help — wait before assisting'],
 ARRAY['Set up one area of the home your child manages entirely', 'Establish a daily rhythm: children thrive with predictable structure', 'Keep screen time away from sleep and settled play windows'],
 ARRAY['home_connection', 'philosophy', 'practical_life'], ARRAY['home', 'parents', 'montessori at home', 'independence', 'support', 'practical'], 10,
 now());
