import type { Metadata } from "next";
import ForGuidesClient from "./for-guides-client";

export const metadata: Metadata = {
  title: "For Montessori Guides",
  description:
    "Capture observations in 30 seconds. See mastery at a glance. Generate term reports from real data - not a blank page.",
};

export default function ForGuidesPage() {
  return <ForGuidesClient />;
}
