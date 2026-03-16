import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ClipboardCheck,
  Brain,
  Calendar,
  FileText,
  Shield,
  Zap,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">PermitFlow</span>
          </div>
          <nav className="flex items-center space-x-4">
            <Link href="/api/auth/callback" className="text-sm text-muted-foreground hover:text-foreground">
              Sign In
            </Link>
            <Button asChild>
              <Link href="/onboarding">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto flex flex-col items-center justify-center px-4 py-24 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Stop guessing which permits
            <span className="text-primary"> your business needs</span>
          </h1>
          <p className="text-lg text-muted-foreground sm:text-xl">
            PermitFlow uses AI to analyze your business type, location, and
            activities to generate a complete permits checklist. Auto-fill
            applications, track deadlines, and get expert compliance guidance.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link href="/onboarding">Start Free Compliance Check</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#features">See How It Works</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-16">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold">Everything you need to stay compliant</h2>
          <p className="mt-2 text-muted-foreground">
            From initial registration to ongoing renewals, PermitFlow handles it all.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <Brain className="h-10 w-10 text-primary" />
              <CardTitle className="text-lg">AI Checklist Generation</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Tell us about your business and our AI analyzes federal, state,
                and local regulations to generate your personalized permits
                checklist ranked by priority.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <FileText className="h-10 w-10 text-primary" />
              <CardTitle className="text-lg">Auto-Fill Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Stop filling out the same information on every form. PermitFlow
                auto-fills permit applications using your business profile data
                so you can submit faster.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Calendar className="h-10 w-10 text-primary" />
              <CardTitle className="text-lg">Deadline Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Never miss a renewal or filing deadline. Get email and push
                notifications at 30, 14, 7, and 1 day before every deadline with
                links to take action.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <ClipboardCheck className="h-10 w-10 text-primary" />
              <CardTitle className="text-lg">Progress Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track every permit from application to approval. See your
                compliance status at a glance with visual progress indicators
                and requirement checklists.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-10 w-10 text-primary" />
              <CardTitle className="text-lg">AI Compliance Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Have questions about regulations? Chat with our AI advisor
                trained on actual government regulations for your jurisdiction.
                Get accurate, sourced answers instantly.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 text-primary" />
              <CardTitle className="text-lg">Regulation Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Regulations change. PermitFlow continuously monitors government
                sources and alerts you to changes that affect your business so
                you stay ahead of compliance requirements.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-16 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold">Ready to simplify compliance?</h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
            Join thousands of small businesses using PermitFlow to navigate
            permits and regulations. Start with a free compliance check.
          </p>
          <Button size="lg" variant="secondary" className="mt-8" asChild>
            <Link href="/onboarding">Get Started Free</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 md:flex-row">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold">PermitFlow</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} PermitFlow. Not legal advice. Consult
            a licensed attorney for legal questions.
          </p>
        </div>
      </footer>
    </div>
  );
}
