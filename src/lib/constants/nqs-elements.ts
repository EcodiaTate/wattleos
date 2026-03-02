// src/lib/constants/nqs-elements.ts
//
// ============================================================
// WattleOS V2 - NQS Quality Areas, Standards & Elements
// ============================================================
// The National Quality Standard (NQS) is the benchmark for
// quality in Australian early childhood education. This file
// defines all 7 Quality Areas, 18 Standards, and 58 Elements
// as revised effective 1 January 2026.
//
// Key 2026 revisions:
//   - Element 2.2.3 → "Child safety and protection" (formerly
//     "Management of medications")
//   - QA7 updated with strengthened child safety governance
//
// This is a compile-time constant - not stored in the database.
// The DB stores element IDs as strings (e.g. '1.1.1') in the
// qip_element_assessments table.
// ============================================================

import type { QipEvidenceType } from "@/types/domain";

// ============================================================
// Type Definitions
// ============================================================

export interface NqsElement {
  /** Element identifier, e.g. '1.1.1' */
  id: string;
  /** Short name, e.g. 'Approved learning framework' */
  name: string;
  /** Full concept text from NQS */
  description: string;
}

export interface NqsStandard {
  /** Standard identifier, e.g. '1.1' */
  id: string;
  /** Standard name, e.g. 'The educational program' */
  name: string;
  /** Elements within this standard */
  elements: NqsElement[];
}

export interface NqsQualityArea {
  /** Quality Area number, 1-7 */
  id: number;
  /** Quality Area name */
  name: string;
  /** Brief description */
  description: string;
  /** Key regulation references */
  regulationRef: string;
  /** Standards within this QA */
  standards: NqsStandard[];
}

// ============================================================
// NQS Data (Revised 1 January 2026)
// ============================================================

