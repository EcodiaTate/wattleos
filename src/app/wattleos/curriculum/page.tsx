import type { Metadata } from "next";
import CurriculumClient from "./curriculum-client";

export const metadata: Metadata = {
  title: "Curriculum Library",
  description:
    "AMI and AMS Montessori curriculum built in. Practical Life, Sensorial, Mathematics, Language, and Cultural studies - mapped to mastery tracking.",
};

export default function CurriculumPage() {
  return <CurriculumClient />;
}
