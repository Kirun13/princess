import type { Metadata } from "next";
import { requireAdminPageUser } from "@/lib/admin";
import { LevelsAdminClient } from "@/components/admin/LevelsAdminClient";

export const metadata: Metadata = {
  title: "Admin Levels — Princess",
};

export default async function AdminLevelsPage() {
  await requireAdminPageUser();
  return <LevelsAdminClient />;
}
