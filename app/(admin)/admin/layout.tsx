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
    // Em mobile: coluna (topbar acima + conteúdo abaixo). Em desktop: linha (sidebar lateral + conteúdo).
    <div className="flex min-h-screen flex-col bg-[#F5F7F6] sm:flex-row">
      <AdminSidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-8 sm:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
