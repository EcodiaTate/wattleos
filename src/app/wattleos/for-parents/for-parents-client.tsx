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
      desc: "Photos, observations, and mastery milestones linked to the AMI/AMS curriculum - updated as they happen. You see what your child worked on today, not what they achieved six months ago.",
    },
    {
      icon: <IconShield size={24} color="#5B8C5A" />,
      title: "Attendance & Safety",
      desc: "See when your child checked in and out. Know your medical information is current and accessible to the right staff. If something changes - custody, allergy action plan, emergency contacts - update it once.",
    },
    {
      icon: <IconChat size={24} color="#5B8C5A" />,
      title: "Messages & Announcements",
      desc: "Direct messages with your guide for private questions. Class updates for day-to-day news. School announcements with read-receipts so nothing gets lost. One thread, not five.",
    },
    {
      icon: <IconOSHC size={24} color="#5B8C5A" />,
      title: "OSHC & Program Booking",
      desc: "Book before-school care, after-school care, and vacation care from your phone. Recurring bookings, casual add-ons, and cancellations - all reflected immediately in the school's CCS reporting.",
    },
    {
      icon: <IconCalendar size={24} color="#5B8C5A" />,
      title: "Events & Calendar",
      desc: "School events, excursions, parent evenings, performances - all in one place with RSVP. Add any event to your calendar in one tap. No more flyers lost in the school bag.",
    },
    {
      icon: <IconFamily size={24} color="#5B8C5A" />,
      title: "Family Directory",
      desc: "Opt-in to connect with other families at your school. Useful when your child mentions a friend by name but you don't know their parents yet.",
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
            Everything about your child&apos;s school life, in one place
          </SectionHeading>
          <SectionDescription>
            No app for observations, a different one for OSHC, a third for
            messages. WattleOS is one portal - and it knows everything.
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
      desc: "Fill out a short interest form on the school's website. The admissions team sees you immediately - no paper, no lost email.",
    },
    {
      num: "2",
      title: "Tour",
      desc: "Book a school tour online. Pick a time that works. You show up - the school already has your details.",
    },
    {
      num: "3",
      title: "Apply",
      desc: "When a place is offered, complete the full enrolment form online. Child details, medical conditions, emergency contacts, consent flags, document uploads - one guided flow, nothing to print.",
    },
    {
      num: "4",
      title: "Approved",
      desc: "The school reviews and approves. That one action creates your child's record, class placement, portfolio folder, billing schedule, and your parent account - simultaneously.",
    },
    {
      num: "5",
      title: "Connected",
      desc: "You get an invite link. Accept it, set your password, and you're in - your child's class group chat, the school calendar, and the parent portal are all there from day one.",
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
          <SectionHeading>
            Enrolment that doesn&apos;t ask you twice
          </SectionHeading>
          <SectionDescription>
            You enter your child&apos;s details once. The school never asks you
            to fill in the same form again.
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

export default function ForParentsClient() {
  return (
    <MarketingShell>
      <MarketingNav />
      <PageHero
        label="For Parents"
        labelColor="#5B8C5A"
        title={
          <>
            Your child&apos;s Montessori journey,
            <br />
            <span style={{ color: "#5B8C5A" }}>not a grade sheet</span>
          </>
        }
        description="WattleOS gives you a window into what your child is actually working on - photos, guide notes, curriculum milestones - updated as it happens, not once a term."
      />

      <section style={{ padding: "0 24px 60px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FeatureRow
            icon={<IconPortfolio size={28} color="#5B8C5A" />}
            title="A portfolio that shows you real learning"
            description="A report card tells you a grade. WattleOS shows you the moment your child first counted to 100 with the bead chain - the actual photo, the guide's observation note, the curriculum outcome it links to. Then the next milestone, and the next. A living record that grows across their entire Montessori journey, not a once-a-term summary."
            color="#5B8C5A"
          />
          <FeatureRow
            icon={<IconChat size={28} color="#5B8C5A" />}
            title="One app, not five group chats"
            description="Direct messages with your child's guide. Class group updates. School-wide announcements with read-receipts. Event invitations with RSVP. OSHC booking confirmations. Term reports when they're published. The school calendar. It all lives in the same place - not split across a WhatsApp group, an email list, a notice in the bag, and a separate booking app."
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
