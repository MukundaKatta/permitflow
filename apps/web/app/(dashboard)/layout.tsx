import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ClipboardCheck,
  Calendar,
  MessageSquare,
  FileText,
  Settings,
  Shield,
  LayoutDashboard,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/checklist", label: "Checklist", icon: ClipboardCheck },
  { href: "/permits", label: "Permits", icon: LayoutDashboard },
  { href: "/deadlines", label: "Deadlines", icon: Calendar },
  { href: "/assistant", label: "AI Advisor", icon: MessageSquare },
  { href: "/documents", label: "Documents", icon: FileText },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, subscription_tier")
    .eq("owner_id", user.id)
    .limit(1)
    .single();

  if (!org) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-64 flex-col border-r bg-card">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Shield className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">PermitFlow</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t p-4">
          <div className="mb-2 text-xs text-muted-foreground">
            {org.name}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="rounded bg-primary/10 px-2 py-0.5 font-medium text-primary capitalize">
              {org.subscription_tier}
            </span>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-3 w-3" />
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
