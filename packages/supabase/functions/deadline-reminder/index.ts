// Supabase Edge Function: deadline-reminder
// Runs on a cron schedule to send email/push reminders for upcoming permit deadlines

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY")!;
const SENDGRID_FROM_EMAIL = Deno.env.get("SENDGRID_FROM_EMAIL") || "reminders@permitflow.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface DeadlineRow {
  id: string;
  title: string;
  due_date: string;
  deadline_type: string;
  organization_id: string;
  permit_id: string;
  reminder_days_before: number[];
  last_reminder_sent_at: string | null;
}

interface PermitRow {
  name: string;
}

interface OrgRow {
  name: string;
  owner_id: string;
}

interface UserProfile {
  email: string;
}

async function sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: SENDGRID_FROM_EMAIL, name: "PermitFlow Reminders" },
      subject,
      content: [{ type: "text/html", value: htmlContent }],
    }),
  });

  return response.ok;
}

async function sendExpoPush(pushToken: string, title: string, body: string): Promise<boolean> {
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: pushToken,
      title,
      body,
      sound: "default",
      priority: "high",
      data: { type: "deadline_reminder" },
    }),
  });

  return response.ok;
}

function formatDeadlineEmail(
  orgName: string,
  permitName: string,
  deadlineTitle: string,
  dueDate: string,
  daysUntil: number
): string {
  const urgencyColor = daysUntil <= 3 ? "#dc2626" : daysUntil <= 7 ? "#f59e0b" : "#2563eb";
  const formattedDate = new Date(dueDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f8fafc; border-radius: 8px; padding: 24px; border-left: 4px solid ${urgencyColor};">
        <h2 style="margin: 0 0 8px; color: #1e293b;">Deadline Reminder</h2>
        <p style="color: #64748b; margin: 0 0 16px;">${orgName}</p>
        <div style="background: white; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
          <h3 style="margin: 0 0 4px; color: #1e293b;">${deadlineTitle}</h3>
          <p style="margin: 0 0 8px; color: #64748b;">Permit: ${permitName}</p>
          <p style="margin: 0; font-size: 18px; font-weight: 600; color: ${urgencyColor};">
            Due: ${formattedDate} (${daysUntil} day${daysUntil !== 1 ? "s" : ""} remaining)
          </p>
        </div>
        <a href="${Deno.env.get("APP_URL") || "https://permitflow.com"}/deadlines"
           style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">
          View Deadlines
        </a>
      </div>
    </div>
  `;
}

Deno.serve(async (_req: Request) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Find deadlines where next_reminder_at is now or in the past and not completed
  const { data: deadlines, error: deadlineError } = await supabase
    .from("permit_deadlines")
    .select("id, title, due_date, deadline_type, organization_id, permit_id, reminder_days_before, last_reminder_sent_at")
    .eq("completed", false)
    .lte("next_reminder_at", new Date().toISOString())
    .order("due_date", { ascending: true })
    .limit(100);

  if (deadlineError) {
    return new Response(JSON.stringify({ error: deadlineError.message }), { status: 500 });
  }

  if (!deadlines || deadlines.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: "No reminders due" }), { status: 200 });
  }

  let sentCount = 0;
  const errors: string[] = [];

  for (const deadline of deadlines as DeadlineRow[]) {
    try {
      // Get permit info
      const { data: permit } = await supabase
        .from("permits")
        .select("name")
        .eq("id", deadline.permit_id)
        .single();

      // Get org info
      const { data: org } = await supabase
        .from("organizations")
        .select("name, owner_id")
        .eq("id", deadline.organization_id)
        .single();

      if (!permit || !org) continue;

      const typedPermit = permit as PermitRow;
      const typedOrg = org as OrgRow;

      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(typedOrg.owner_id);
      if (!userData?.user?.email) continue;

      const daysUntil = Math.ceil(
        (new Date(deadline.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      // Check notification preferences
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", typedOrg.owner_id)
        .eq("organization_id", deadline.organization_id)
        .single();

      const emailEnabled = prefs?.email_enabled !== false;
      const pushEnabled = prefs?.push_enabled !== false;

      // Send email reminder
      if (emailEnabled) {
        const subject = `[PermitFlow] ${daysUntil <= 3 ? "URGENT: " : ""}${deadline.title} due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`;
        const html = formatDeadlineEmail(
          typedOrg.name,
          typedPermit.name,
          deadline.title,
          deadline.due_date,
          daysUntil
        );
        await sendEmail(userData.user.email, subject, html);
      }

      // Send push notification
      if (pushEnabled && prefs?.expo_push_token) {
        await sendExpoPush(
          prefs.expo_push_token,
          `Deadline: ${deadline.title}`,
          `Due in ${daysUntil} day${daysUntil !== 1 ? "s" : ""} for ${typedPermit.name}`
        );
      }

      // Update last_reminder_sent_at (trigger will recompute next_reminder_at)
      await supabase
        .from("permit_deadlines")
        .update({ last_reminder_sent_at: new Date().toISOString() })
        .eq("id", deadline.id);

      sentCount++;
    } catch (err) {
      errors.push(`Deadline ${deadline.id}: ${(err as Error).message}`);
    }
  }

  return new Response(
    JSON.stringify({ sent: sentCount, total: deadlines.length, errors }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
