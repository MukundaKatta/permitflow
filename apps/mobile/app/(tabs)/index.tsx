import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { supabase } from "@/lib/supabase";

interface Deadline {
  id: string;
  title: string;
  description: string | null;
  deadline_type: string;
  due_date: string;
  completed: boolean;
  permit_name: string | null;
}

function daysUntil(dateStr: string): number {
  return Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

function urgencyColor(days: number): string {
  if (days < 0) return "#dc2626";
  if (days <= 3) return "#dc2626";
  if (days <= 7) return "#f59e0b";
  if (days <= 14) return "#eab308";
  return "#2563eb";
}

export default function DeadlinesScreen() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDeadlines = useCallback(async () => {
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

    const { data } = await supabase
      .from("permit_deadlines")
      .select(`
        id, title, description, deadline_type, due_date, completed,
        permits:permit_id (name)
      `)
      .eq("organization_id", org.id)
      .eq("completed", false)
      .order("due_date", { ascending: true })
      .limit(50);

    if (data) {
      setDeadlines(
        data.map((d: any) => ({
          ...d,
          permit_name: d.permits?.name || null,
        }))
      );
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadDeadlines();
  }, [loadDeadlines]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDeadlines();
  }, [loadDeadlines]);

  async function markComplete(id: string) {
    await supabase
      .from("permit_deadlines")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("id", id);

    setDeadlines((prev) => prev.filter((d) => d.id !== id));
  }

  function renderDeadline({ item }: { item: Deadline }) {
    const days = daysUntil(item.due_date);
    const color = urgencyColor(days);
    const dateStr = new Date(item.due_date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return (
      <View style={[styles.card, { borderLeftColor: color }]}>
        <View style={styles.cardHeader}>
          <View style={styles.dateChip}>
            <Text style={[styles.dateChipText, { color }]}>
              {days < 0
                ? "OVERDUE"
                : days === 0
                  ? "TODAY"
                  : `${days}d left`}
            </Text>
          </View>
          <Text style={styles.deadlineType}>
            {item.deadline_type.replace(/_/g, " ").toUpperCase()}
          </Text>
        </View>

        <Text style={styles.title}>{item.title}</Text>
        {item.permit_name && (
          <Text style={styles.permitName}>{item.permit_name}</Text>
        )}
        <Text style={styles.date}>{dateStr}</Text>

        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <TouchableOpacity
          style={styles.completeButton}
          onPress={() => markComplete(item.id)}
        >
          <Text style={styles.completeButtonText}>Mark Complete</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {deadlines.length > 0 ? (
        <FlatList
          data={deadlines}
          renderItem={renderDeadline}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No Upcoming Deadlines</Text>
          <Text style={styles.emptySubtitle}>
            Your permit deadlines will appear here
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dateChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
  },
  dateChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  deadlineType: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9ca3af",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  permitName: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    color: "#9ca3af",
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
    marginBottom: 8,
  },
  completeButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    marginTop: 4,
  },
  completeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#16a34a",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 4,
  },
});
