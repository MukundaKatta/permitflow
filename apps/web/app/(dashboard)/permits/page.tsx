"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  FileText,
  Loader2,
  Save,
  ChevronRight,
} from "lucide-react";
import { cn, formatCurrency, formatDate, statusColor, priorityLabel, priorityColor } from "@/lib/utils";
import type { Permit, PermitStatus } from "@permitflow/supabase";

const STATUS_OPTIONS: { value: PermitStatus; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
  { value: "expired", label: "Expired" },
  { value: "renewal_needed", label: "Renewal Needed" },
];

export default function PermitsPage() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  const [permits, setPermits] = useState<Permit[]>([]);
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoFillLoading, setAutoFillLoading] = useState(false);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    loadPermits();
  }, []);

  useEffect(() => {
    if (selectedId && permits.length > 0) {
      const permit = permits.find((p) => p.id === selectedId);
      if (permit) setSelectedPermit(permit);
    }
  }, [selectedId, permits]);

  async function loadPermits() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!org) return;

    const { data } = await supabase
      .from("permits")
      .select("*")
      .eq("organization_id", org.id)
      .order("priority", { ascending: false })
      .order("sort_order", { ascending: true });

    setPermits((data as Permit[]) || []);
    setLoading(false);
  }

  async function updatePermit(updates: Partial<Permit>) {
    if (!selectedPermit) return;
    setSaving(true);

    const { error } = await supabase
      .from("permits")
      .update(updates)
      .eq("id", selectedPermit.id);

    if (!error) {
      const updated = { ...selectedPermit, ...updates };
      setSelectedPermit(updated as Permit);
      setPermits((prev) =>
        prev.map((p) => (p.id === selectedPermit.id ? (updated as Permit) : p))
      );
    }

    setSaving(false);
  }

  async function toggleRequirement(index: number) {
    if (!selectedPermit) return;
    const requirements = [...(selectedPermit.requirements || [])];
    requirements[index] = { ...requirements[index], completed: !requirements[index].completed };
    await updatePermit({ requirements } as Partial<Permit>);
  }

  async function handleAutoFill() {
    if (!selectedPermit) return;
    setAutoFillLoading(true);

    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permitId: selectedPermit.id, action: "auto-fill" }),
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh permit data
        await loadPermits();
      }
    } catch (err) {
      console.error("Auto-fill failed:", err);
    } finally {
      setAutoFillLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Permit Tracking</h1>
        <p className="text-muted-foreground">
          Track the status and progress of each permit application.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Permit list */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your Permits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-2">
            {permits.map((permit) => (
              <button
                key={permit.id}
                onClick={() => setSelectedPermit(permit)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                  selectedPermit?.id === permit.id && "bg-accent"
                )}
              >
                {permit.status === "approved" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{permit.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {permit.category.replace(/_/g, " ")}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Permit detail */}
        {selectedPermit ? (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{selectedPermit.name}</CardTitle>
                  <CardDescription>{selectedPermit.description}</CardDescription>
                </div>
                <Badge className={statusColor(selectedPermit.status)} variant="secondary">
                  {selectedPermit.status.replace(/_/g, " ")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="details">
                <TabsList>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="requirements">
                    Requirements ({(selectedPermit.requirements || []).filter((r) => r.completed).length}/
                    {(selectedPermit.requirements || []).length})
                  </TabsTrigger>
                  <TabsTrigger value="tracking">Tracking</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 pt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={selectedPermit.status}
                        onValueChange={(v) => updatePermit({ status: v as PermitStatus })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <p className={cn("text-sm font-medium pt-2", priorityColor(selectedPermit.priority))}>
                        {priorityLabel(selectedPermit.priority)} ({selectedPermit.priority}/10)
                      </p>
                    </div>
                    <div>
                      <Label>Estimated Cost</Label>
                      <p className="text-sm pt-2">{formatCurrency(selectedPermit.estimated_cost)}</p>
                    </div>
                    <div>
                      <Label>Processing Time</Label>
                      <p className="text-sm pt-2">
                        {selectedPermit.estimated_processing_days
                          ? `${selectedPermit.estimated_processing_days} days`
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  {selectedPermit.application_url && (
                    <div>
                      <Label>Application Link</Label>
                      <a
                        href={selectedPermit.application_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary hover:underline pt-1"
                      >
                        {selectedPermit.application_url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={handleAutoFill} disabled={autoFillLoading}>
                      {autoFillLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="mr-2 h-4 w-4" />
                      )}
                      Auto-Fill Application
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="requirements" className="space-y-3 pt-4">
                  {(selectedPermit.requirements || []).map((req, index) => (
                    <button
                      key={index}
                      onClick={() => toggleRequirement(index)}
                      className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
                    >
                      {req.completed ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                      ) : (
                        <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                      )}
                      <div>
                        <p className={cn("text-sm font-medium", req.completed && "line-through text-muted-foreground")}>
                          {req.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{req.description}</p>
                      </div>
                    </button>
                  ))}
                  {(selectedPermit.requirements || []).length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No requirements listed for this permit.
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="tracking" className="space-y-4 pt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="applicationNumber">Application Number</Label>
                      <Input
                        id="applicationNumber"
                        value={selectedPermit.application_number || ""}
                        onChange={(e) => updatePermit({ application_number: e.target.value })}
                        placeholder="Enter tracking number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="actualCost">Actual Cost ($)</Label>
                      <Input
                        id="actualCost"
                        type="number"
                        value={selectedPermit.actual_cost || ""}
                        onChange={(e) =>
                          updatePermit({ actual_cost: e.target.value ? parseFloat(e.target.value) : null })
                        }
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={selectedPermit.notes || ""}
                      onChange={(e) => updatePermit({ notes: e.target.value })}
                      placeholder="Add notes about this permit..."
                      rows={4}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">Submitted</Label>
                      <p>{formatDate(selectedPermit.submitted_at)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Approved</Label>
                      <p>{formatDate(selectedPermit.approved_at)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Expires</Label>
                      <p>{formatDate(selectedPermit.expires_at)}</p>
                    </div>
                  </div>

                  {saving && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">Select a permit to view details</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
