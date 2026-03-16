import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, AlertTriangle, ExternalLink } from "lucide-react";
import { cn, formatCurrency, priorityLabel, priorityColor, statusColor } from "@/lib/utils";
import Link from "next/link";

export default async function ChecklistPage() {
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

  const { data: permits } = await supabase
    .from("permits")
    .select("*")
    .eq("organization_id", org.id)
    .order("priority", { ascending: false })
    .order("sort_order", { ascending: true });

  const allPermits = permits || [];
  const completedCount = allPermits.filter((p) => p.status === "approved").length;
  const totalCount = allPermits.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const criticalPermits = allPermits.filter((p) => p.priority >= 8 && p.status !== "approved");
  const categories = [...new Set(allPermits.map((p) => p.category))];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Permit Checklist</h1>
        <p className="text-muted-foreground">
          Your personalized compliance checklist based on your business profile.
        </p>
      </div>

      {/* Progress overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Overall Compliance Progress
            </span>
            <span className="text-sm text-muted-foreground">
              {completedCount} of {totalCount} permits completed
            </span>
          </div>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      {/* Critical items alert */}
      {criticalPermits.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-lg text-orange-900">
                {criticalPermits.length} Critical Permit{criticalPermits.length !== 1 ? "s" : ""} Needed
              </CardTitle>
            </div>
            <CardDescription className="text-orange-800">
              These permits are required before you can legally operate. Start with these first.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {criticalPermits.slice(0, 5).map((permit) => (
              <Link
                key={permit.id}
                href={`/permits?id=${permit.id}`}
                className="flex items-center justify-between rounded-lg border border-orange-200 bg-white p-3 hover:bg-orange-50"
              >
                <div className="flex items-center gap-3">
                  <Circle className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium">{permit.name}</p>
                    <p className="text-xs text-muted-foreground">{permit.category.replace(/_/g, " ")}</p>
                  </div>
                </div>
                {permit.estimated_cost !== null && (
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(permit.estimated_cost)}
                  </span>
                )}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Permits by category */}
      {categories.map((category) => {
        const categoryPermits = allPermits.filter((p) => p.category === category);
        const categoryCompleted = categoryPermits.filter((p) => p.status === "approved").length;

        return (
          <Card key={category}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg capitalize">
                  {category.replace(/_/g, " ")}
                </CardTitle>
                <span className="text-sm text-muted-foreground">
                  {categoryCompleted}/{categoryPermits.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {categoryPermits.map((permit) => (
                <Link
                  key={permit.id}
                  href={`/permits?id=${permit.id}`}
                  className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent"
                >
                  {permit.status === "approved" ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{permit.name}</p>
                      <span className={cn("text-xs font-medium", priorityColor(permit.priority))}>
                        {priorityLabel(permit.priority)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {permit.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Badge className={statusColor(permit.status)} variant="secondary">
                      {permit.status.replace(/_/g, " ")}
                    </Badge>
                    {permit.estimated_cost !== null && (
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(permit.estimated_cost)}
                      </span>
                    )}
                    {permit.application_url && (
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {allPermits.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No permits in your checklist yet.</p>
            <Link
              href="/onboarding"
              className="mt-2 text-sm text-primary hover:underline"
            >
              Complete onboarding to generate your checklist
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
