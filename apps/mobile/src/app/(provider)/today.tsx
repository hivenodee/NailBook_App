import { View, Text, FlatList, StyleSheet } from "react-native";
import { colors, spacing, typography, borderRadius } from "@/constants/theme";

export default function TodayScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today</Text>
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No appointments today</Text>
        <Text style={styles.emptySubtitle}>
          Share your booking link to start getting clients
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
