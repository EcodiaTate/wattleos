import type { Metadata } from "next";
import ForParentsClient from "./for-parents-client";

export const metadata: Metadata = {
  title: "For Parents",
  description:
    "See what your child is learning, track attendance, communicate with guides, and manage enrolment - all in one place.",
};

export default function ForParentsPage() {
  return <ForParentsClient />;
}
