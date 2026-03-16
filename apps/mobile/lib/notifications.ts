import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission not granted");
    return null;
  }

  // Android-specific channel setup
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("deadlines", {
      name: "Deadline Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2563eb",
      sound: "notification-sound.wav",
    });

    await Notifications.setNotificationChannelAsync("updates", {
      name: "Regulation Updates",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // Get push token
  const tokenResponse = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  });

  return tokenResponse.data;
}

export async function savePushToken(token: string): Promise<void> {
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

  // Upsert notification preferences with push token
  await supabase
    .from("notification_preferences")
    .upsert(
      {
        user_id: user.id,
        organization_id: org.id,
        expo_push_token: token,
        push_enabled: true,
      },
      { onConflict: "user_id,organization_id" }
    );
}

export async function scheduleLocalDeadlineReminder(
  deadlineId: string,
  title: string,
  body: string,
  triggerDate: Date
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { deadlineId, type: "deadline_reminder" },
      sound: "notification-sound.wav",
      categoryIdentifier: "deadline",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: "deadlines",
    },
  });

  return id;
}

export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}
