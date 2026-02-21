"use client";

import {
  CTABanner,
  FeatureRow,
  IconCalendar,
  IconChat,
  IconFamily,
  IconOSHC,
  IconPortfolio,
  IconShield,
  MarketingFooter,
  MarketingNav,
  MarketingShell,
  PageHero,
  SectionDescription,
  SectionHeading,
  SectionLabel,
  useReveal,
} from "../components";

function WhatYouSeeSection() {
  const reveal = useReveal();

  const items = [
    {
      icon: <IconPortfolio size={24} color="#5B8C5A" />,
      title: "Living Portfolio",
      desc: "Photos, observations, and mastery milestones from your child's guide. Not a grade - a real picture of what your child is working on, what they've mastered, and where they're growing.",
    },
    {
      icon: <IconShield size={24} color="#5B8C5A" />,
      title: "Attendance & Safety",
      desc: "Know your child arrived safely. See check-in and check-out times. Emergency contacts and medical information always up to date and accessible to staff who need it.",
    },
    {
      icon: <IconChat size={24} color="#5B8C5A" />,
      title: "Messages & Announcements",
      desc: "Direct messages with your child's guide. School announcements with read-receipts. Class group updates. Event invitations with RSVP. One place for everything - no more lost notes.",
    },
    {
      icon: <IconOSHC size={24} color="#5B8C5A" />,
      title: "OSHC & Program Booking",
      desc: "Book before-school care, after-school care, vacation care, and extracurriculars. See your child's full weekly schedule. Recurring bookings or casual one-offs. All on one invoice.",
    },
    {
      icon: <IconCalendar size={24} color="#5B8C5A" />,
      title: "Events & Calendar",
      desc: "School events, excursions, parent meetings, performances. RSVP in one tap. Add to your calendar. Never miss another concert because the flyer fell out of a schoolbag.",
    },
    {
      icon: <IconFamily size={24} color="#5B8C5A" />,
      title: "Family Directory",
      desc: "Opt-in to connect with other families at your school. Find playdate companions, arrange carpooling, or just know who your child's friends' parents are.",
    },
  ];

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
        style={{ maxWidth: 900, margin: "0 auto" }}
      >
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <SectionLabel color="#5B8C5A">Your Parent Portal</SectionLabel>
          <SectionHeading>
            Everything about your child, in one place
          </SectionHeading>
          <SectionDescription>
            Open WattleOS and see your child&apos;s Montessori journey - not a
            grade sheet, but a living, breathing record of real learning.
          </SectionDescription>
        </div>

        <div
          className="desktop-two-col"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
        >
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                background: "#fff",
                borderRadius: 14,
                padding: "28px 26px",
                border: "1px solid rgba(44, 24, 16, 0.05)",
                display: "flex",
                gap: 16,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 11,
                  flexShrink: 0,
                  background: "rgba(91, 140, 90, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {item.icon}
              </div>
              <div>
                <h4
                  style={{
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontSize: 18,
                    color: "#2C1810",
                    fontWeight: 500,
                    marginBottom: 6,
                  }}
                >
                  {item.title}
                </h4>
                <p
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 14,
                    color: "#6B5744",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EnrolmentJourneySection() {
  const reveal = useReveal();

  const steps = [
    {
      num: "1",
      title: "Inquire",
      desc: "Fill out a short form on the school's website. Your interest is logged and the school knows you exist.",
    },
    {
      num: "2",
      title: "Tour",
      desc: "Book a school tour online. Pick a time that works. Show up and fall in love with the environment.",
    },
    {
      num: "3",
      title: "Apply",
      desc: "When a place is offered, complete the full enrolment form online. Child details, medical info, emergency contacts, document uploads - one guided flow.",
    },
    {
      num: "4",
      title: "Approved",
      desc: "The school reviews and approves. One click creates your child's record, class enrolment, portfolio folder, billing schedule, and your parent account.",
    },
    {
      num: "5",
      title: "Connected",
      desc: "Accept your invite, sign in, and you're in. Your child's class group chat, the school calendar, and your family portal - all waiting for you.",
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
          <SectionLabel color="#E8A838">From Inquiry to First Day</SectionLabel>
          <SectionHeading>Enrolment that respects your time</SectionHeading>
          <SectionDescription>
            No printing forms. No re-entering the same information three times.
            One flow, everything captured, nothing lost.
          </SectionDescription>
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
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(232,168,56,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: 18,
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

export default function ForParentsPage() {
  return (
    <MarketingShell>
      <MarketingNav />
      <PageHero
        label="For Parents"
        labelColor="#5B8C5A"
        title={
          <>
            See what your child is
            <br />
            <span style={{ color: "#5B8C5A" }}>actually doing</span>
          </>
        }
        description="No more wondering what happens behind the classroom door. WattleOS gives you a window into your child's Montessori journey - their work, their growth, their world."
      />

      <section style={{ padding: "0 24px 60px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FeatureRow
            icon={<IconPortfolio size={28} color="#5B8C5A" />}
            title="A portfolio that's alive"
            description="Traditional report cards tell you a grade. WattleOS shows you the moment your child first counted to 100 with the bead chain. The photo of them concentrating on the moveable alphabet. The guide's note about how they helped a younger child set a table. A living record of real learning, updated as it happens."
            color="#5B8C5A"
          />
          <FeatureRow
            icon={<IconChat size={28} color="#5B8C5A" />}
            title="One place for all school communication"
            description="Direct messages with your child's guide for private questions. Class group updates for day-to-day news. School-wide announcements for the important stuff. Event invitations, OSHC booking confirmations, term reports - all in the same app. Delete the WhatsApp group."
            color="#5B8C5A"
            reverse
          />
        </div>
      </section>

      <WhatYouSeeSection />
      <EnrolmentJourneySection />
      <CTABanner />
      <MarketingFooter />
    </MarketingShell>
  );
}
