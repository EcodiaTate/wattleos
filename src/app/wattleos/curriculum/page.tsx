"use client";

import { useState } from "react";
import {
  CTABanner,
  IconCompliance,
  IconTree,
  MarketingFooter,
  MarketingNav,
  MarketingShell,
  PageHero,
  SectionDescription,
  SectionHeading,
  SectionLabel,
  useReveal,
} from "../components";

// ============================================================
// Data
// ============================================================

type FrameworkCategory = "montessori" | "compliance";

interface Framework {
  slug: string;
  name: string;
  framework: string;
  ageRange: string;
  category: FrameworkCategory;
  description: string;
  color: string;
  nodeEstimate: string;
  areas?: string[];
}

const FRAMEWORKS: Framework[] = [
  {
    slug: "ami-0-3",
    name: "AMI Infant & Toddler",
    framework: "AMI",
    ageRange: "0–3",
    category: "montessori",
    color: "#D4877F",
    nodeEstimate: "~150–200 outcomes",
    description:
      "The foundational community: movement, language development, independence, social connection, and care of self in the first three years.",
    areas: [
      "Movement & Coordination",
      "Language Development",
      "Independence & Self-Care",
      "Social Development",
      "Sensory Exploration",
    ],
  },
  {
    slug: "ami-3-6",
    name: "AMI Primary",
    framework: "AMI",
    ageRange: "3–6",
    category: "montessori",
    color: "#E8A838",
    nodeEstimate: "~400–500 outcomes",
    description:
      "The classic Montessori classroom. Practical Life, Sensorial, Language, Mathematics, and Culture - the full scope and sequence for the primary years.",
    areas: [
      "Practical Life",
      "Sensorial",
      "Language",
      "Mathematics",
      "Culture (Geography, History, Science, Art, Music)",
    ],
  },
  {
    slug: "ami-6-9",
    name: "AMI Lower Elementary",
    framework: "AMI",
    ageRange: "6–9",
    category: "montessori",
    color: "#C17D3A",
    nodeEstimate: "~300–400 outcomes",
    description:
      "The Great Lessons begin. Cosmic education, research skills, collaborative work, and the transition from concrete to abstract thinking.",
    areas: [
      "Great Lessons",
      "Mathematics (Operations, Fractions, Geometry)",
      "Language (Grammar, Writing, Research)",
      "Geography & History",
      "Biology & Science",
    ],
  },
  {
    slug: "ami-9-12",
    name: "AMI Upper Elementary",
    framework: "AMI",
    ageRange: "9–12",
    category: "montessori",
    color: "#8B6F47",
    nodeEstimate: "~300–400 outcomes",
    description:
      "Advanced mathematical reasoning, formal grammar, independent research projects, and deeper exploration of the natural and social sciences.",
    areas: [
      "Advanced Mathematics",
      "Formal Grammar & Composition",
      "Research & Presentation",
      "Advanced Geography",
      "Physical & Life Sciences",
    ],
  },
  {
    slug: "ami-12-15",
    name: "AMI Erdkinder",
    framework: "AMI",
    ageRange: "12–15",
    category: "montessori",
    color: "#5B8C5A",
    nodeEstimate: "~200–300 outcomes",
    description:
      "The adolescent program: occupation, community participation, self-expression, and the integration of academic knowledge with real-world experience.",
    areas: [
      "Occupation & Micro-Economy",
      "Community & Service",
      "Self-Expression (Arts, Writing)",
      "Integrated Academics",
      "Personal Development",
    ],
  },
  {
    slug: "ami-15-18",
    name: "AMI Senior Adolescent",
    framework: "AMI",
    ageRange: "15–18",
    category: "montessori",
    color: "#3D6B3D",
    nodeEstimate: "~200–300 outcomes",
    description:
      "Pre-university preparation, vocational exploration, internships, and independent study - bridging Montessori education to adult life.",
    areas: [
      "University Preparation",
      "Vocational Pathways",
      "Internship & Work Experience",
      "Independent Study",
      "Civic Participation",
    ],
  },
  {
    slug: "eylf-v2",
    name: "Early Years Learning Framework v2",
    framework: "EYLF",
    ageRange: "0–5",
    category: "compliance",
    color: "#5B8C5A",
    nodeEstimate: "~40 sub-elements",
    description:
      "Australia's national framework for early childhood education. Five outcomes, each with sub-elements - mapped to Montessori observations so compliance evidence generates automatically.",
    areas: [
      "Outcome 1: Identity",
      "Outcome 2: Community",
      "Outcome 3: Wellbeing",
      "Outcome 4: Learning & Thinking",
      "Outcome 5: Communication",
    ],
  },
  {
    slug: "acara-f-10",
    name: "Australian Curriculum v9.0",
    framework: "ACARA",
    ageRange: "F–10",
    category: "compliance",
    color: "#2C5F8A",
    nodeEstimate: "~2000+ content descriptions",
    description:
      "The national curriculum from Foundation to Year 10 across all learning areas. Cross-mapped to Montessori outcomes so schools can demonstrate alignment for government reporting.",
    areas: [
      "English",
      "Mathematics",
      "Science",
      "Humanities & Social Sciences",
      "The Arts",
      "Technologies",
      "Health & Physical Education",
      "Languages",
    ],
  },
  {
    slug: "qcaa-11-12",
    name: "QCAA Senior Syllabi",
    framework: "QCAA",
    ageRange: "11–12",
    category: "compliance",
    color: "#6B3D6B",
    nodeEstimate: "~50 subjects × ~30 criteria",
    description:
      "Queensland's senior secondary syllabi for ATAR certification. General, Applied, and VET subjects with assessment criteria aligned to WattleOS mastery tracking.",
    areas: [
      "General Subjects (ATAR pathway)",
      "Applied Subjects",
      "VET Qualifications",
      "Certificate Courses",
    ],
  },
];

