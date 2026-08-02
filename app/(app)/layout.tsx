import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import { AppNav } from "@/components/app-nav";
import { ToastProvider } from "@/components/ui/toast";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  return (
    <SessionProvider session={session}>
      <ToastProvider>
        <div className="flex h-dvh overflow-hidden">
          <AppNav
            name={session.user.name ?? "Athlete"}
            email={session.user.email ?? ""}
          />
          {/* pb-14 clears the mobile tab bar; md:pb-0 removes it on desktop. */}
          <div className="min-w-0 flex-1 overflow-y-auto pb-14 md:pb-0">
            {children}
          </div>
        </div>
      </ToastProvider>
    </SessionProvider>
  );
}
