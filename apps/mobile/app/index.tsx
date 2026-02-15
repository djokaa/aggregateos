import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type LoadStatus =
  | "assigned"
  | "dispatched"
  | "in_progress"
  | "delivered"
  | "completed";

interface Load {
  id: string;
  loadNumber: string;
  customer: string;
  material: string;
  quantity: string;
  origin: string;
  destination: string;
  scheduledTime: string;
  estimatedDuration: string;
  distance: string;
  status: LoadStatus;
}

const todayLoads: Load[] = [
  {
    id: "1",
    loadNumber: "LD-001234",
    customer: "Smith Construction",
    material: "#57 Limestone",
    quantity: "22 tons",
    origin: "Eagle Rock Quarry",
    destination: "I-85 Bridge Project",
    scheduledTime: "7:00 AM",
    estimatedDuration: "~45 min",
    distance: "12.4 mi",
    status: "delivered",
  },
  {
    id: "2",
    loadNumber: "LD-001235",
    customer: "Lennar Homes",
    material: "Concrete Sand",
    quantity: "18 tons",
    origin: "Piedmont Sand & Gravel",
    destination: "Oakwood Subdivision Ph. 3",
    scheduledTime: "9:30 AM",
    estimatedDuration: "~35 min",
    distance: "8.7 mi",
    status: "delivered",
  },
  {
    id: "3",
    loadNumber: "LD-001236",
    customer: "Metro Development",
    material: "Class A Gravel",
    quantity: "20 tons",
    origin: "Blue Ridge Materials",
    destination: "Metro Water Treatment",
    scheduledTime: "11:00 AM",
    estimatedDuration: "~50 min",
    distance: "15.2 mi",
    status: "in_progress",
  },
  {
    id: "4",
    loadNumber: "LD-001237",
    customer: "DOT Highway Division",
    material: "Hot Mix Asphalt",
    quantity: "24 tons",
    origin: "Central Batch Plant",
    destination: "SR-400 Resurfacing",
    scheduledTime: "1:30 PM",
    estimatedDuration: "~40 min",
    distance: "11.0 mi",
    status: "dispatched",
  },
  {
    id: "5",
    loadNumber: "LD-001238",
    customer: "Turner & Associates",
    material: "#4 Granite",
    quantity: "21 tons",
    origin: "Peachtree Aggregate",
    destination: "Midtown Tower Foundation",
    scheduledTime: "3:00 PM",
    estimatedDuration: "~55 min",
    distance: "18.3 mi",
    status: "assigned",
  },
  {
    id: "6",
    loadNumber: "LD-001239",
    customer: "Beltway Contractors",
    material: "Rip Rap",
    quantity: "19 tons",
    origin: "Stone Mountain Quarry",
    destination: "Chattahoochee Retaining Wall",
    scheduledTime: "4:30 PM",
    estimatedDuration: "~30 min",
    distance: "7.1 mi",
    status: "assigned",
  },
];

const tomorrowLoads: Load[] = [
  {
    id: "t1",
    loadNumber: "LD-001240",
    customer: "Clayton County Schools",
    material: "#57 Limestone",
    quantity: "22 tons",
    origin: "Eagle Rock Quarry",
    destination: "New Elementary Build Site",
    scheduledTime: "6:30 AM",
    estimatedDuration: "~40 min",
    distance: "10.5 mi",
    status: "assigned",
  },
  {
    id: "t2",
    loadNumber: "LD-001241",
    customer: "Brasfield & Gorrie",
    material: "Washed Stone",
    quantity: "20 tons",
    origin: "Lithonia Granite Co.",
    destination: "Hartsfield Expansion T-South",
    scheduledTime: "8:00 AM",
    estimatedDuration: "~60 min",
    distance: "22.1 mi",
    status: "assigned",
  },
  {
    id: "t3",
    loadNumber: "LD-001242",
    customer: "Lennar Homes",
    material: "Fill Dirt",
    quantity: "24 tons",
    origin: "Piedmont Sand & Gravel",
    destination: "Oakwood Subdivision Ph. 3",
    scheduledTime: "10:30 AM",
    estimatedDuration: "~35 min",
    distance: "8.7 mi",
    status: "assigned",
  },
  {
    id: "t4",
    loadNumber: "LD-001243",
    customer: "DOT Highway Division",
    material: "Hot Mix Asphalt",
    quantity: "24 tons",
    origin: "Central Batch Plant",
    destination: "I-20 Interchange Overlay",
    scheduledTime: "1:00 PM",
    estimatedDuration: "~45 min",
    distance: "14.8 mi",
    status: "assigned",
  },
];

const statusColors: Record<LoadStatus, string> = {
  assigned: "#3b82f6",
  dispatched: "#8b5cf6",
  in_progress: "#f59e0b",
  delivered: "#22c55e",
  completed: "#22c55e",
};

const statusLabels: Record<LoadStatus, string> = {
  assigned: "Assigned",
  dispatched: "Dispatched",
  in_progress: "In Progress",
  delivered: "Delivered",
  completed: "Completed",
};

function getStats(loads: Load[]) {
  const total = loads.length;
  const completed = loads.filter(
    (l) => l.status === "delivered" || l.status === "completed"
  ).length;
  const remaining = total - completed;
  return { total, completed, remaining };
}

