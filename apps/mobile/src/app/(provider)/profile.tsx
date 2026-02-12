import { View, Text, Pressable, StyleSheet, Share } from "react-native";
import { colors, spacing, typography, borderRadius } from "@/constants/theme";

export default function ProviderProfileScreen() {
  const handleShareLink = async () => {
    await Share.share({
      message: "Book with me on NailBook!",
      // URL will be dynamic: ${APP_URL}/${slug}
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      {/* Profile card */}
      <View style={styles.card}>
        <View style={styles.avatarPlaceholder} />
        <Text style={styles.name}>Your Business Name</Text>
        <Text style={styles.subtitle}>Set up your profile to get started</Text>
      </View>

      {/* Share booking link — primary action per design.md */}
      <Pressable style={styles.primaryButton} onPress={handleShareLink}>
        <Text style={styles.primaryButtonText}>Share Booking Link</Text>
      </Pressable>

      {/* Settings sections */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        {[
          "Edit Profile",
          "Services & Pricing",
          "Availability",
          "Payment Methods",
          "Cancellation Policy",
          "Portfolio",
          "Export Data",
        ].map((item) => (
          <Pressable key={item} style={styles.settingRow}>
            <Text style={styles.settingText}>{item}</Text>
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
    marginBottom: spacing.md,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary.light,
  },
  name: {
    ...typography.h3,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.text.muted,
  },
  primaryButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    ...typography.body,
    fontWeight: "600",
  },
  section: {
    gap: 1,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.text.muted,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
