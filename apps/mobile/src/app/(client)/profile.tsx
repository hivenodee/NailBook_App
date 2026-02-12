import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, spacing, typography, borderRadius } from "@/constants/theme";

export default function ClientProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <View style={styles.avatarPlaceholder} />
        <Text style={styles.name}>Your Name</Text>
      </View>

      <View style={styles.section}>
        {[
          "Saved Providers",
          "Payment Methods",
          "Appointment History",
          "Activity Log",
          "Sign Out",
        ].map((item) => (
          <Pressable key={item} style={styles.settingRow}>
            <Text
              style={[
                styles.settingText,
                item === "Sign Out" && { color: colors.status.error },
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: spacing.lg,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary.light,
  },
  name: {
    ...typography.h3,
    color: colors.text.primary,
  },
  section: {
    gap: 1,
  },
  settingRow: {
    backgroundColor: colors.surface,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingText: {
    ...typography.body,
    color: colors.text.primary,
  },
});
