import { AdminHub } from "@/components/admin/AdminHub";

// Reads and writes files on disk, so it must not be prerendered.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Test library | Klutch",
};

export default function AdminPage() {
  return <AdminHub />;
}
