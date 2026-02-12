import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography } from "@/constants/theme";

export default function CalendarScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calendar</Text>
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No upcoming appointments</Text>
        <Text style={styles.emptySubtitle}>
          Your schedule will appear here once clients book with you
        </Text>
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
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text.secondary,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.text.muted,
    textAlign: "center",
  },
});
