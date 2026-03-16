"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Shield, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";

const INDUSTRIES = [
  "restaurant",
  "food_service",
  "retail",
  "professional_services",
  "consulting",
  "technology",
  "construction",
  "healthcare",
  "real_estate",
  "manufacturing",
  "wholesale",
  "transportation",
  "hospitality",
  "beauty_salon",
  "auto_repair",
  "cannabis",
  "other",
];

const ENTITY_TYPES = [
  { value: "sole_proprietorship", label: "Sole Proprietorship" },
  { value: "llc", label: "LLC" },
  { value: "corporation", label: "Corporation" },
  { value: "s_corp", label: "S Corporation" },
  { value: "partnership", label: "Partnership" },
  { value: "nonprofit", label: "Nonprofit" },
];

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const REVENUE_RANGES = [
  "Under $50,000",
  "$50,000 - $100,000",
  "$100,000 - $250,000",
  "$250,000 - $500,000",
  "$500,000 - $1,000,000",
  "$1,000,000 - $5,000,000",
  "Over $5,000,000",
];

interface FormData {
  businessName: string;
  entityType: string;
  industry: string;
  description: string;
  employeeCount: string;
  annualRevenue: string;
  streetAddress: string;
  city: string;
  county: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website: string;
  servesFood: boolean;
  sellsAlcohol: boolean;
  hazardousMaterials: boolean;
  hasSignage: boolean;
  hasEmployees: boolean;
  homeBased: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    businessName: "",
    entityType: "",
    industry: "",
    description: "",
    employeeCount: "0",
    annualRevenue: "",
    streetAddress: "",
    city: "",
    county: "",
    state: "",
    zipCode: "",
    phone: "",
    email: "",
    website: "",
    servesFood: false,
    sellsAlcohol: false,
    hazardousMaterials: false,
    hasSignage: false,
    hasEmployees: false,
    homeBased: false,
  });

  const updateForm = (updates: Partial<FormData>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to complete onboarding");
      }

      router.push("/checklist");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Set Up Your Business Profile</CardTitle>
          <CardDescription>
            Tell us about your business so we can identify the permits and licenses you need.
            Step {step} of 3.
          </CardDescription>
          <div className="flex gap-1 pt-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Business basics */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  value={form.businessName}
                  onChange={(e) => updateForm({ businessName: e.target.value })}
                  placeholder="Acme Restaurant LLC"
                />
              </div>

              <div>
                <Label htmlFor="entityType">Entity Type *</Label>
                <Select value={form.entityType} onValueChange={(v) => updateForm({ entityType: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="industry">Industry *</Label>
                <Select value={form.industry} onValueChange={(v) => updateForm({ industry: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Business Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => updateForm({ description: e.target.value })}
                  placeholder="Briefly describe what your business does..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employeeCount">Number of Employees</Label>
                  <Input
                    id="employeeCount"
                    type="number"
                    min="0"
                    value={form.employeeCount}
                    onChange={(e) => updateForm({ employeeCount: e.target.value, hasEmployees: parseInt(e.target.value) > 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="annualRevenue">Annual Revenue Range</Label>
                  <Select value={form.annualRevenue} onValueChange={(v) => updateForm({ annualRevenue: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      {REVENUE_RANGES.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="streetAddress">Street Address *</Label>
                <Input
                  id="streetAddress"
                  value={form.streetAddress}
                  onChange={(e) => updateForm({ streetAddress: e.target.value })}
                  placeholder="123 Main Street, Suite 100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => updateForm({ city: e.target.value })}
                    placeholder="Las Vegas"
                  />
                </div>
                <div>
                  <Label htmlFor="county">County</Label>
                  <Input
                    id="county"
                    value={form.county}
                    onChange={(e) => updateForm({ county: e.target.value })}
                    placeholder="Clark"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Select value={form.state} onValueChange={(v) => updateForm({ state: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="zipCode">ZIP Code *</Label>
                  <Input
                    id="zipCode"
                    value={form.zipCode}
                    onChange={(e) => updateForm({ zipCode: e.target.value })}
                    placeholder="89101"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateForm({ phone: e.target.value })}
                    placeholder="(702) 555-0100"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Business Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm({ email: e.target.value })}
                    placeholder="info@business.com"
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={form.website}
                    onChange={(e) => updateForm({ website: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Business details & flags */}
          {step === 3 && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                These details help us identify industry-specific permits you may need.
              </p>

              <div className="space-y-4">
                {[
                  { key: "servesFood" as const, label: "Does your business serve or prepare food?", desc: "Restaurants, cafes, food trucks, catering, etc." },
                  { key: "sellsAlcohol" as const, label: "Does your business sell or serve alcohol?", desc: "Bars, restaurants with alcohol, liquor stores, etc." },
                  { key: "hazardousMaterials" as const, label: "Does your business handle hazardous materials?", desc: "Chemicals, flammable materials, compressed gases, etc." },
                  { key: "hasSignage" as const, label: "Will you have exterior signage?", desc: "Business signs, banners, illuminated signs, etc." },
                  { key: "hasEmployees" as const, label: "Do you have or plan to hire employees?", desc: "W-2 employees (not independent contractors)" },
                  { key: "homeBased" as const, label: "Is this a home-based business?", desc: "Operating from a residential address" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={form[item.key]}
                      onCheckedChange={(checked) => updateForm({ [item.key]: checked })}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={
                  (step === 1 && (!form.businessName || !form.entityType || !form.industry)) ||
                  (step === 2 && (!form.streetAddress || !form.city || !form.state || !form.zipCode))
                }
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Your Checklist...
                  </>
                ) : (
                  <>
                    Generate Permit Checklist
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
