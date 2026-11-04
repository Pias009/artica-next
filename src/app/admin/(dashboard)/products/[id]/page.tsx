import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage() {
  await requireAdmin();
  return null;
}
