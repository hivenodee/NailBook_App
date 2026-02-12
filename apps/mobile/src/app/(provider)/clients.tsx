import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography } from "@/constants/theme";

export default function ClientsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Clients</Text>
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No clients yet</Text>
        <Text style={styles.emptySubtitle}>
          Clients who book with you will appear here with their visit history
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
