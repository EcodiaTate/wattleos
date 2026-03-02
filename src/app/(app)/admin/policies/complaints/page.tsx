import { redirect } from "next/navigation";

// Complaints are shown on the main policies page - redirect there
export default function ComplaintsRedirectPage() {
  redirect("/admin/policies");
}
