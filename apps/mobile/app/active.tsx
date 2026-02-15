import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface DeliveryStep {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  completedTime?: string;
}

const STEPS: DeliveryStep[] = [
  {
    key: "en_route_pickup",
    label: "En Route to Pickup",
    icon: "navigate-outline",
    completedTime: "7:02 AM",
  },
  {
    key: "at_pickup",
    label: "At Pickup",
    icon: "location-outline",
    completedTime: "7:28 AM",
  },
  {
    key: "loaded",
    label: "Loaded",
    icon: "cube-outline",
    completedTime: "7:41 AM",
  },
  {
    key: "en_route_delivery",
    label: "En Route to Delivery",
    icon: "car-outline",
  },
  {
    key: "at_delivery",
    label: "At Delivery",
    icon: "flag-outline",
  },
  {
    key: "delivered",
    label: "Delivered",
    icon: "checkmark-circle-outline",
  },
];

export default function ActiveLoadScreen() {
  const [currentStep, setCurrentStep] = useState(2); // 0-indexed, "Loaded" is current

  const nextStepLabel =
    currentStep < STEPS.length - 1 ? STEPS[currentStep + 1].label : null;

  const handleAdvance = () => {
    if (currentStep < STEPS.length - 1) {
      const nextLabel = STEPS[currentStep + 1].label;
      Alert.alert(
        "Status Updated",
        `Load status updated to: ${nextLabel}`,
        [{ text: "OK" }]
      );
      setCurrentStep((prev) => prev + 1);
    } else {
      Alert.alert(
        "Load Complete",
        "This load has been delivered successfully!",
        [{ text: "OK" }]
      );
    }
  };

  const handleCallDispatch = () => {
    Alert.alert("Call Dispatch", "Dialing dispatch at (770) 555-0142...", [
      { text: "Cancel", style: "cancel" },
      { text: "Call", style: "default" },
    ]);
  };

  const handleReportIssue = () => {
    Alert.alert("Report Issue", "What type of issue?", [
      { text: "Mechanical", style: "default" },
      { text: "Route Problem", style: "default" },
      { text: "Customer Issue", style: "default" },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const isComplete = currentStep >= STEPS.length - 1;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Load Details Card */}
        <View style={styles.loadInfoCard}>
          <View style={styles.loadInfoHeader}>
            <View>
              <Text style={styles.loadNumber}>LD-001236</Text>
              <Text style={styles.customer}>Metro Development</Text>
            </View>
            <View style={styles.activeBadge}>
              <View style={styles.pulsingDotSmall} />
              <Text style={styles.activeBadgeText}>LIVE</Text>
            </View>
          </View>
          <View style={styles.materialRow}>
            <Ionicons name="cube-outline" size={14} color="#a1a1aa" />
            <Text style={styles.materialText}>20 tons Class A Gravel</Text>
          </View>

          {/* Route */}
          <View style={styles.routeContainer}>
            <View style={styles.routeDotsColumn}>
              <View style={[styles.routeDot, { backgroundColor: "#f59e0b" }]} />
              <View style={styles.routeDashedLine} />
              <View style={[styles.routeDot, { backgroundColor: "#22c55e" }]} />
            </View>
            <View style={styles.routeLabels}>
              <Text style={styles.routeText}>Blue Ridge Materials</Text>
              <Text style={styles.routeText}>Metro Water Treatment</Text>
            </View>
          </View>
        </View>

        {/* Map Placeholder */}
        <View style={styles.mapContainer}>
          <View style={styles.mapInner}>
            <Ionicons name="map-outline" size={48} color="#3f3f46" />
            <Text style={styles.mapText}>Map View</Text>
            <Text style={styles.mapSubtext}>GPS tracking active</Text>
          </View>
          <View style={styles.gpsIndicator}>
            <View style={styles.gpsPulsingDot} />
            <Text style={styles.gpsText}>GPS Tracking Active</Text>
          </View>
        </View>

        {/* ETA Card */}
        <View style={styles.etaCard}>
          <View style={styles.etaRow}>
            <View>
              <Text style={styles.etaLabel}>Estimated Arrival</Text>
              <Text style={styles.etaTime}>10:45 AM</Text>
            </View>
            <View style={styles.etaRight}>
              <Ionicons name="time-outline" size={16} color="#f59e0b" />
              <Text style={styles.etaMinutes}>15 min</Text>
            </View>
          </View>
          {/* Progress Bar */}
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${((currentStep + 1) / STEPS.length) * 100}%` },
              ]}
            />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabelText}>
              {currentStep + 1} of {STEPS.length} steps
            </Text>
            <Text style={styles.progressLabelText}>15.2 mi total</Text>
          </View>
        </View>

        {/* Delivery Steps */}
        <View style={styles.stepsContainer}>
          <Text style={styles.stepsTitle}>Delivery Progress</Text>
          {STEPS.map((step, idx) => {
            const isDone = idx < currentStep;
            const isCurrent = idx === currentStep;
            const isFuture = idx > currentStep;

            return (
              <View key={step.key} style={styles.stepRow}>
                {/* Vertical line + circle */}
                <View style={styles.stepIndicatorCol}>
                  {idx > 0 && (
                    <View
                      style={[
                        styles.stepLineAbove,
                        isDone || isCurrent
                          ? { backgroundColor: "#22c55e" }
                          : { backgroundColor: "#27272a" },
                      ]}
                    />
                  )}
                  <View
                    style={[
                      styles.stepCircle,
                      isDone && styles.stepCircleDone,
                      isCurrent && styles.stepCircleCurrent,
                      isFuture && styles.stepCircleFuture,
                    ]}
                  >
                    {isDone ? (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    ) : isCurrent ? (
                      <View style={styles.currentStepInnerDot} />
                    ) : (
                      <Text style={styles.stepNumber}>{idx + 1}</Text>
                    )}
                  </View>
                  {idx < STEPS.length - 1 && (
                    <View
                      style={[
                        styles.stepLineBelow,
                        isDone
                          ? { backgroundColor: "#22c55e" }
                          : { backgroundColor: "#27272a" },
                      ]}
                    />
                  )}
                </View>

                {/* Content */}
                <View
                  style={[
                    styles.stepContent,
                    isCurrent && styles.stepContentCurrent,
                  ]}
                >
                  <View style={styles.stepContentInner}>
                    <Ionicons
                      name={step.icon as any}
                      size={18}
                      color={
                        isDone ? "#22c55e" : isCurrent ? "#f59e0b" : "#52525b"
                      }
                    />
                    <View style={styles.stepTextCol}>
                      <Text
                        style={[
                          styles.stepLabel,
                          isDone && { color: "#a1a1aa" },
                          isCurrent && { color: "#ffffff", fontWeight: "700" },
                          isFuture && { color: "#52525b" },
                        ]}
                      >
                        {step.label}
                      </Text>
                      {isDone && step.completedTime && (
                        <Text style={styles.stepTime}>
                          Completed at {step.completedTime}
                        </Text>
                      )}
                      {isCurrent && (
                        <View style={styles.currentBadge}>
                          <View style={styles.currentBadgeDot} />
                          <Text style={styles.currentBadgeText}>Current</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Report Issue Link */}
        <TouchableOpacity style={styles.reportIssueLink} onPress={handleReportIssue}>
          <Ionicons name="warning-outline" size={16} color="#ef4444" />
          <Text style={styles.reportIssueText}>Report an Issue</Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Action Button */}
      <View style={styles.bottomBar}>
        {!isComplete ? (
          <TouchableOpacity style={styles.actionButton} onPress={handleAdvance}>
            <Text style={styles.actionButtonText}>
              Update to: {nextStepLabel}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#000" />
          </TouchableOpacity>
        ) : (
          <View style={styles.completedBanner}>
            <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
            <Text style={styles.completedText}>Load Delivered</Text>
          </View>
        )}
      </View>

      {/* Floating Call Dispatch Button */}
      <TouchableOpacity style={styles.fabButton} onPress={handleCallDispatch}>
        <Ionicons name="call" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  scrollContent: {
    flex: 1,
  },

  // Load Info Card
  loadInfoCard: {
    backgroundColor: "#18181b",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
  },
  loadInfoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  loadNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    letterSpacing: 0.3,
  },
  customer: {
    fontSize: 15,
    color: "#e4e4e7",
    marginTop: 2,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#22c55e18",
    borderWidth: 1,
    borderColor: "#22c55e44",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  pulsingDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#22c55e",
    letterSpacing: 0.8,
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
  routeContainer: {
    flexDirection: "row",
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
  routeText: {
    fontSize: 13,
    color: "#d4d4d8",
    fontWeight: "500",
  },

  // Map
  mapContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#18181b",
    height: SCREEN_WIDTH * 0.55,
  },
  mapInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111113",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 14,
  },
  mapText: {
    fontSize: 16,
    color: "#52525b",
    marginTop: 8,
    fontWeight: "600",
  },
  mapSubtext: {
    fontSize: 12,
    color: "#3f3f46",
    marginTop: 2,
  },
  gpsIndicator: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#18181bee",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  gpsPulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
  },
  gpsText: {
    fontSize: 11,
    color: "#22c55e",
    fontWeight: "600",
  },

  // ETA Card
  etaCard: {
    backgroundColor: "#18181b",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 16,
  },
  etaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  etaLabel: {
    fontSize: 12,
    color: "#71717a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  etaTime: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 2,
  },
  etaRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f59e0b18",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f59e0b44",
  },
  etaMinutes: {
    fontSize: 14,
    fontWeight: "700",
    color: "#f59e0b",
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#27272a",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 6,
    backgroundColor: "#f59e0b",
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  progressLabelText: {
    fontSize: 11,
    color: "#52525b",
  },

  // Steps
  stepsContainer: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  stepsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#71717a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: "row",
    minHeight: 60,
  },
  stepIndicatorCol: {
    width: 32,
    alignItems: "center",
  },
  stepLineAbove: {
    width: 2,
    height: 10,
  },
  stepLineBelow: {
    width: 2,
    flex: 1,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleDone: {
    backgroundColor: "#22c55e",
  },
  stepCircleCurrent: {
    backgroundColor: "#f59e0b",
    borderWidth: 3,
    borderColor: "#f59e0b44",
  },
  stepCircleFuture: {
    backgroundColor: "#27272a",
  },
  currentStepInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#000",
  },
  stepNumber: {
    fontSize: 11,
    color: "#52525b",
    fontWeight: "600",
  },
  stepContent: {
    flex: 1,
    marginLeft: 10,
    paddingBottom: 16,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stepContentCurrent: {
    backgroundColor: "#f59e0b12",
    borderWidth: 1,
    borderColor: "#f59e0b33",
  },
  stepContentInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepTextCol: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 14,
    color: "#71717a",
    fontWeight: "500",
  },
  stepTime: {
    fontSize: 11,
    color: "#52525b",
    marginTop: 2,
  },
  currentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  currentBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f59e0b",
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#f59e0b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Report Issue
  reportIssueLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
  },
  reportIssueText: {
    fontSize: 13,
    color: "#ef4444",
    fontWeight: "500",
  },

  // Bottom Bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 28,
    backgroundColor: "#09090bee",
    borderTopWidth: 1,
    borderTopColor: "#27272a",
  },
  actionButton: {
    backgroundColor: "#f59e0b",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000000",
  },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22c55e18",
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#22c55e44",
  },
  completedText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#22c55e",
  },

  // FAB
  fabButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
