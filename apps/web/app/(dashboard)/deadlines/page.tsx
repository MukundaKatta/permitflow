import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn, daysUntil, formatDate } from "@/lib/utils";

function urgencyClass(days: number): string {
  if (days < 0) return "border-red-500 bg-red-50";
  if (days <= 3) return "border-red-300 bg-red-50";
  if (days <= 7) return "border-orange-300 bg-orange-50";
  if (days <= 14) return "border-yellow-300 bg-yellow-50";
  return "border-border";
}

function urgencyBadge(days: number): { label: string; className: string } {
  if (days < 0) return { label: "OVERDUE", className: "bg-red-600 text-white" };
  if (days === 0) return { label: "Due Today", className: "bg-red-500 text-white" };
  if (days <= 3) return { label: `${days}d left`, className: "bg-red-100 text-red-800" };
  if (days <= 7) return { label: `${days}d left`, className: "bg-orange-100 text-orange-800" };
  if (days <= 14) return { label: `${days}d left`, className: "bg-yellow-100 text-yellow-800" };
  return { label: `${days}d left`, className: "bg-gray-100 text-gray-800" };
}

export default async function DeadlinesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .single();

  if (!org) redirect("/onboarding");

  // Fetch deadlines with permit info
  const { data: deadlines } = await supabase
    .from("permit_deadlines")
    .select(`
      *,
      permits:permit_id (name, status, category)
    `)
    .eq("organization_id", org.id)
    .order("due_date", { ascending: true });

  const allDeadlines = (deadlines || []) as Array<{
    id: string;
    title: string;
    description: string | null;
    deadline_type: string;
    due_date: string;
    completed: boolean;
    permits: { name: string; status: string; category: string } | null;
  }>;

  const upcomingDeadlines = allDeadlines.filter((d) => !d.completed);
  const completedDeadlines = allDeadlines.filter((d) => d.completed);

  // Group by month
  const monthGroups = new Map<string, typeof upcomingDeadlines>();
  for (const deadline of upcomingDeadlines) {
    const date = new Date(deadline.due_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });

    if (!monthGroups.has(key)) {
      monthGroups.set(key, []);
    }
    monthGroups.get(key)!.push(deadline);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Deadlines</h1>
        <p className="text-muted-foreground">
          Track all your permit application deadlines and renewals.
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">
                  {upcomingDeadlines.filter((d) => daysUntil(d.due_date) <= 7).length}
                </p>
                <p className="text-sm text-muted-foreground">Due within 7 days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">
                  {upcomingDeadlines.filter((d) => daysUntil(d.due_date) <= 30 && daysUntil(d.due_date) > 7).length}
                </p>
                <p className="text-sm text-muted-foreground">Due within 30 days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{completedDeadlines.length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming deadlines by month */}
      {upcomingDeadlines.length > 0 ? (
        Array.from(monthGroups.entries()).map(([key, deadlines]) => {
          const monthLabel = new Date(deadlines[0].due_date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
          });

          return (
            <div key={key}>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <Calendar className="h-5 w-5" />
                {monthLabel}
              </h2>
              <div className="space-y-3">
                {deadlines.map((deadline) => {
                  const days = daysUntil(deadline.due_date);
                  const badge = urgencyBadge(days);

                  return (
                    <Card key={deadline.id} className={cn("border-l-4", urgencyClass(days))}>
                      <CardContent className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold">
                              {new Date(deadline.due_date).getDate()}
                            </p>
                            <p className="text-xs text-muted-foreground uppercase">
                              {new Date(deadline.due_date).toLocaleDateString("en-US", { weekday: "short" })}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium">{deadline.title}</p>
                            {deadline.permits && (
                              <p className="text-sm text-muted-foreground">
                                {deadline.permits.name}
                              </p>
                            )}
                            {deadline.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {deadline.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={badge.className}>{badge.label}</Badge>
                          <Badge variant="outline" className="capitalize">
                            {deadline.deadline_type.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No upcoming deadlines</p>
            <p className="text-sm text-muted-foreground">
              Deadlines will appear here as you track your permits.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
