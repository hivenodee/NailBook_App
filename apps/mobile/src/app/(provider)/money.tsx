import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography, borderRadius } from "@/constants/theme";

export default function MoneyScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Money</Text>

      {/* Summary cards — ledger-first per design.md */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={styles.summaryValue}>$0.00</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Completed</Text>
          <Text style={styles.summaryValue}>$0.00</Text>
        </View>
      </View>

      {/* Transaction list */}
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No transactions yet</Text>
        <Text style={styles.emptySubtitle}>
          Payments from bookings will appear here with full status visibility
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
  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.text.muted,
    marginBottom: 4,
  },
  summaryValue: {
    ...typography.h2,
    color: colors.text.primary,
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
