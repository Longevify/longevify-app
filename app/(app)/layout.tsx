import { TopNav } from "@/components/app/top-nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="flex-1">{children}</main>
    </div>
  );
}
