import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing, borderRadius, typography } from "@/constants/theme";

export default function SignUpScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>
          Join NailBook to book appointments and manage your profile
        </Text>

        <Pressable
          style={styles.button}
          onPress={() => {
            // Clerk sign-up flow
          }}
        >
          <Text style={styles.buttonText}>Continue with Email</Text>
        </Pressable>

        <Pressable onPress={() => router.push("/(auth)/sign-in")}>
          <Text style={styles.link}>Already have an account? Sign in</Text>
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
