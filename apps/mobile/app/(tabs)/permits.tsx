import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { supabase } from "@/lib/supabase";

interface PermitItem {
  id: string;
  name: string;
  category: string;
  status: string;
  priority: number;
  estimated_cost: number | null;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  not_started: { bg: "#f3f4f6", text: "#374151" },
  in_progress: { bg: "#dbeafe", text: "#1d4ed8" },
  submitted: { bg: "#fef3c7", text: "#92400e" },
  under_review: { bg: "#ede9fe", text: "#6d28d9" },
  approved: { bg: "#dcfce7", text: "#166534" },
  denied: { bg: "#fee2e2", text: "#991b1b" },
  expired: { bg: "#ffedd5", text: "#9a3412" },
  renewal_needed: { bg: "#fef3c7", text: "#92400e" },
};

export default function PermitsScreen() {
  const [permits, setPermits] = useState<PermitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPermits = useCallback(async () => {
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
      .from("permits")
      .select("id, name, category, status, priority, estimated_cost")
      .eq("organization_id", org.id)
      .order("priority", { ascending: false })
      .order("sort_order", { ascending: true });

    if (data) setPermits(data as PermitItem[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadPermits();
  }, [loadPermits]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPermits();
  }, [loadPermits]);

  function renderPermit({ item }: { item: PermitItem }) {
    const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS.not_started;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.category}>
            {item.category.replace(/_/g, " ").toUpperCase()}
          </Text>
          <View style={[styles.statusChip, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {item.status.replace(/_/g, " ")}
            </Text>
          </View>
        </View>

        <Text style={styles.name}>{item.name}</Text>

        <View style={styles.cardBottom}>
          <Text style={styles.priority}>
            Priority: {item.priority}/10
          </Text>
          {item.estimated_cost !== null && (
            <Text style={styles.cost}>
              ~${item.estimated_cost.toLocaleString()}
            </Text>
          )}
        </View>
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

  const approved = permits.filter((p) => p.status === "approved").length;

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {approved} of {permits.length} permits completed
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width:
                  permits.length > 0
                    ? `${(approved / permits.length) * 100}%`
                    : "0%",
              },
            ]}
          />
        </View>
      </View>

      <FlatList
        data={permits}
        renderItem={renderPermit}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
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
  summary: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  summaryText: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#2563eb",
    borderRadius: 3,
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  category: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9ca3af",
    letterSpacing: 0.5,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priority: {
    fontSize: 12,
    color: "#6b7280",
  },
  cost: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
});