// ============================================================
// Framework Library
// ============================================================

function FrameworkLibrary() {
  const [filter, setFilter] = useState<"all" | FrameworkCategory>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const reveal = useReveal();

  const filtered =
    filter === "all"
      ? FRAMEWORKS
      : FRAMEWORKS.filter((f) => f.category === filter);

  return (
    <section style={{ padding: "80px 24px 100px" }}>
      <div
        ref={reveal.ref}
        className={`section-reveal ${reveal.visible ? "visible" : ""}`}
        style={{ maxWidth: 900, margin: "0 auto" }}
      >
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <SectionLabel>Framework Library</SectionLabel>
          <SectionHeading>Nine frameworks. Ages 0 to 18.</SectionHeading>
          <SectionDescription>
            Every framework is built into WattleOS as a forkable template.
            Schools pick their frameworks, customise as needed, and start
            tracking mastery immediately.
          </SectionDescription>
        </div>

        {/* Filter tabs */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginBottom: 36,
          }}
        >
          {[
            { key: "all" as const, label: "All Frameworks" },
            { key: "montessori" as const, label: "Montessori" },
            { key: "compliance" as const, label: "Compliance" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                background:
                  filter === tab.key ? "#2C1810" : "rgba(44, 24, 16, 0.04)",
                color: filter === tab.key ? "#FEFCF6" : "#5C4A32",
                border: "none",
                borderRadius: 8,
                padding: "10px 22px",
                fontFamily: "'Outfit', sans-serif",
                fontSize: 14,
                fontWeight: filter === tab.key ? 600 : 400,
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Framework cards */}
        <div style={{ display: "grid", gap: 16 }}>
          {filtered.map((fw) => {
            const isExpanded = expanded === fw.slug;
            return (
              <div
                key={fw.slug}
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  overflow: "hidden",
                  border: `1px solid ${isExpanded ? `${fw.color}30` : "rgba(44, 24, 16, 0.05)"}`,
                  transition: "border-color 0.3s",
                }}
              >
                <button
                  onClick={() => setExpanded(isExpanded ? null : fw.slug)}
                  style={{
                    width: "100%",
                    background: "none",
                    border: "none",
                    padding: "24px 28px",
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      flexShrink: 0,
                      background: `${fw.color}0D`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {fw.category === "montessori" ? (
                      <IconTree size={24} color={fw.color} />
                    ) : (
                      <IconCompliance size={24} color={fw.color} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <h3
                        style={{
                          fontFamily: "'Fraunces', Georgia, serif",
                          fontSize: 19,
                          color: "#2C1810",
                          fontWeight: 500,
                          margin: 0,
                        }}
                      >
                        {fw.name}
                      </h3>
                      <span
                        style={{
                          fontFamily: "'Outfit', sans-serif",
                          fontSize: 12,
                          fontWeight: 600,
                          color: fw.color,
                          background: `${fw.color}0D`,
                          padding: "2px 10px",
                          borderRadius: 100,
                        }}
                      >
                        {fw.ageRange}
                      </span>
                      <span
                        style={{
                          fontFamily: "'Outfit', sans-serif",
                          fontSize: 11,
                          color: "#8B7355",
                        }}
                      >
                        {fw.framework} · {fw.nodeEstimate}
                      </span>
                    </div>
                  </div>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    style={{
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.3s",
                      flexShrink: 0,
                    }}
                  >
                    <path
                      d="M5 8l5 5 5-5"
                      stroke="#8B7355"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {isExpanded && (
                  <div
                    style={{
                      padding: "0 28px 28px",
                      borderTop: "1px solid rgba(44, 24, 16, 0.04)",
                      animation: "fadeIn 0.3s ease",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: 15,
                        color: "#6B5744",
                        lineHeight: 1.65,
                        margin: "20px 0 18px",
                      }}
                    >
                      {fw.description}
                    </p>
                    {fw.areas && (
                      <div>
                        <p
                          style={{
                            fontFamily: "'Outfit', sans-serif",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#8B7355",
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            marginBottom: 10,
                          }}
                        >
                          Coverage Areas
                        </p>
                        <div
                          style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
                        >
                          {fw.areas.map((area, i) => (
                            <span
                              key={i}
                              style={{
                                fontFamily: "'Outfit', sans-serif",
                                fontSize: 13,
                                color: "#5C4A32",
                                background: `${fw.color}08`,
                                border: `1px solid ${fw.color}15`,
                                borderRadius: 8,
                                padding: "6px 14px",
                              }}
                            >
                              {area}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Cross-Mapping
// ============================================================

function CrossMappingSection() {
  const reveal = useReveal();

  return (
    <section
      style={{
        padding: "80px 24px",
        background: "linear-gradient(180deg, #FEFCF6 0%, #FAF5EA 100%)",
      }}
    >
      <div
        ref={reveal.ref}
        className={`section-reveal ${reveal.visible ? "visible" : ""}`}
        style={{ maxWidth: 800, margin: "0 auto" }}
      >
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <SectionLabel color="#5B8C5A">Cross-Framework Mapping</SectionLabel>
          <SectionHeading>One observation, multiple frameworks</SectionHeading>
          <SectionDescription>
            When a guide tags an observation with an AMI outcome, WattleOS
            automatically cross-maps it to the relevant compliance framework.
            The guide works in Montessori language. The compliance report
            generates itself.
          </SectionDescription>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "40px 36px",
            border: "1px solid rgba(91, 140, 90, 0.1)",
            boxShadow: "0 8px 40px rgba(44, 24, 16, 0.04)",
          }}
        >
          {/* Example flow */}
          <p
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 14,
              fontWeight: 600,
              color: "#8B7355",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 24,
            }}
          >
            Example: A guide photographs a 4-year-old practicing pouring
            exercises
          </p>

          <div style={{ display: "grid", gap: 16 }}>
            {[
              {
                label: "Guide tags",
                framework: "AMI 3–6",
                outcome:
                  "Practical Life → Preliminary Exercises → Pouring (jug to jug)",
                color: "#E8A838",
              },
              {
                label: "Auto-mapped to",
                framework: "EYLF v2",
                outcome:
                  "Outcome 3: Wellbeing → 3.2 Children take increasing responsibility for their own health and physical wellbeing",
                color: "#5B8C5A",
              },
              {
                label: "Auto-mapped to",
                framework: "EYLF v2",
                outcome:
                  "Outcome 4: Learning → 4.1 Children develop dispositions for learning such as curiosity, cooperation, confidence, creativity, commitment",
                color: "#5B8C5A",
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-start",
                  padding: "18px 20px",
                  background: `${item.color}06`,
                  borderRadius: 12,
                  border: `1px solid ${item.color}15`,
                }}
              >
                <span
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 11,
                    fontWeight: 700,
                    color: item.color,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    minWidth: 90,
                    paddingTop: 2,
                  }}
                >
                  {item.label}
                </span>
                <div>
                  <span
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: 12,
                      fontWeight: 600,
                      color: item.color,
                      background: `${item.color}0D`,
                      padding: "2px 10px",
                      borderRadius: 100,
                    }}
                  >
                    {item.framework}
                  </span>
                  <p
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: 14,
                      color: "#5C4A32",
                      lineHeight: 1.55,
                      margin: "6px 0 0",
                    }}
                  >
                    {item.outcome}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 24,
              padding: "18px 20px",
              background: "rgba(44, 24, 16, 0.02)",
              borderRadius: 12,
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 14,
                color: "#6B5744",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              <strong style={{ color: "#2C1810" }}>Result:</strong> When the
              assessor asks &quot;show me evidence for EYLF Outcome 3,&quot; the
              school generates a report that pulls every observation linked to
              Outcome 3 - with photos, dates, and guide notes. The guide never
              had to think about EYLF. The evidence built itself.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// How It Works
// ============================================================

function HowItWorksSection() {
  const reveal = useReveal();

  const steps = [
    {
      num: "1",
      title: "Pick your frameworks",
      desc: "During onboarding, choose which Montessori frameworks your school uses (AMI 3–6, AMI 6–9, etc.) and which compliance frameworks apply (EYLF, ACARA, QCAA).",
    },
    {
      num: "2",
      title: "Fork and customise",
      desc: "Each framework is instantiated as your school's own curriculum. Rename outcomes, reorder strands, add school-specific activities, hide what you don't use. Your copy, your way.",
    },
    {
      num: "3",
      title: "Guides work in Montessori",
      desc: "Observations are tagged to your Montessori curriculum - the language guides know. AMI outcomes, not bureaucratic codes. The workflow feels natural because it is.",
    },
    {
      num: "4",
      title: "Compliance maps itself",
      desc: "Cross-mappings link your Montessori outcomes to EYLF, ACARA, and QCAA automatically. Every observation generates evidence for the relevant compliance framework without any extra work.",
    },
  ];

  return (
    <section style={{ padding: "80px 24px 100px" }}>
      <div
        ref={reveal.ref}
        className={`section-reveal ${reveal.visible ? "visible" : ""}`}
        style={{ maxWidth: 700, margin: "0 auto" }}
      >
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <SectionLabel color="#E8A838">How It Works</SectionLabel>
          <SectionHeading>From template to tracking in minutes</SectionHeading>
        </div>

        {steps.map((step, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 20,
              padding: "24px 0",
              borderBottom:
                i < steps.length - 1 ? "1px solid rgba(44,24,16,0.06)" : "none",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(232,168,56,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: 20,
                color: "#E8A838",
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {step.num}
            </div>
            <div>
              <h4
                style={{
                  fontFamily: "'Fraunces', Georgia, serif",
                  fontSize: 19,
                  color: "#2C1810",
                  fontWeight: 500,
                  marginBottom: 4,
                }}
              >
                {step.title}
              </h4>
              <p
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 15,
                  color: "#6B5744",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// Main Page
// ============================================================

export default function CurriculumPage() {
  return (
    <MarketingShell>
      <MarketingNav />
      <PageHero
        label="Curriculum Library"
        labelColor="#5B8C5A"
        title={
          <>
            Every Montessori framework.
            <br />
            <span style={{ color: "#5B8C5A" }}>Every compliance standard.</span>
          </>
        }
        description="AMI and AMS scope and sequence for ages 0–18. EYLF, ACARA, and QCAA cross-mapped automatically. Your guides work in Montessori language - compliance evidence generates itself."
      />
      <FrameworkLibrary />
      <CrossMappingSection />
      <HowItWorksSection />
      <CTABanner />
      <MarketingFooter />
    </MarketingShell>
  );
}
