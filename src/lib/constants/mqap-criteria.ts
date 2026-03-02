// src/lib/constants/mqap-criteria.ts
//
// ============================================================
// WattleOS V2 - Module K: MQ:AP Criteria Master Data
// ============================================================
// Montessori Quality: Authentic Practice (MQ:AP) is Montessori
// Australia's voluntary accreditation framework. It mirrors the
// 7 NQS Quality Areas but layers Montessori-specific criteria
// on top. Each MQ:AP criterion maps to one or more NQS elements.
//
// Source: Montessori Australia Foundation (MAF) MQ:AP Handbook
// ============================================================

export interface MqapCriterionDef {
  code: string;
  quality_area: number;
  standard_number: string;
  criterion_number: string;
  criterion_text: string;
  guidance: string | null;
  nqs_element_alignment: string | null;
}

export interface MqapStandardDef {
  id: string;
  name: string;
  criteria: MqapCriterionDef[];
}

export interface MqapQualityAreaDef {
  id: number;
  name: string;
  standards: MqapStandardDef[];
}

// ============================================================
// MQ:AP Quality Areas, Standards & Criteria
// ============================================================

export const MQAP_QUALITY_AREAS: MqapQualityAreaDef[] = [
  {
    id: 1,
    name: "Educational Program and Practice",
    standards: [
      {
        id: "MQ1.1",
        name: "The Prepared Environment",
        criteria: [
          {
            code: "MQ1.1.1",
            quality_area: 1,
            standard_number: "MQ1.1",
            criterion_number: "MQ1.1.1",
            criterion_text:
              "The learning environment is prepared according to Montessori principles, with materials arranged in developmental sequence on open shelving accessible to all children.",
            guidance:
              "Materials are complete, clean, and in good repair. Each material has a designated place. The environment is aesthetically inviting and uncluttered.",
            nqs_element_alignment: "1.1.1",
          },
          {
            code: "MQ1.1.2",
            quality_area: 1,
            standard_number: "MQ1.1",
            criterion_number: "MQ1.1.2",
            criterion_text:
              "Materials span the five Montessori curriculum areas (Practical Life, Sensorial, Language, Mathematics, Cultural/Cosmic Education) appropriate to the age group served.",
            guidance:
              "0–3: emphasis on Practical Life, Sensorial, and early Language. 3–6: full five-area complement. 6–12: transition to abstraction, research, and going-out.",
            nqs_element_alignment: "1.1.2",
          },
          {
            code: "MQ1.1.3",
            quality_area: 1,
            standard_number: "MQ1.1",
            criterion_number: "MQ1.1.3",
            criterion_text:
              "The environment supports freedom of movement and choice, with ground rules that enable children to select, use, and return materials independently.",
            guidance:
              "Children are not confined to assigned seats. Work mats and tables are available. Transition between activities is child-directed.",
            nqs_element_alignment: "1.1.3",
          },
        ],
      },
      {
        id: "MQ1.2",
        name: "The Uninterrupted Work Cycle",
        criteria: [
          {
            code: "MQ1.2.1",
            quality_area: 1,
            standard_number: "MQ1.2",
            criterion_number: "MQ1.2.1",
            criterion_text:
              "A minimum three-hour uninterrupted work cycle is scheduled daily for 3–6 and 6–12 environments; age-appropriate work periods for 0–3.",
            guidance:
              "Interruptions (whole-group activities, specialist pull-outs) are minimised during the work cycle. Any interruption is documented with reason.",
            nqs_element_alignment: "1.2.1",
          },
          {
            code: "MQ1.2.2",
            quality_area: 1,
            standard_number: "MQ1.2",
            criterion_number: "MQ1.2.2",
            criterion_text:
              "Educators observe and document children's concentration, repetition, and engagement during the work cycle to inform planning.",
            guidance:
              "Observations note child-chosen materials, duration of engagement, and quality of concentration. Records are maintained for each child.",
            nqs_element_alignment: "1.2.2",
          },
        ],
      },
      {
        id: "MQ1.3",
        name: "Individualised Learning",
        criteria: [
          {
            code: "MQ1.3.1",
            quality_area: 1,
            standard_number: "MQ1.3",
            criterion_number: "MQ1.3.1",
            criterion_text:
              "Lessons are presented individually or in small groups, following the child's readiness and interest rather than a fixed whole-class schedule.",
            guidance:
              "Lesson records show individual presentation dates. Curriculum progression follows the child, not a calendar.",
            nqs_element_alignment: "1.3.1",
          },
          {
            code: "MQ1.3.2",
            quality_area: 1,
            standard_number: "MQ1.3",
            criterion_number: "MQ1.3.2",
            criterion_text:
              "Each child's progress is tracked through all five curriculum areas using a lesson record system that shows presentation stage (introduction, practice, mastery).",
            guidance:
              "The tracking system should be accessible to educators for planning. It replaces or supplements standardised testing.",
            nqs_element_alignment: "1.3.2",
          },
        ],
      },
    ],
  },
  {
    id: 2,
    name: "Children's Health and Safety",
    standards: [
      {
        id: "MQ2.1",
        name: "Child Wellbeing and Independence",
        criteria: [
          {
            code: "MQ2.1.1",
            quality_area: 2,
            standard_number: "MQ2.1",
            criterion_number: "MQ2.1.1",
            criterion_text:
              "Health and safety practices are implemented in ways that maximise children's independence: child-height sinks, self-service snack, child-managed routines.",
            guidance:
              "Practical Life activities include real food preparation, cleaning, and self-care. Risk is managed, not eliminated.",
            nqs_element_alignment: "2.1.1",
          },
          {
            code: "MQ2.1.2",
            quality_area: 2,
            standard_number: "MQ2.1",
            criterion_number: "MQ2.1.2",
            criterion_text:
              "Children participate in maintaining the prepared environment: cleaning, caring for plants and animals, and managing personal belongings.",
            guidance:
              "These tasks are not chores but purposeful activities that develop concentration, coordination, independence, and order.",
            nqs_element_alignment: "2.1.2",
          },
        ],
      },
      {
        id: "MQ2.2",
        name: "Child Safety and Protection",
        criteria: [
          {
            code: "MQ2.2.1",
            quality_area: 2,
            standard_number: "MQ2.2",
            criterion_number: "MQ2.2.1",
            criterion_text:
              "Real tools and materials (glass, ceramics, kitchen implements) are used under guidance, with clear ground rules about safe handling taught through lessons.",
            guidance:
              "Montessori environments deliberately include breakable items to teach care and respect. Safety rules are demonstrated, not just stated.",
            nqs_element_alignment: "2.2.1",
          },
        ],
      },
    ],
  },
  {
    id: 3,
    name: "Physical Environment",
    standards: [
      {
        id: "MQ3.1",
        name: "Child-Scaled Environment",
        criteria: [
          {
            code: "MQ3.1.1",
            quality_area: 3,
            standard_number: "MQ3.1",
            criterion_number: "MQ3.1.1",
            criterion_text:
              "Furniture, fixtures, and materials are child-scaled: low shelving, child-height tables and chairs, accessible outdoor areas.",
            guidance:
              "Adult-sized furniture is minimised. The environment communicates 'this space belongs to you' to the child.",
            nqs_element_alignment: "3.1.1",
          },
          {
            code: "MQ3.1.2",
            quality_area: 3,
            standard_number: "MQ3.1",
            criterion_number: "MQ3.1.2",
            criterion_text:
              "The indoor environment is divided into clearly defined curriculum areas with logical flow between them.",
            guidance:
              "Practical Life near water source, Sensorial in a quieter zone, Art near natural light. Traffic patterns do not interrupt concentrated work.",
            nqs_element_alignment: "3.1.2",
          },
        ],
      },
      {
        id: "MQ3.2",
        name: "Natural and Aesthetic Space",
        criteria: [
          {
            code: "MQ3.2.1",
            quality_area: 3,
            standard_number: "MQ3.2",
            criterion_number: "MQ3.2.1",
            criterion_text:
              "The environment prioritises natural materials (wood, metal, glass, fabric) over plastic. Artwork, plants, and natural elements are incorporated.",
            guidance:
              "Beauty and order are deliberate design principles. The space reflects the quality of adult spaces, not a stereotypical 'childcare' aesthetic.",
            nqs_element_alignment: "3.2.1",
          },
          {
            code: "MQ3.2.2",
            quality_area: 3,
            standard_number: "MQ3.2",
            criterion_number: "MQ3.2.2",
            criterion_text:
              "Outdoor environments extend the prepared environment: gardening, nature exploration, gross motor, and sensorial experiences in natural settings.",
            guidance:
              "Outdoor time is not separate from curriculum. Work cycle may extend outdoors. Nature walks and going-out excursions are regular.",
            nqs_element_alignment: "3.2.2",
          },
        ],
      },
    ],
  },
  {
    id: 4,
    name: "Staffing Arrangements",
    standards: [
      {
        id: "MQ4.1",
        name: "Montessori-Qualified Educators",
        criteria: [
          {
            code: "MQ4.1.1",
            quality_area: 4,
            standard_number: "MQ4.1",
            criterion_number: "MQ4.1.1",
            criterion_text:
              "Each environment is led by an educator holding a recognised Montessori credential (AMI, AMS, MWEI, or Montessori Australia-approved) for the age group served.",
            guidance:
              "Credential must match age range: 0–3, 3–6, 6–9, 6–12, or 12–18. The lead educator is the person responsible for lesson presentations.",
            nqs_element_alignment: "4.1.1",
          },
          {
            code: "MQ4.1.2",
            quality_area: 4,
            standard_number: "MQ4.1",
            criterion_number: "MQ4.1.2",
            criterion_text:
              "Staff engage in ongoing Montessori professional development, including peer observation, conference attendance, and study of Montessori philosophy.",
            guidance:
              "Professional development includes both regulatory requirements (first aid, child protection) and Montessori-specific growth.",
            nqs_element_alignment: "4.1.2",
          },
        ],
      },
      {
        id: "MQ4.2",
        name: "The Montessori Guide Role",
        criteria: [
          {
            code: "MQ4.2.1",
            quality_area: 4,
            standard_number: "MQ4.2",
            criterion_number: "MQ4.2.1",
            criterion_text:
              "Educators understand and practice the Montessori role as 'guide': observing before intervening, following the child's lead, and stepping back as competence develops.",
            guidance:
              "The educator's primary tool is observation, not direction. Lessons are offered, not imposed. Praise is specific and non-evaluative.",
            nqs_element_alignment: "4.2.1",
          },
        ],
      },
    ],
  },
  {
    id: 5,
    name: "Relationships with Children",
    standards: [
      {
        id: "MQ5.1",
        name: "Respect and Dignity",
        criteria: [
          {
            code: "MQ5.1.1",
            quality_area: 5,
            standard_number: "MQ5.1",
            criterion_number: "MQ5.1.1",
            criterion_text:
              "Interactions with children demonstrate fundamental respect: speaking at the child's level, waiting for the child to finish before speaking, using courteous language.",
            guidance:
              "Grace and courtesy lessons are part of the Practical Life curriculum. Adults model the behaviour expected of children.",
            nqs_element_alignment: "5.1.1",
          },
          {
            code: "MQ5.1.2",
            quality_area: 5,
            standard_number: "MQ5.1",
            criterion_number: "MQ5.1.2",
            criterion_text:
              "Conflict resolution is facilitated by the educator using peace education principles: the peace table, mediation, and non-punitive approaches.",
            guidance:
              "Children are guided to resolve conflicts themselves. Punishments, time-outs, and reward charts are not used.",
            nqs_element_alignment: "5.1.2",
          },
        ],
      },
      {
        id: "MQ5.2",
        name: "Mixed-Age Grouping",
        criteria: [
          {
            code: "MQ5.2.1",
            quality_area: 5,
            standard_number: "MQ5.2",
            criterion_number: "MQ5.2.1",
            criterion_text:
              "Children are grouped in three-year age spans (0–3, 3–6, 6–9, 9–12) to enable peer mentoring, leadership development, and social learning.",
            guidance:
              "Mixed-age grouping is a non-negotiable Montessori principle. Single-age grouping within a Montessori environment is a red flag.",
            nqs_element_alignment: "5.2.1",
          },
        ],
      },
    ],
  },
  {
    id: 6,
    name: "Collaborative Partnerships with Families and Communities",
    standards: [
      {
        id: "MQ6.1",
        name: "Family Understanding of Montessori",
        criteria: [
          {
            code: "MQ6.1.1",
            quality_area: 6,
            standard_number: "MQ6.1",
            criterion_number: "MQ6.1.1",
            criterion_text:
              "Families are supported to understand Montessori philosophy and practice through orientation sessions, observation opportunities, and ongoing communication.",
            guidance:
              "Parent education is not optional. Families should be invited to observe the classroom and understand why the approach differs from conventional schooling.",
            nqs_element_alignment: "6.1.1",
          },
          {
            code: "MQ6.1.2",
            quality_area: 6,
            standard_number: "MQ6.1",
            criterion_number: "MQ6.1.2",
            criterion_text:
              "Progress reporting to families reflects Montessori assessment methods: narrative observations, lesson records, and portfolio evidence rather than grades or comparative rankings.",
            guidance:
              "Report cards, if used, are supplemented with or replaced by narrative descriptions of the child's development across all areas.",
            nqs_element_alignment: "6.1.2",
          },
        ],
      },
      {
        id: "MQ6.2",
        name: "Community Connections",
        criteria: [
          {
            code: "MQ6.2.1",
            quality_area: 6,
            standard_number: "MQ6.2",
            criterion_number: "MQ6.2.1",
            criterion_text:
              "The service connects with the broader Montessori community: membership in Montessori Australia, participation in Montessori events, and engagement with the wider Montessori movement.",
            guidance:
              "Isolation from the Montessori community limits quality improvement. Active engagement signals commitment to authentic practice.",
            nqs_element_alignment: "6.2.1",
          },
        ],
      },
    ],
  },
  {
    id: 7,
    name: "Governance and Leadership",
    standards: [
      {
        id: "MQ7.1",
        name: "Montessori Philosophy in Governance",
        criteria: [
          {
            code: "MQ7.1.1",
            quality_area: 7,
            standard_number: "MQ7.1",
            criterion_number: "MQ7.1.1",
            criterion_text:
              "The service's governance structure demonstrates commitment to Montessori principles: the mission statement references Montessori philosophy, and strategic decisions consider Montessori authenticity.",
            guidance:
              "Board or management decisions about class size, staffing, and environment should be Montessori-informed, not purely commercial.",
            nqs_element_alignment: "7.1.1",
          },
          {
            code: "MQ7.1.2",
            quality_area: 7,
            standard_number: "MQ7.1",
            criterion_number: "MQ7.1.2",
            criterion_text:
              "The service has a documented Montessori-specific quality improvement process that aligns with and extends the NQS QIP to address authentic practice standards.",
            guidance:
              "This MQ:AP self-assessment IS that process. If this criterion is unmet, the very act of completing this framework addresses it.",
            nqs_element_alignment: "7.1.2",
          },
        ],
      },
      {
        id: "MQ7.2",
        name: "Educational Leadership",
        criteria: [
          {
            code: "MQ7.2.1",
            quality_area: 7,
            standard_number: "MQ7.2",
            criterion_number: "MQ7.2.1",
            criterion_text:
              "Educational leadership is held by a Montessori-qualified professional who mentors staff, maintains curriculum integrity, and champions the prepared environment.",
            guidance:
              "The educational leader may be the principal, director, or a dedicated pedagogical coordinator. They must hold a Montessori credential.",
            nqs_element_alignment: "7.2.1",
          },
        ],
      },
    ],
  },
];

// Total number of MQ:AP criteria across all QAs
export const MQAP_TOTAL_CRITERIA = MQAP_QUALITY_AREAS.reduce(
  (sum, qa) =>
    sum + qa.standards.reduce((sSum, s) => sSum + s.criteria.length, 0),
  0,
);

// Flatten all criteria for iteration
export const MQAP_ALL_CRITERIA: MqapCriterionDef[] = MQAP_QUALITY_AREAS.flatMap(
  (qa) => qa.standards.flatMap((s) => s.criteria),
);

// Lookup: criterion code → QA number
export const MQAP_QA_FOR_CRITERION: Record<string, number> = Object.fromEntries(
  MQAP_ALL_CRITERIA.map((c) => [c.code, c.quality_area]),
);
