import { useState, useEffect } from "react";
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { supabase } from "@/lib/supabase";

interface NotifPrefs {
  email_enabled: boolean;
  push_enabled: boolean;
  daily_digest: boolean;
  reminder_days: number[];
}

export default function SettingsScreen() {
  const [prefs, setPrefs] = useState<NotifPrefs>({
    email_enabled: true,
    push_enabled: true,
    daily_digest: false,
    reminder_days: [30, 14, 7, 1],
  });
  const [email, setEmail] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setEmail(user.email || "");

    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1)
      .single();

    if (!org) return;

    const { data } = await supabase
      .from("notification_preferences")
      .select("email_enabled, push_enabled, daily_digest, reminder_days")
      .eq("user_id", user.id)
      .eq("organization_id", org.id)
      .single();

    if (data) {
      setPrefs(data as NotifPrefs);
    }
  }

  async function updatePref(key: keyof NotifPrefs, value: boolean) {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1)
      .single();

    if (!org) return;

    await supabase
      .from("notification_preferences")
      .update({ [key]: value })
      .eq("user_id", user.id)
      .eq("organization_id", org.id);
  }

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{email}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View>
              <Text style={styles.label}>Email Reminders</Text>
              <Text style={styles.hint}>
                Receive deadline reminders via email
              </Text>
            </View>
            <Switch
              value={prefs.email_enabled}
              onValueChange={(v) => updatePref("email_enabled", v)}
              trackColor={{ true: "#2563eb" }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View>
              <Text style={styles.label}>Push Notifications</Text>
              <Text style={styles.hint}>
                Receive deadline alerts on this device
              </Text>
            </View>
            <Switch
              value={prefs.push_enabled}
              onValueChange={(v) => updatePref("push_enabled", v)}
              trackColor={{ true: "#2563eb" }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View>
              <Text style={styles.label}>Daily Digest</Text>
              <Text style={styles.hint}>
                Morning summary of upcoming deadlines
              </Text>
            </View>
            <Switch
              value={prefs.daily_digest}
              onValueChange={(v) => updatePref("daily_digest", v)}
              trackColor={{ true: "#2563eb" }}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Reminder Schedule</Text>
          <Text style={styles.hint}>
            You will be reminded at: {prefs.reminder_days.join(", ")} days
            before each deadline
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>PermitFlow v1.0.0</Text>
        <Text style={styles.footerText}>
          Not legal advice. Consult a licensed attorney.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
  },
  value: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
    maxWidth: 240,
  },
  divider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginVertical: 12,
  },
  signOutButton: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#dc2626",
  },
  footer: {
    padding: 24,
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: "#9ca3af",
  },
});
