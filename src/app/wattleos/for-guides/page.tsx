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
      desc: "One tap on your iPad opens the capture screen. The camera is ready.",
      time: "2 seconds",
    },
    {
      num: "2",
      title: "Snap a photo",
      desc: "Photograph the child working with the material. Or skip the photo and type a note.",
      time: "5 seconds",
    },
    {
      num: "3",
      title: "Tag students",
      desc: "Quick-search or tap from recently tagged. Multi-select for group presentations.",
      time: "5 seconds",
    },
    {
      num: "4",
      title: "Link curriculum",
      desc: "Recently used outcomes appear first. Search the tree if needed. One tap to tag.",
      time: "8 seconds",
    },
    {
      num: "5",
      title: "Save",
      desc: "Draft or publish immediately. Published observations appear in parent portfolios.",
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
          <SectionLabel>The Daily Workflow</SectionLabel>
          <SectionHeading>
            From sighting to record in under 30 seconds
          </SectionHeading>
          <SectionDescription>
            You&apos;re walking your classroom. A child is concentrating deeply
            with the golden beads. Here&apos;s what happens next.
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
          What changes when your tools work with you
        </SectionHeading>

        <div style={{ textAlign: "left", marginTop: 40 }}>
          {[
            {
              time: "8:30 AM",
              what: "Open the mastery heatmap while setting up your classroom. See who's ready for a new presentation today.",
            },
            {
              time: "9:15 AM",
              what: "Snap an observation of two children working with the bead chains together. Tag both students, link to numeration outcomes. 25 seconds.",
            },
            {
              time: "10:00 AM",
              what: "Quick observation note - typed, no photo. 'M. independently chose the hundred board and completed it without support.' Tag, link, done.",
            },
            {
              time: "11:30 AM",
              what: "Three more observations during the work cycle. Your recently-used outcomes and recently-tagged students are always at the top.",
            },
            {
              time: "1:00 PM",
              what: "Check the curriculum tree over lunch. You can see that four children in your class haven't been presented the stamp game. Plan for tomorrow.",
            },
            {
              time: "3:00 PM",
              what: "Review your draft observations. Publish the ones you're happy with - they appear in parent portfolios automatically.",
            },
            {
              time: "End of term",
              what: "Open the report builder. Every observation and mastery update is already there. Write your personal notes. Publish.",
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

export default function ForGuidesPage() {
  return (
    <MarketingShell>
      <MarketingNav />
      <PageHero
        label="For Guides"
        labelColor="#E8A838"
        title={
          <>
            Capture learning moments,
            <br />
            <span style={{ color: "#E8A838" }}>not paperwork</span>
          </>
        }
        description="WattleOS is built around the way you actually work - walking your classroom with an iPad, observing children, and trusting what you see."
      />

      <section style={{ padding: "0 24px 80px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FeatureRow
            icon={<IconObserve size={28} color="#E8A838" />}
            title="Observations that take seconds, not minutes"
            description="Photograph a learning moment, tag the students, link to curriculum outcomes, and save. The entire flow is optimised for iPad - big tap targets, smart defaults, recently-used suggestions. Your observations build your students' portfolios and feed directly into mastery tracking and term reports."
            color="#E8A838"
          />
          <FeatureRow
            icon={<IconTree size={28} color="#5B8C5A" />}
            title="Your curriculum, your language"
            description="AMI and AMS scope and sequence for ages 0–18, built in from day one. Practical Life, Sensorial, Language, Mathematics, Culture - not retrofitted generic standards. Fork the template, customise for your classroom, hide what you don't use. Every outcome links back to the canonical source for cross-school consistency."
            color="#5B8C5A"
            reverse
          />
          <FeatureRow
            icon={<IconMastery size={28} color="#C17D3A" />}
            title="See mastery at a glance"
            description="A visual grid showing every child's progress across the entire curriculum. Colour-coded by status - not started, presented, practicing, mastered. Spot who needs a new presentation. See class-wide patterns. Let the data guide your planning without replacing your intuition about each child."
            color="#C17D3A"
          />
          <FeatureRow
            icon={<IconReport size={28} color="#8B6F47" />}
            title="Reports that write themselves"
            description="When it's time for term reports, your observations and mastery data are already there. The report builder pulls everything in - you review, personalise with your own words, and publish. Parents receive a rich, evidence-based picture of their child's learning. No more blank pages at the end of term."
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