export default function MyLoadsScreen() {
  const [dayToggle, setDayToggle] = useState<"today" | "tomorrow">("today");
  const [refreshing, setRefreshing] = useState(false);

  const loads = dayToggle === "today" ? todayLoads : tomorrowLoads;
  const stats = getStats(loads);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  const renderActionButton = (load: Load) => {
    if (load.status === "assigned") {
      return (
        <TouchableOpacity style={styles.startButton}>
          <Ionicons name="play-circle" size={18} color="#000" />
          <Text style={styles.startButtonText}>Start Load</Text>
        </TouchableOpacity>
      );
    }
    if (load.status === "dispatched" || load.status === "in_progress") {
      return (
        <TouchableOpacity style={styles.continueButton}>
          <Ionicons name="arrow-forward-circle" size={18} color="#f59e0b" />
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      );
    }
    if (load.status === "delivered" || load.status === "completed") {
      return (
        <View style={styles.deliveredRow}>
          <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
          <TouchableOpacity style={styles.viewTicketButton}>
            <Text style={styles.viewTicketText}>View Ticket</Text>
            <Ionicons name="document-text-outline" size={14} color="#a1a1aa" />
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#f59e0b"
          title="Pull to refresh"
          titleColor="#71717a"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Good morning, Mike</Text>
        <Text style={styles.subtitle}>
          {dayToggle === "today"
            ? "Friday, February 14"
            : "Saturday, February 15"}
        </Text>
      </View>

      {/* Day Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            dayToggle === "today" && styles.toggleButtonActive,
          ]}
          onPress={() => setDayToggle("today")}
        >
          <Text
            style={[
              styles.toggleText,
              dayToggle === "today" && styles.toggleTextActive,
            ]}
          >
            Today
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            dayToggle === "tomorrow" && styles.toggleButtonActive,
          ]}
          onPress={() => setDayToggle("tomorrow")}
        >
          <Text
            style={[
              styles.toggleText,
              dayToggle === "tomorrow" && styles.toggleTextActive,
            ]}
          >
            Tomorrow
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Assigned</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: "#22c55e" }]}>
            {stats.completed}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: "#f59e0b" }]}>
            {stats.remaining}
          </Text>
          <Text style={styles.statLabel}>Remaining</Text>
        </View>
      </View>

      {/* Load Cards */}
      {loads.map((load) => (
        <View key={load.id} style={styles.loadCard}>
          {/* Card Header: Load Number + Status */}
          <View style={styles.loadHeader}>
            <Text style={styles.loadNumber}>{load.loadNumber}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColors[load.status] + "22" },
                { borderColor: statusColors[load.status] },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: statusColors[load.status] },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: statusColors[load.status] },
                ]}
              >
                {statusLabels[load.status]}
              </Text>
            </View>
          </View>

          {/* Customer */}
          <Text style={styles.customer}>{load.customer}</Text>

          {/* Material + Quantity */}
          <View style={styles.materialRow}>
            <Ionicons name="cube-outline" size={14} color="#a1a1aa" />
            <Text style={styles.materialText}>
              {load.quantity} {load.material}
            </Text>
          </View>

          {/* Route */}
          <View style={styles.routeContainer}>
            <View style={styles.routeDotsColumn}>
              <View style={[styles.routeDot, { backgroundColor: "#f59e0b" }]} />
              <View style={styles.routeDashedLine} />
              <View style={[styles.routeDot, { backgroundColor: "#22c55e" }]} />
            </View>
            <View style={styles.routeLabels}>
              <Text style={styles.routeOriginText}>{load.origin}</Text>
              <Text style={styles.routeDestText}>{load.destination}</Text>
            </View>
          </View>

          {/* Time + Distance */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={13} color="#71717a" />
              <Text style={styles.metaText}>{load.scheduledTime}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="hourglass-outline" size={13} color="#71717a" />
              <Text style={styles.metaText}>{load.estimatedDuration}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="speedometer-outline" size={13} color="#71717a" />
              <Text style={styles.metaText}>{load.distance}</Text>
            </View>
          </View>

          {/* Action */}
          <View style={styles.actionRow}>{renderActionButton(load)}</View>
        </View>
      ))}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 14,
    color: "#71717a",
    marginTop: 2,
  },

  // Toggle
  toggleContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: "#18181b",
    borderRadius: 10,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: "#f59e0b",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#71717a",
  },
  toggleTextActive: {
    color: "#000000",
  },

  // Stats Bar
  statsBar: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 16,
    backgroundColor: "#18181b",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
  },
  statLabel: {
    fontSize: 11,
    color: "#71717a",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#27272a",
  },

  // Load Card
  loadCard: {
    backgroundColor: "#18181b",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
  },
  loadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  loadNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  customer: {
    fontSize: 15,
    color: "#e4e4e7",
    fontWeight: "600",
    marginBottom: 4,
  },
  materialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 12,
  },
  materialText: {
    fontSize: 13,
    color: "#a1a1aa",
  },

  // Route
  routeContainer: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 10,
  },
  routeDotsColumn: {
    alignItems: "center",
    width: 12,
    paddingTop: 2,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeDashedLine: {
    width: 2,
    flex: 1,
    minHeight: 16,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#3f3f46",
  },
  routeLabels: {
    flex: 1,
    justifyContent: "space-between",
    gap: 6,
  },
  routeOriginText: {
    fontSize: 13,
    color: "#d4d4d8",
    fontWeight: "500",
  },
  routeDestText: {
    fontSize: 13,
    color: "#d4d4d8",
    fontWeight: "500",
  },

  // Meta Row
  metaRow: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#27272a",
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#71717a",
  },

  // Action Row
  actionRow: {
    marginTop: 2,
  },
  startButton: {
    backgroundColor: "#f59e0b",
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  startButtonText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#000000",
  },
  continueButton: {
    backgroundColor: "#f59e0b18",
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#f59e0b44",
  },
  continueButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#f59e0b",
  },
  deliveredRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  viewTicketButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#27272a",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewTicketText: {
    fontSize: 13,
    color: "#a1a1aa",
    fontWeight: "500",
  },
});
