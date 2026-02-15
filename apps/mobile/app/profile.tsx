import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const DAILY_EARNINGS = [
  { day: "Mon", amount: 520, maxAmount: 620 },
  { day: "Tue", amount: 480, maxAmount: 620 },
  { day: "Wed", amount: 620, maxAmount: 620 },
  { day: "Thu", amount: 390, maxAmount: 620 },
  { day: "Fri", amount: 440, maxAmount: 620 },
];

const CERTIFICATIONS = [
  { name: "Hazmat", icon: "warning-outline" as const, color: "#ef4444" },
  { name: "Tanker", icon: "water-outline" as const, color: "#3b82f6" },
  { name: "Doubles/Triples", icon: "git-merge-outline" as const, color: "#8b5cf6" },
];

export default function ProfileScreen() {
  const [darkMode, setDarkMode] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLanguage = () => {
    Alert.alert("Language", "Select language", [
      { text: "English", style: "default" },
      { text: "Espa\u00f1ol", style: "default" },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive" },
    ]);
  };

  // Helper to determine if a date is more or less than 3 months from now
  const getDateColor = (monthsAway: number) => {
    return monthsAway > 3 ? "#22c55e" : "#f59e0b";
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>MJ</Text>
        </View>
        <Text style={styles.name}>Mike Johnson</Text>
        <Text style={styles.role}>Driver &middot; Ryland Logistics</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: "#22c55e" }]} />
          <Text style={styles.statusLabel}>Available</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>247</Text>
          <Text style={styles.statLabel}>Total Loads</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>96%</Text>
          <Text style={styles.statLabel}>On-Time</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>4.8</Text>
          <Text style={styles.statLabel}>Avg Rating</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>3,420</Text>
          <Text style={styles.statLabel}>Miles/Mo</Text>
        </View>
      </View>

      {/* Earnings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Earnings</Text>
        <View style={styles.earningsCard}>
          <View style={styles.earningsTopRow}>
            <View style={styles.earningsPeriod}>
              <Text style={styles.earningsPeriodLabel}>This Week</Text>
              <Text style={styles.earningsPeriodValue}>$2,450</Text>
            </View>
            <View style={styles.earningsDivider} />
            <View style={styles.earningsPeriod}>
              <Text style={styles.earningsPeriodLabel}>This Month</Text>
              <Text style={styles.earningsPeriodValue}>$8,780</Text>
            </View>
          </View>

          {/* Mini Bar Chart */}
          <View style={styles.chartContainer}>
            {DAILY_EARNINGS.map((day) => {
              const barHeight = (day.amount / day.maxAmount) * 80;
              return (
                <View key={day.day} style={styles.chartBarCol}>
                  <View style={styles.chartBarBg}>
                    <View
                      style={[
                        styles.chartBarFill,
                        { height: barHeight },
                      ]}
                    />
                  </View>
                  <Text style={styles.chartBarLabel}>{day.day}</Text>
                  <Text style={styles.chartBarAmount}>${day.amount}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* Vehicle Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vehicle</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="car-outline" size={18} color="#a1a1aa" />
            <Text style={styles.infoText}>2022 Kenworth T880</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Ionicons name="document-text-outline" size={18} color="#a1a1aa" />
            <Text style={styles.infoText}>Plate: GA-4821-TX</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Ionicons name="resize-outline" size={18} color="#a1a1aa" />
            <Text style={styles.infoText}>Capacity: 22 tons</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color={getDateColor(10)} />
            <View style={styles.infoTextCol}>
              <Text style={styles.infoText}>Last Inspection</Text>
              <Text style={[styles.infoDate, { color: getDateColor(10) }]}>
                Jan 28, 2026
              </Text>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={18} color={getDateColor(22)} />
            <View style={styles.infoTextCol}>
              <Text style={styles.infoText}>CDL Expiry</Text>
              <Text style={[styles.infoDate, { color: getDateColor(22) }]}>
                Dec 15, 2027
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Certifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Certifications</Text>
        <View style={styles.certsRow}>
          {CERTIFICATIONS.map((cert) => (
            <View
              key={cert.name}
              style={[
                styles.certBadge,
                { borderColor: cert.color + "44", backgroundColor: cert.color + "12" },
              ]}
            >
              <Ionicons name={cert.icon} size={16} color={cert.color} />
              <Text style={[styles.certText, { color: cert.color }]}>
                {cert.name}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>

        {/* Dark Mode Toggle */}
        <View style={styles.menuItemToggle}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="moon-outline" size={20} color="#a1a1aa" />
            <Text style={styles.menuLabel}>Dark Mode</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: "#27272a", true: "#f59e0b66" }}
            thumbColor={darkMode ? "#f59e0b" : "#52525b"}
          />
        </View>

        {/* Notifications Toggle */}
        <View style={styles.menuItemToggle}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="notifications-outline" size={20} color="#a1a1aa" />
            <Text style={styles.menuLabel}>Notifications</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: "#27272a", true: "#f59e0b66" }}
            thumbColor={notificationsEnabled ? "#f59e0b" : "#52525b"}
          />
        </View>

        {/* Language */}
        <TouchableOpacity style={styles.menuItem} onPress={handleLanguage}>
          <Ionicons name="language-outline" size={20} color="#a1a1aa" />
          <Text style={styles.menuLabel}>Language</Text>
          <Text style={styles.menuValue}>English</Text>
          <Ionicons name="chevron-forward" size={18} color="#52525b" />
        </TouchableOpacity>

        {/* Location Settings */}
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="location-outline" size={20} color="#a1a1aa" />
          <Text style={styles.menuLabel}>Location Settings</Text>
          <Ionicons name="chevron-forward" size={18} color="#52525b" />
        </TouchableOpacity>

        {/* Documents */}
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="document-outline" size={20} color="#a1a1aa" />
          <Text style={styles.menuLabel}>Documents</Text>
          <Ionicons name="chevron-forward" size={18} color="#52525b" />
        </TouchableOpacity>

        {/* Help & Support */}
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="help-circle-outline" size={20} color="#a1a1aa" />
          <Text style={styles.menuLabel}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={18} color="#52525b" />
        </TouchableOpacity>

        {/* Sign Out */}
        <TouchableOpacity style={styles.menuItemDanger} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.menuLabelDanger}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* App Version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>AggregateOS Driver v0.1.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },

  // Profile Header
  profileHeader: {
    alignItems: "center",
    paddingVertical: 24,
  },
  avatarContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "#f59e0b44",
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#000",
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
  },
  role: {
    fontSize: 14,
    color: "#a1a1aa",
    marginTop: 4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    backgroundColor: "#22c55e18",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#22c55e33",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 13,
    color: "#22c55e",
    fontWeight: "600",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#18181b",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#f59e0b",
  },
  statLabel: {
    fontSize: 10,
    color: "#71717a",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  // Sections
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#71717a",
    textTransform: "uppercase",
    marginBottom: 10,
    letterSpacing: 0.5,
  },

  // Earnings
  earningsCard: {
    backgroundColor: "#18181b",
    borderRadius: 14,
    padding: 16,
  },
  earningsTopRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  earningsPeriod: {
    flex: 1,
    alignItems: "center",
  },
  earningsPeriodLabel: {
    fontSize: 12,
    color: "#71717a",
    marginBottom: 4,
  },
  earningsPeriodValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  earningsDivider: {
    width: 1,
    backgroundColor: "#27272a",
    marginVertical: 4,
  },
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#27272a",
    gap: 8,
  },
  chartBarCol: {
    flex: 1,
    alignItems: "center",
  },
  chartBarBg: {
    width: "100%",
    height: 80,
    backgroundColor: "#27272a",
    borderRadius: 6,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  chartBarFill: {
    width: "100%",
    backgroundColor: "#f59e0b",
    borderRadius: 6,
  },
  chartBarLabel: {
    fontSize: 11,
    color: "#71717a",
    marginTop: 6,
    fontWeight: "500",
  },
  chartBarAmount: {
    fontSize: 10,
    color: "#52525b",
    marginTop: 1,
  },

  // Vehicle Info
  infoCard: {
    backgroundColor: "#18181b",
    borderRadius: 14,
    padding: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  infoTextCol: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoText: {
    fontSize: 14,
    color: "#d4d4d8",
  },
  infoDate: {
    fontSize: 13,
    fontWeight: "600",
  },
  infoDivider: {
    height: 1,
    backgroundColor: "#27272a",
    marginVertical: 8,
  },

  // Certifications
  certsRow: {
    flexDirection: "row",
    gap: 10,
  },
  certBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  certText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Menu Items
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#18181b",
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    gap: 12,
  },
  menuItemToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#18181b",
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: "#e4e4e7",
  },
  menuValue: {
    fontSize: 13,
    color: "#71717a",
    marginRight: 4,
  },
  menuItemDanger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#18181b",
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    gap: 12,
    borderWidth: 1,
    borderColor: "#ef444422",
  },
  menuLabelDanger: {
    flex: 1,
    fontSize: 15,
    color: "#ef4444",
    fontWeight: "500",
  },

  // Version
  versionContainer: {
    alignItems: "center",
    paddingVertical: 24,
    paddingBottom: 40,
  },
  versionText: {
    fontSize: 12,
    color: "#3f3f46",
  },
});