export const NQS_QUALITY_AREAS: NqsQualityArea[] = [
  // ── QA1: Educational program and practice ─────────────────
  {
    id: 1,
    name: "Educational program and practice",
    description:
      "The educational program and practice is stimulating, engaging and enhances children's learning and development.",
    regulationRef: "Reg 73–76, 254, 255, 274",
    standards: [
      {
        id: "1.1",
        name: "The educational program",
        elements: [
          {
            id: "1.1.1",
            name: "Approved learning framework",
            description:
              "Curriculum decision-making contributes to each child's learning and development outcomes in relation to their identity, connection with community, wellbeing, and becoming confident and involved learners and effective communicators.",
          },
          {
            id: "1.1.2",
            name: "Child-directed learning",
            description:
              "Each child's current knowledge, strengths, ideas, culture, abilities and interests are the foundation of the program.",
          },
          {
            id: "1.1.3",
            name: "Program learning opportunities",
            description:
              "All aspects of the program, including routines, are organised in ways that maximise opportunities for each child's learning.",
          },
        ],
      },
      {
        id: "1.2",
        name: "Practice",
        elements: [
          {
            id: "1.2.1",
            name: "Intentional teaching",
            description:
              "Educators are deliberate, purposeful, and thoughtful in their decisions and actions.",
          },
          {
            id: "1.2.2",
            name: "Responsive teaching and scaffolding",
            description:
              "Educators respond to children's ideas and play and extend children's learning through open-ended questions, interactions and feedback.",
          },
          {
            id: "1.2.3",
            name: "Child directed learning",
            description:
              "Each child's agency is promoted, enabling them to make choices and decisions that influence events and their world.",
          },
        ],
      },
      {
        id: "1.3",
        name: "Assessment and planning",
        elements: [
          {
            id: "1.3.1",
            name: "Assessment and planning cycle",
            description:
              "Each child's learning and development is assessed or evaluated as part of an ongoing cycle of observation, analysing learning, documentation, planning, implementation and reflection.",
          },
          {
            id: "1.3.2",
            name: "Critical reflection",
            description:
              "Critical reflection on children's learning and development, both as individuals and in groups, drives program planning and implementation.",
          },
          {
            id: "1.3.3",
            name: "Information for families",
            description:
              "Families are informed about and contribute to assessment and planning processes that are related to their child's learning, development, health and wellbeing.",
          },
        ],
      },
    ],
  },

  // ── QA2: Children's health and safety ─────────────────────
  {
    id: 2,
    name: "Children's health and safety",
    description:
      "Each child's health and safety is promoted and protected through effective supervision and best practice health and safety procedures.",
    regulationRef: "Reg 77–87, 168(2)(a)–(b)",
    standards: [
      {
        id: "2.1",
        name: "Health",
        elements: [
          {
            id: "2.1.1",
            name: "Wellbeing and comfort",
            description:
              "Each child's wellbeing and comfort is provided for, including appropriate opportunities to meet each child's need for sleep, rest and relaxation.",
          },
          {
            id: "2.1.2",
            name: "Health practices and procedures",
            description:
              "Effective illness and injury management and hygiene practices are promoted and implemented.",
          },
          {
            id: "2.1.3",
            name: "Healthy lifestyle",
            description:
              "Healthy eating and physical activity are promoted and appropriate for each child.",
          },
        ],
      },
      {
        id: "2.2",
        name: "Safety",
        elements: [
          {
            id: "2.2.1",
            name: "Supervision",
            description:
              "At all times, reasonable precautions and adequate supervision ensure children are protected from harm and hazard.",
          },
          {
            id: "2.2.2",
            name: "Incident and emergency management",
            description:
              "Plans to effectively manage incidents and emergencies are developed in consultation with relevant authorities, practised and implemented.",
          },
          {
            id: "2.2.3",
            name: "Child safety and protection",
            description:
              "Management, educators and staff are aware of their roles and responsibilities to identify and respond to every child at risk of abuse or neglect.",
          },
        ],
      },
    ],
  },

  // ── QA3: Physical environment ─────────────────────────────
  {
    id: 3,
    name: "Physical environment",
    description:
      "The physical environment is safe, suitable and provides a rich and diverse range of experiences that promotes children's learning and development.",
    regulationRef: "Reg 103–115",
    standards: [
      {
        id: "3.1",
        name: "Design",
        elements: [
          {
            id: "3.1.1",
            name: "Fit for purpose",
            description:
              "Outdoor and indoor spaces, buildings, fixtures and fittings are suitable for their purpose, including supporting the access of every child.",
          },
          {
            id: "3.1.2",
            name: "Upkeep",
            description:
              "Premises, furniture and equipment are safe, clean and well maintained.",
          },
        ],
      },
      {
        id: "3.2",
        name: "Use",
        elements: [
          {
            id: "3.2.1",
            name: "Inclusive environment",
            description:
              "Outdoor and indoor spaces are organised and adapted to support every child's participation and to engage every child in quality experiences in both built and natural environments.",
          },
          {
            id: "3.2.2",
            name: "Resources support play-based learning",
            description:
              "Resources, materials and equipment allow for multiple uses, are sufficient in number, and enable every child to engage in play-based learning.",
          },
          {
            id: "3.2.3",
            name: "Environmentally responsible",
            description:
              "The service cares for the environment and supports children to become environmentally responsible.",
          },
        ],
      },
    ],
  },

  // ── QA4: Staffing arrangements ────────────────────────────
  {
    id: 4,
    name: "Staffing arrangements",
    description:
      "Staffing arrangements enhance children's learning and development, and ensure the safety and wellbeing of children.",
    regulationRef: "Reg 115–120, 123–128, 136, 145–152",
    standards: [
      {
        id: "4.1",
        name: "Staffing arrangements",
        elements: [
          {
            id: "4.1.1",
            name: "Organisation of educators",
            description:
              "The organisation of educators across the service is managed to ensure the safety, health and wellbeing of children is prioritised at all times.",
          },
          {
            id: "4.1.2",
            name: "Continuity of staff",
            description:
              "Every effort is made to ensure children experience continuity of educators at the service.",
          },
        ],
      },
      {
        id: "4.2",
        name: "Professionalism",
        elements: [
          {
            id: "4.2.1",
            name: "Professional collaboration",
            description:
              "Management, educators and staff work with mutual respect and collaboratively, and challenge and learn from each other, recognising each other's strengths and skills.",
          },
          {
            id: "4.2.2",
            name: "Professional standards",
            description:
              "Professional standards guide practice, interactions and relationships.",
          },
        ],
      },
    ],
  },

  // ── QA5: Relationships with children ──────────────────────
  {
    id: 5,
    name: "Relationships with children",
    description:
      "Respectful and equitable relationships are maintained with each child, promoting their sense of security, confidence and inclusion.",
    regulationRef: "Reg 155–156",
    standards: [
      {
        id: "5.1",
        name: "Relationships between educators and children",
        elements: [
          {
            id: "5.1.1",
            name: "Positive educator to child interactions",
            description:
              "Responsive and meaningful interactions build trusting relationships which engage and support each child to feel secure, confident and included.",
          },
          {
            id: "5.1.2",
            name: "Dignity and rights of the child",
            description:
              "The dignity and the rights of every child are maintained.",
          },
        ],
      },
      {
        id: "5.2",
        name: "Relationships between children",
        elements: [
          {
            id: "5.2.1",
            name: "Collaborative learning",
            description:
              "Children are supported to collaborate, learn from and help each other.",
          },
          {
            id: "5.2.2",
            name: "Self-regulation",
            description:
              "Each child is supported to manage their own behaviour, respond appropriately to the behaviour of others and communicate effectively to resolve conflicts.",
          },
        ],
      },
    ],
  },

  // ── QA6: Collaborative partnerships ───────────────────────
  {
    id: 6,
    name: "Collaborative partnerships with families and communities",
    description:
      "Collaborative partnerships enhance children's inclusion, learning and wellbeing, and support families' participation in the education and care of their child.",
    regulationRef: "Reg 157",
    standards: [
      {
        id: "6.1",
        name: "Supportive relationships with families",
        elements: [
          {
            id: "6.1.1",
            name: "Engagement with the service",
            description:
              "Families are supported from enrolment to be involved in the service and contribute to service decisions.",
          },
          {
            id: "6.1.2",
            name: "Parent views are respected",
            description:
              "The expertise, culture, values, beliefs and child rearing practices of families are respected, and families share in decision-making about their child's learning and wellbeing.",
          },
          {
            id: "6.1.3",
            name: "Families are supported",
            description:
              "Current information is available to families about the service and relevant community services and resources to support parenting and family wellbeing.",
          },
        ],
      },
      {
        id: "6.2",
        name: "Collaborative partnerships",
        elements: [
          {
            id: "6.2.1",
            name: "Transitions",
            description:
              "Continuity of learning and transitions for each child are supported by sharing information and clarifying responsibilities.",
          },
          {
            id: "6.2.2",
            name: "Access and participation",
            description:
              "Effective partnerships support children's access, inclusion and participation in the program.",
          },
          {
            id: "6.2.3",
            name: "Community engagement",
            description:
              "The service builds relationships and engages with its community.",
          },
        ],
      },
    ],
  },

  // ── QA7: Governance and leadership ────────────────────────
  {
    id: 7,
    name: "Governance and leadership",
    description:
      "Effective leadership and governance of the service contributes to quality environments for children's learning and development, and ensures the safety and wellbeing of children.",
    regulationRef: "Reg 168–170, 172–177",
    standards: [
      {
        id: "7.1",
        name: "Governance",
        elements: [
          {
            id: "7.1.1",
            name: "Service philosophy and purposes",
            description:
              "A statement of philosophy guides all aspects of the service's operations.",
          },
          {
            id: "7.1.2",
            name: "Management systems",
            description:
              "Systems are in place to manage risk and enable the effective management and operation of a quality service.",
          },
          {
            id: "7.1.3",
            name: "Roles and responsibilities",
            description:
              "Roles and responsibilities are clearly defined, and understood, and support effective decision-making and operation of the service.",
          },
        ],
      },
      {
        id: "7.2",
        name: "Leadership",
        elements: [
          {
            id: "7.2.1",
            name: "Continuous improvement",
            description:
              "There is an effective self-assessment and quality improvement process in place.",
          },
          {
            id: "7.2.2",
            name: "Educational leadership",
            description:
              "The educational leader is supported and leads the development and implementation of the educational program and assessment and planning cycle.",
          },
          {
            id: "7.2.3",
            name: "Development of professionals",
            description:
              "Educators, co-ordinators and staff members' performance is regularly evaluated, and individual plans are in place to support learning and development.",
          },
        ],
      },
    ],
  },
];

