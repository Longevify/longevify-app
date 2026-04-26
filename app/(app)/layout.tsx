import { TopNav } from "@/components/app/top-nav";
import { Footer } from "@/components/app/footer";
import { UserProvider } from "@/lib/auth/user-context";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <UserProvider user={user}>
      <div className="flex min-h-screen flex-col">
        <TopNav />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </UserProvider>
  );
}
