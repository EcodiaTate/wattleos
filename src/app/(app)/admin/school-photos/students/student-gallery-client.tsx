"use client";

// ============================================================
// WattleOS V2 - Student Photo Gallery Client (Module R)
// ============================================================

import { useState, useCallback } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { PhotoGrid } from "@/components/domain/school-photos/photo-grid";
import { PhotoHistoryDrawer } from "@/components/domain/school-photos/photo-history-drawer";
import {
  getPersonPhotoHistory,
  setPhotoAsCurrent,
  deletePhoto,
} from "@/lib/actions/school-photos";
import type { PersonPhoto } from "@/types/domain";

interface StudentData {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  photo_url: string | null;
  class_name: string | null;
  has_photo: boolean;
}

interface StudentPhotoGalleryClientProps {
  initialStudents: StudentData[];
  initialTotal: number;
}

export function StudentPhotoGalleryClient({
  initialStudents,
  initialTotal,
}: StudentPhotoGalleryClientProps) {
  const haptics = useHaptics();
  const [students] = useState(initialStudents);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(
    null,
  );
  const [photoHistory, setPhotoHistory] = useState<PersonPhoto[]>([]);

  const handlePersonClick = useCallback(
    async (id: string) => {
      haptics.impact("light");
      const student = students.find((s) => s.id === id);
      if (!student) return;

      setSelectedStudent(student);
      const result = await getPersonPhotoHistory("student", id);
      setPhotoHistory(result.data ?? []);
      setDrawerOpen(true);
    },
    [students, haptics],
  );

  const handleSetCurrent = useCallback(
    async (photoId: string) => {
      haptics.impact("medium");
      await setPhotoAsCurrent({ photo_id: photoId });
      // Refresh history
      if (selectedStudent) {
        const result = await getPersonPhotoHistory(
          "student",
          selectedStudent.id,
        );
        setPhotoHistory(result.data ?? []);
      }
    },
    [selectedStudent, haptics],
  );

  const handleDelete = useCallback(
    async (photoId: string) => {
      haptics.impact("heavy");
      await deletePhoto(photoId);
      if (selectedStudent) {
        const result = await getPersonPhotoHistory(
          "student",
          selectedStudent.id,
        );
        setPhotoHistory(result.data ?? []);
      }
    },
    [selectedStudent, haptics],
  );

  const gridPeople = students.map((s) => ({
    id: s.id,
    name: s.preferred_name
      ? `${s.preferred_name} ${s.last_name}`
      : `${s.first_name} ${s.last_name}`,
    subtitle: s.class_name,
    photoUrl: s.photo_url,
    hasPhoto: s.has_photo,
  }));

  return (
    <>
      <PhotoGrid
        people={gridPeople}
        onPersonClick={handlePersonClick}
        emptyMessage="No students found"
      />

      <PhotoHistoryDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        personName={
          selectedStudent
            ? `${selectedStudent.preferred_name ?? selectedStudent.first_name} ${selectedStudent.last_name}`
            : ""
        }
        photos={photoHistory}
        onSetCurrent={handleSetCurrent}
        onDelete={handleDelete}
      />
    </>
  );
}
