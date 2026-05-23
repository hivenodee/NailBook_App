import { useEffect, useCallback } from "react";
import { Platform, View, ActivityIndicator } from "react-native";
import { Slot } from "expo-router";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@/lib/auth";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  PlayfairDisplay_900Black,
  PlayfairDisplay_700Bold_Italic,
} from "@expo-google-fonts/playfair-display";
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
} from "@expo-google-fonts/dm-sans";
import {
  JosefinSans_300Light,
  JosefinSans_600SemiBold,
} from "@expo-google-fonts/josefin-sans";
import {
  CormorantGaramond_400Regular_Italic,
} from "@expo-google-fonts/cormorant-garamond";
import { colors } from "@/constants/theme";

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

function PushTokenRegistration() {
  const { isSignedIn, getToken } = useAuth();

  useEffect(() => {
    async function registerForPush() {
      // Push notifications only work on physical devices, not simulators
      if (Platform.OS === "web") return;

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") return;

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      const clerkToken = await getToken();
      if (!clerkToken) return;

      await fetch(`${API_URL}/api/push-tokens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${clerkToken}`,
        },
        body: JSON.stringify({
          token: tokenData.data,
          platform: Platform.OS === "ios" ? "IOS" : "ANDROID",
        }),
      });
    }

    if (isSignedIn) {
      registerForPush().catch(console.error);
    }
  }, [isSignedIn, getToken]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_900Black,
    PlayfairDisplay_700Bold_Italic,
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
    JosefinSans_300Light,
    JosefinSans_600SemiBold,
    CormorantGaramond_400Regular_Italic,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.charcoal, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.ember} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ClerkLoaded>
          <PushTokenRegistration />
          <Slot />
        </ClerkLoaded>
      </ClerkProvider>
    </View>
  );
}
