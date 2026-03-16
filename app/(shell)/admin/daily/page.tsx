import type { Metadata } from "next";
import { requireAdminPageUser } from "@/lib/admin";
import { DailyAdminClient } from "@/components/admin/DailyAdminClient";

export const metadata: Metadata = {
  title: "Admin Daily — Princess",
};

export default async function AdminDailyPage() {
  await requireAdminPageUser();
  return <DailyAdminClient />;
}
