import type { Metadata } from "next";
import ForStaffClient from "./for-staff-client";

export const metadata: Metadata = {
  title: "For Operations Staff",
  description:
    "Timesheets, compliance tracking, ratio monitoring, billing, and OSHC session management - purpose-built for Montessori operations teams.",
};

export default function ForStaffPage() {
  return <ForStaffClient />;
}
