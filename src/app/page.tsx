import type { Metadata } from "next";
import HomepageClient from "./homepage-client";

export const metadata: Metadata = {
  title: "WattleOS - Montessori-Native School Operating System",
  description:
    "Replace six platforms with one that speaks Montessori. Observations, curriculum, enrolment, OSHC, communication - from first inquiry to graduation.",
};

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "WattleOS",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, iOS, Android",
        description:
          "Montessori-native school operating system - observations, curriculum, enrolment, OSHC, and communication in one platform.",
        url: "https://wattleos.au",
        offers: {
          "@type": "Offer",
          price: "8",
          priceCurrency: "AUD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "8",
            priceCurrency: "AUD",
            unitText: "per student per month",
          },
        },
      },
      {
        "@type": "Organization",
        name: "WattleOS",
        url: "https://wattleos.au",
        logo: "https://wattleos.au/wattle-logo.png",
        contactPoint: {
          "@type": "ContactPoint",
          email: "hello@wattleos.au",
          contactType: "sales",
          areaServed: "AU",
          availableLanguage: "English",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomepageClient />
    </>
  );
}
