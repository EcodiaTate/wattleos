// src/app/(app)/classes/new/page.tsx
import { ClassForm } from "@/components/domain/sis/ClassForm";
import { getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";

export default async function CreateClassPage() {
  const context = await getTenantContext();

  if (
    !context.permissions.includes(Permissions.MANAGE_ENROLLMENT) &&
    !context.permissions.includes(Permissions.MANAGE_STUDENTS)
  ) {
    redirect("/classes");
  }

  return (
    <div className="space-y-[var(--density-section-gap)] animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in-down">
        <Link href="/classes" className="hover:text-primary transition-colors">
          Classes
        </Link>
        <ChevronRight className="h-3 w-3 opacity-50" />
        <span className="text-foreground font-medium">New Class</span>
      </nav>

      {/* Page header */}
      <div className="animate-fade-in-down stagger-1">
        <h1 className="text-2xl font-bold text-foreground">
          Create New Class
        </h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Set up a new Montessori classroom or environment. You can enroll
          students and link a curriculum after creating the class.
        </p>
      </div>

      {/* Form Container */}
      <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm animate-scale-in">
        <ClassForm />
      </div>
    </div>
  );
}