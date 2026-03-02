import type { Metadata } from "next";
import ForAdminClient from "./for-admin-client";

export const metadata: Metadata = {
  title: "For Administrators",
  description:
    "QIP builder, CCS reporting, immunisation compliance, emergency drills, audit logs, and staff management - regulatory confidence at a glance.",
};

export default function ForAdminPage() {
  return <ForAdminClient />;
}
