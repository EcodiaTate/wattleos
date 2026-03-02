"use client";

// ============================================================
// WattleOS V2 - Staff Photo Gallery Client (Module R)
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

interface StaffData {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  role_name: string | null;
  has_photo: boolean;
}

interface StaffPhotoGalleryClientProps {
  initialStaff: StaffData[];
  initialTotal: number;
}

export function StaffPhotoGalleryClient({
  initialStaff,
  initialTotal,
}: StaffPhotoGalleryClientProps) {
  const haptics = useHaptics();
  const [staff] = useState(initialStaff);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffData | null>(null);
  const [photoHistory, setPhotoHistory] = useState<PersonPhoto[]>([]);

  const handlePersonClick = useCallback(
    async (id: string) => {
      haptics.impact("light");
      const member = staff.find((s) => s.id === id);
      if (!member) return;

      setSelectedStaff(member);
      const result = await getPersonPhotoHistory("staff", id);
      setPhotoHistory(result.data ?? []);
      setDrawerOpen(true);
    },
    [staff, haptics],
  );

  const handleSetCurrent = useCallback(
    async (photoId: string) => {
      haptics.impact("medium");
      await setPhotoAsCurrent({ photo_id: photoId });
      if (selectedStaff) {
        const result = await getPersonPhotoHistory("staff", selectedStaff.id);
        setPhotoHistory(result.data ?? []);
      }
    },
    [selectedStaff, haptics],
  );

  const handleDelete = useCallback(
    async (photoId: string) => {
      haptics.impact("heavy");
      await deletePhoto(photoId);
      if (selectedStaff) {
        const result = await getPersonPhotoHistory("staff", selectedStaff.id);
        setPhotoHistory(result.data ?? []);
      }
    },
    [selectedStaff, haptics],
  );

  const gridPeople = staff.map((s) => ({
    id: s.id,
    name: `${s.first_name} ${s.last_name}`,
    subtitle: s.role_name,
    photoUrl: s.avatar_url,
    hasPhoto: s.has_photo,
  }));

  return (
    <>
      <PhotoGrid
        people={gridPeople}
        onPersonClick={handlePersonClick}
        emptyMessage="No staff found"
      />

      <PhotoHistoryDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        personName={
          selectedStaff
            ? `${selectedStaff.first_name} ${selectedStaff.last_name}`
            : ""
        }
        photos={photoHistory}
        onSetCurrent={handleSetCurrent}
        onDelete={handleDelete}
      />
    </>
  );
}
