import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { supabase } from "@/lib/supabase";
import { registerForPushNotifications, savePushToken } from "@/lib/notifications";
import type { Session } from "@supabase/supabase-js";

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      // Register for push notifications when user is signed in
      registerForPushNotifications().then((token) => {
        if (token) {
          savePushToken(token);
        }
      });
    }
  }, [session]);

  if (loading) return null;

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#ffffff" },
          headerTintColor: "#2563eb",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      >
        {session ? (
          <>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </>
        ) : (
          <Stack.Screen name="login" options={{ title: "Sign In", headerShown: false }} />
        )}
      </Stack>
    </>
  );
}
