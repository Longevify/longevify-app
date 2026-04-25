import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/sidebar";

export const metadata: Metadata = {
  title: "Longevify Admin",
  description:
    "Painel clínico Longevify — gestão de pacientes, exames e catálogo de produtos.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#F5F7F6]">
      <AdminSidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="mx-auto w-full max-w-[1400px] flex-1 px-8 py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
