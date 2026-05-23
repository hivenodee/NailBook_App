import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSignIn } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import { colors, spacing, borderRadius, typography } from "@/constants/theme";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Porobook</Text>
        <Text style={styles.subtitle}>
          Sign in to manage your bookings
        </Text>

        {/* Auth UI will use Clerk's managed components */}
        <Pressable
          style={styles.button}
          onPress={() => {
            // Clerk sign-in flow
          }}
        >
          <Text style={styles.buttonText}>Continue with Email</Text>
        </Pressable>

        <Pressable onPress={() => router.push("/(auth)/sign-up")}>
          <Text style={styles.link}>
            Don&apos;t have an account? Sign up
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  content: {
    alignItems: "center",
    gap: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: "center",
  },
  button: {
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    ...typography.body,
    fontWeight: "600",
  },
  link: {
    ...typography.caption,
    color: colors.primary.DEFAULT,
  },
});
