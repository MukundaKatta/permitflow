import { Tabs } from "expo-router";
import { Platform } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#6b7280",
        headerStyle: { backgroundColor: "#ffffff" },
        headerTintColor: "#111827",
        tabBarStyle: {
          paddingBottom: Platform.OS === "ios" ? 24 : 8,
          height: Platform.OS === "ios" ? 88 : 64,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Deadlines",
          headerTitle: "PermitFlow",
        }}
      />
      <Tabs.Screen
        name="permits"
        options={{
          title: "Permits",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
        }}
      />
    </Tabs>
  );
}