// ============================================================
// Derived Lookups
// ============================================================

/** Flat list of all 58 NQS elements */
export const NQS_ALL_ELEMENTS: NqsElement[] = NQS_QUALITY_AREAS.flatMap((qa) =>
  qa.standards.flatMap((s) => s.elements),
);

/** Total number of NQS elements (58 as of 1 Jan 2026) */
export const NQS_TOTAL_ELEMENTS = NQS_ALL_ELEMENTS.length;

/** Map from element ID (e.g. '1.1.1') to element data */
export const NQS_ELEMENT_MAP = new Map<string, NqsElement>(
  NQS_ALL_ELEMENTS.map((el) => [el.id, el]),
);

/** Map from standard ID (e.g. '1.1') to standard data */
export const NQS_STANDARD_MAP = new Map<string, NqsStandard>(
  NQS_QUALITY_AREAS.flatMap((qa) =>
    qa.standards.map((s) => [s.id, s] as const),
  ),
);

/** Map from element ID to its parent QA number */
export const NQS_QA_FOR_ELEMENT = new Map<string, number>(
  NQS_QUALITY_AREAS.flatMap((qa) =>
    qa.standards.flatMap((s) =>
      s.elements.map((el) => [el.id, qa.id] as const),
    ),
  ),
);

// ============================================================
// Evidence Hint Mapping
// ============================================================
// Which evidence types are most relevant for each QA.
// Used by the evidence linker to pre-filter suggestions.
// ============================================================

export const NQS_QA_EVIDENCE_HINTS: Record<
  number,
  {
    primaryTypes: QipEvidenceType[];
    description: string;
  }
> = {
  1: {
    primaryTypes: ["observation"],
    description: "Observations, learning stories, and program documentation",
  },
  2: {
    primaryTypes: ["incident", "document"],
    description:
      "Incident records, medical plans, risk assessments, safety procedures",
  },
  3: {
    primaryTypes: ["photo", "document"],
    description: "Environment photos, maintenance records, resource audits",
  },
  4: {
    primaryTypes: ["document"],
    description:
      "Staff qualifications, compliance records, ratio logs, rosters",
  },
  5: {
    primaryTypes: ["observation"],
    description: "Interaction observations, child wellbeing records",
  },
  6: {
    primaryTypes: ["document", "policy"],
    description: "Family communications, partnership records, community links",
  },
  7: {
    primaryTypes: ["policy", "document"],
    description:
      "Policies, governance documents, meeting minutes, self-assessment records",
  },
};
