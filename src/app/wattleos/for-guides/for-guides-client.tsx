"use client";

import {
  CTABanner,
  FeatureRow,
  IconMastery,
  IconObserve,
  IconReport,
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

function WorkflowSection() {
  const reveal = useReveal();
  const steps = [
    {
      num: "1",
      title: "Tap 'New Observation'",
      desc: "One tap opens the capture screen. The camera is ready. You haven't interrupted anything.",
      time: "2 seconds",
    },
    {
      num: "2",
      title: "Snap the photo",
      desc: "Or skip it and type a note - whatever fits the moment. Both routes work one-handed.",
      time: "5 seconds",
    },
    {
      num: "3",
      title: "Tag the students",
      desc: "Tap from recently tagged or quick-search. Multi-select for group work or peer presentations.",
      time: "5 seconds",
    },
    {
      num: "4",
      title: "Link the outcome",
      desc: "Your recently-used AMI/AMS outcomes appear first. One tap. Or search the full curriculum tree if it's something new.",
      time: "8 seconds",
    },
    {
      num: "5",
      title: "Save - draft or publish",
      desc: "Published observations appear in parent portfolios and update the mastery grid immediately.",
      time: "2 seconds",
    },
  ];

  return (
    <section style={{ padding: "80px 24px 100px" }}>
      <div
        ref={reveal.ref}
        className={`section-reveal ${reveal.visible ? "visible" : ""}`}
        style={{ maxWidth: 800, margin: "0 auto" }}
      >
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <SectionLabel>The Observation Flow</SectionLabel>
          <SectionHeading>
            From sighting to record in under 30 seconds
          </SectionHeading>
          <SectionDescription>
            You&apos;re walking the classroom. Two children are working together
            with the large bead frame and they&apos;ve just figured something
            out. Here&apos;s what happens next.
          </SectionDescription>
        </div>

        <div style={{ position: "relative" }}>
          {/* Vertical line */}
          <div
            style={{
              position: "absolute",
              left: 28,
              top: 0,
              bottom: 0,
              width: 2,
              background:
                "linear-gradient(180deg, #E8A838 0%, rgba(232,168,56,0.1) 100%)",
            }}
          />

          {steps.map((step, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 24,
                marginBottom: 36,
                position: "relative",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "#fff",
                  border: "2px solid #E8A838",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'Fraunces', Georgia, serif",
                  fontSize: 22,
                  color: "#E8A838",
                  fontWeight: 600,
                  flexShrink: 0,
                  zIndex: 1,
                }}
              >
                {step.num}
              </div>
              <div style={{ paddingTop: 8 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 12,
                    marginBottom: 4,
                  }}
                >
                  <h4
                    style={{
                      fontFamily: "'Fraunces', Georgia, serif",
                      fontSize: 20,
                      color: "#2C1810",
                      fontWeight: 500,
                    }}
                  >
                    {step.title}
                  </h4>
                  <span
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: 12,
                      color: "#E8A838",
                      fontWeight: 600,
                      background: "rgba(232,168,56,0.08)",
                      padding: "2px 10px",
                      borderRadius: 100,
                    }}
                  >
                    ~{step.time}
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 15,
                    color: "#6B5744",
                    lineHeight: 1.6,
                  }}
                >
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DayInLifeSection() {
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
        style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}
      >
        <SectionLabel color="#5B8C5A">A Day with WattleOS</SectionLabel>
        <SectionHeading>
          What a day looks like when the tool stays out of your way
        </SectionHeading>

        <div style={{ textAlign: "left", marginTop: 40 }}>
          {[
            {
              time: "8:20 AM",
              what: "Open the mastery heatmap while you set up. Filter by Sensorial - three children are deep in practising, two are overdue for a new presentation. You know who to watch for today.",
            },
            {
              time: "9:08 AM",
              what: "Two children finish a collaborative stamp game session. Snap a photo, tag both, link 'multiplication - stamp game introduction'. Published in 22 seconds. You're back present.",
            },
            {
              time: "10:15 AM",
              what: "Quick typed note - no photo. 'L. independently chose the hundred board and completed it without support. Third time this week.' Tagged. Done in 18 seconds.",
            },
            {
              time: "11:40 AM",
              what: "Four more observations across the work cycle. Recently-used outcomes sit at the top every time - you're not hunting through curriculum trees.",
            },
            {
              time: "12:45 PM",
              what: "Check the three-year cycle view over lunch. You notice a gap: nobody in the upper primary group has been presented the Grammar Boxes in six weeks. Note it for tomorrow.",
            },
            {
              time: "3:15 PM",
              what: "Review and publish your draft observations from the afternoon. Parents see them appear in their child's portfolio within minutes.",
            },
            {
              time: "End of term",
              what: "Open the report builder. Every observation, every mastery update, every lesson record is already there - sorted by child, by area. You write the narrative. The evidence is already assembled.",
            },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 20,
                padding: "20px 0",
                borderBottom: i < 6 ? "1px solid rgba(44,24,16,0.06)" : "none",
              }}
            >
              <span
                style={{
                  fontFamily: "'Fraunces', Georgia, serif",
                  fontSize: 14,
                  color: "#E8A838",
                  fontWeight: 600,
                  minWidth: 100,
                  flexShrink: 0,
                }}
              >
                {item.time}
              </span>
              <p
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 15,
                  color: "#5C4A32",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {item.what}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function ForGuidesClient() {
  return (
    <MarketingShell>
      <MarketingNav />
      <PageHero
        label="For Guides"
        labelColor="#E8A838"
        title={
          <>
            Built for the way
            <br />
            <span style={{ color: "#E8A838" }}>Guides actually work</span>
          </>
        }
        description="Walking your classroom with an iPad. Observing, not documenting. WattleOS captures what you notice so you don't have to remember it later."
      />

      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FeatureRow
            icon={<IconObserve size={28} color="#E8A838" />}
            title="Observations in 30 seconds, not 10 minutes"
            description="Photo, students tagged, outcome linked, saved. The flow is built for iPad one-handed in the middle of a work cycle - big tap targets, smart defaults, recently-used outcomes first. Each observation flows automatically into the child's portfolio, updates their mastery grid, and waits in the report builder at end of term. You capture it once; the system does the rest."
            color="#E8A838"
          />
          <FeatureRow
            icon={<IconTree size={28} color="#5B8C5A" />}
            title="AMI and AMS curriculum - not adapted, native"
            description="Practical Life, Sensorial, Language, Mathematics, Culture - full scope and sequence from Nido to Secondary, built in from day one. Three-period lesson tracking, work cycle records, and the normalization timeline are first-class features, not workarounds. Fork the template, customise for your classroom, hide what you don't teach. Cross-mapped to EYLF v2 and ACARA for compliance without the extra work."
            color="#5B8C5A"
            reverse
          />
          <FeatureRow
            icon={<IconMastery size={28} color="#C17D3A" />}
            title="The mastery grid your co-teachers can actually use"
            description="A visual heat map of every child's progress across the entire curriculum - not started, presented, practising, mastered. Updated by every observation and lesson record. Spot class-wide gaps in numeration, see who's ready for the stamp game, notice the child who's been practising independently for weeks. Filterable by area, by level, by student. It guides your planning without replacing your judgement."
            color="#C17D3A"
          />
          <FeatureRow
            icon={<IconReport size={28} color="#8B6F47" />}
            title="Term reports assembled, not written from scratch"
            description="At end of term, every observation you published and every mastery update you logged is already in the report builder - sorted by child, by area. You write your personal narrative, review the evidence, and publish. Parents receive a portfolio-backed report that explains how their child is actually learning, not a generic comment on a number. No blank page, no last-minute catch-up session."
            color="#8B6F47"
            reverse
          />
        </div>
      </section>

      <WorkflowSection />
      <DayInLifeSection />
      <CTABanner />
      <MarketingFooter />
    </MarketingShell>
  );
}
