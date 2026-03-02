// src/lib/constants/reg168-policies.ts
//
// Regulation 168 - Mandatory policies and procedures for education
// and care services (National Law, Education and Care Services
// National Regulations 2011, Part 4.7).
//
// Each entry maps a regulatory requirement to a policy category
// and includes the specific regulation reference.

export interface Reg168PolicyRequirement {
  /** Unique key for this requirement */
  key: string;
  /** Human-readable title */
  title: string;
  /** Regulation reference (e.g., "Reg 168(2)(a)") */
  regulation: string;
  /** Brief guidance on what the policy must cover */
  guidance: string;
  /** Maps to the WattleOS policy category */
  category: string;
  /** Priority for compliance - critical items block A&R */
  critical: boolean;
}

export const REG_168_REQUIREMENTS: Reg168PolicyRequirement[] = [
  {
    key: "health_hygiene_safe_food",
    title: "Health, hygiene, and safe food handling",
    regulation: "Reg 168(2)(a)(i)-(iii)",
    guidance:
      "Must address health and hygiene practices, safe food handling and preparation, and dealing with infectious diseases. Cross-reference: Reg 77 (health hygiene and safe food practices).",
    category: "health_safety",
    critical: true,
  },
  {
    key: "incident_injury_illness",
    title: "Incident, injury, trauma, and illness",
    regulation: "Reg 168(2)(b)",
    guidance:
      "Procedures for managing incidents, injuries, trauma, and illness including notification of parents and authorities. Cross-reference: Reg 85-87.",
    category: "health_safety",
    critical: true,
  },
  {
    key: "dealing_with_medical_conditions",
    title: "Dealing with medical conditions",
    regulation: "Reg 168(2)(d)",
    guidance:
      "Managing medical conditions in children including asthma, anaphylaxis, diabetes, and epilepsy. Must include risk minimisation and communication plans.",
    category: "health_safety",
    critical: true,
  },
  {
    key: "emergency_evacuation",
    title: "Emergency and evacuation",
    regulation: "Reg 168(2)(e)",
    guidance:
      "Emergency and evacuation procedures including regular rehearsal. Cross-reference: Reg 97 (emergency rehearsals).",
    category: "health_safety",
    critical: true,
  },
  {
    key: "delivery_collection",
    title: "Delivery of children to, and collection from, the service",
    regulation: "Reg 168(2)(f)",
    guidance:
      "Procedures ensuring authorised persons collect children, including late pick-up and uncollected children protocols.",
    category: "families",
    critical: true,
  },
  {
    key: "excursions",
    title: "Excursions",
    regulation: "Reg 168(2)(g)",
    guidance:
      "Excursion policy including risk assessment, authorisations, supervision ratios, and transport. Cross-reference: Reg 100-102.",
    category: "health_safety",
    critical: true,
  },
  {
    key: "child_safe_environment",
    title: "Providing a child safe environment",
    regulation: "Reg 168(2)(h)",
    guidance:
      "Ensuring environments are safe and children are protected from harm and hazards. Includes indoor/outdoor safety, equipment maintenance, and sun protection.",
    category: "child_protection",
    critical: true,
  },
  {
    key: "sleep_rest",
    title: "Sleep and rest for children",
    regulation: "Reg 168(2)(i)",
    guidance:
      "Safe sleep and rest practices including SIDS/safe sleeping guidelines, supervision during sleep, and individual rest needs.",
    category: "health_safety",
    critical: true,
  },
  {
    key: "first_aid",
    title: "Administration of first aid",
    regulation: "Reg 168(2)(j)",
    guidance:
      "First aid administration including qualified first aiders, first aid kits, and documentation requirements.",
    category: "health_safety",
    critical: true,
  },
  {
    key: "water_safety",
    title: "Water safety (including swimming)",
    regulation: "Reg 168(2)(a)(iv)",
    guidance:
      "Water safety procedures for all water-related activities including supervision near water features, excursion water safety, and swimming lessons.",
    category: "health_safety",
    critical: true,
  },
  {
    key: "sun_protection",
    title: "Sun protection",
    regulation: "Reg 168(2)(a)(v) / 114",
    guidance:
      "UV protection practices including hat policies, sunscreen application, shade provision, and scheduling outdoor time.",
    category: "health_safety",
    critical: false,
  },
  {
    key: "behaviour_guidance",
    title: "Interactions with children (behaviour guidance)",
    regulation: "Reg 168(2)(j)",
    guidance:
      "Positive behaviour guidance strategies, ensuring dignity and rights of every child are maintained. No corporal punishment or unreasonable discipline.",
    category: "child_protection",
    critical: true,
  },
  {
    key: "enrolment_orientation",
    title: "Enrolment and orientation",
    regulation: "Reg 168(2)(k)",
    guidance:
      "Enrolment procedures, waiting lists, priority of access, orientation for families and children, and transition-to-school processes.",
    category: "families",
    critical: false,
  },
  {
    key: "governance_management",
    title: "Governance and management of the service",
    regulation: "Reg 168(2)(l)",
    guidance:
      "Governance structure, roles and responsibilities, decision-making processes, and regulatory compliance obligations.",
    category: "governance",
    critical: false,
  },
  {
    key: "confidentiality_records",
    title: "Confidentiality of records",
    regulation: "Reg 168(2)(m)",
    guidance:
      "Privacy and confidentiality of children's and families' records, staff records, and information sharing protocols. Cross-reference: Privacy Act 1988.",
    category: "administration",
    critical: false,
  },
  {
    key: "fees_payment",
    title: "Payment of fees and fee schedules",
    regulation: "Reg 168(2)(n)",
    guidance:
      "Fee structure, payment terms, CCS/ACCS information, late payment procedures, and fee changes notification.",
    category: "administration",
    critical: false,
  },
  {
    key: "complaints_handling",
    title: "Dealing with complaints",
    regulation: "Reg 168(2)(o)",
    guidance:
      "Complaint handling procedures including how complaints are received, investigated, and resolved. Must include escalation pathways and timeframes. Cross-reference: Reg 170.",
    category: "governance",
    critical: true,
  },
  {
    key: "staffing_code_of_conduct",
    title: "Staffing arrangements including Code of Conduct",
    regulation: "Reg 168(2)(i) / 168(2)(p)",
    guidance:
      "Staffing requirements, qualifications, supervision responsibilities, and staff Code of Conduct including professional boundaries and mandatory reporting obligations.",
    category: "staffing",
    critical: true,
  },
  {
    key: "child_protection",
    title: "Child protection",
    regulation: "Reg 84 / 168(2)(h)",
    guidance:
      "Mandatory reporting obligations, recognising signs of abuse or neglect, responding to disclosures, and reportable conduct. Updated for QA2.2.3 (1 Jan 2026).",
    category: "child_protection",
    critical: true,
  },
  {
    key: "educational_program",
    title: "Educational program and practice",
    regulation: "Reg 73-76",
    guidance:
      "How the educational program is developed, documented, evaluated, and communicated to families. Must reference the approved learning framework (EYLF V2.0).",
    category: "curriculum",
    critical: false,
  },
  {
    key: "inclusion_equity",
    title: "Inclusion, equity, and diversity",
    regulation: "Reg 155-156",
    guidance:
      "Ensuring all children can access and participate in the program. Addresses additional needs, cultural considerations, and anti-bias practices.",
    category: "inclusion",
    critical: false,
  },
];

/** Total count of mandatory Reg 168 requirements */
export const REG_168_TOTAL = REG_168_REQUIREMENTS.length;

/** Count of critical requirements */
export const REG_168_CRITICAL_COUNT = REG_168_REQUIREMENTS.filter(
  (r) => r.critical,
).length;

/** Get requirements grouped by category */
export function getRequirementsByCategory(): Record<
  string,
  Reg168PolicyRequirement[]
> {
  const grouped: Record<string, Reg168PolicyRequirement[]> = {};
  for (const req of REG_168_REQUIREMENTS) {
    if (!grouped[req.category]) grouped[req.category] = [];
    grouped[req.category].push(req);
  }
  return grouped;
}
