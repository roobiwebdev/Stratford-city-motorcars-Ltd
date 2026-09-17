import { AdminApp } from "@/components/shell/admin-app";

/** Everything behind a session. */
export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AdminApp>{children}</AdminApp>;
}
