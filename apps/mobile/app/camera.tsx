import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const VIEWFINDER_SIZE = SCREEN_WIDTH - 64;

type CaptureState = "no_permission" | "idle" | "captured" | "submitting" | "success";

export default function TicketCameraScreen() {
  const [captureState, setCaptureState] = useState<CaptureState>("no_permission");
  const [flashOn, setFlashOn] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);

  const handleGrantPermission = () => {
    // Simulate granting camera permission
    Alert.alert("Camera Access", "Camera access granted!", [{ text: "OK" }]);
    setCaptureState("idle");
  };

  const handleCapture = () => {
    setCaptureState("captured");
  };

  const handleRetake = () => {
    setCaptureState("idle");
    setSubmitProgress(0);
  };

  const handleSubmit = () => {
    setCaptureState("submitting");
    setSubmitProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setSubmitProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setCaptureState("success");
          return 100;
        }
        return prev + 20;
      });
    }, 400);
  };

  const handleBackToLoads = () => {
    setCaptureState("idle");
    setSubmitProgress(0);
  };

  const handlePickFromGallery = () => {
    Alert.alert("Gallery", "Opening photo library...", [{ text: "OK" }]);
    // Simulate picking an image
    setTimeout(() => setCaptureState("captured"), 500);
  };

  // Permission not granted state
  if (captureState === "no_permission") {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconWrap}>
            <Ionicons name="camera-outline" size={56} color="#f59e0b" />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionDesc}>
            AggregateOS needs access to your camera to capture delivery tickets.
            Photos are used to automatically extract weight, material, and ticket
            information.
          </Text>
          <TouchableOpacity
            style={styles.grantButton}
            onPress={handleGrantPermission}
          >
            <Ionicons name="camera" size={20} color="#000" />
            <Text style={styles.grantButtonText}>Grant Camera Access</Text>
          </TouchableOpacity>
          <Text style={styles.permissionNote}>
            You can change this later in Settings
          </Text>
        </View>
      </View>
    );
  }

  // Success state
  if (captureState === "success") {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={48} color="#22c55e" />
          </View>
          <Text style={styles.successTitle}>Ticket Submitted!</Text>
          <Text style={styles.successDesc}>
            Ticket TKT-54892 has been processed and attached to load LD-001236.
          </Text>

          {/* Extracted Data Summary */}
          <View style={styles.successDataCard}>
            <View style={styles.successDataRow}>
              <Text style={styles.successDataLabel}>Weight</Text>
              <Text style={styles.successDataValue}>22.4 tons</Text>
            </View>
            <View style={styles.successDataDivider} />
            <View style={styles.successDataRow}>
              <Text style={styles.successDataLabel}>Material</Text>
              <Text style={styles.successDataValue}>#57 Limestone</Text>
            </View>
            <View style={styles.successDataDivider} />
            <View style={styles.successDataRow}>
              <Text style={styles.successDataLabel}>Ticket #</Text>
              <Text style={styles.successDataValue}>TKT-54892</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.backToLoadsButton}
            onPress={handleBackToLoads}
          >
            <Ionicons name="cube-outline" size={18} color="#000" />
            <Text style={styles.backToLoadsText}>Back to Loads</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Captured / Submitting state
  if (captureState === "captured" || captureState === "submitting") {
    return (
      <View style={styles.container}>
        <View style={styles.previewSection}>
          {/* Preview placeholder */}
          <View style={styles.previewImage}>
            <Ionicons name="document-text" size={56} color="#52525b" />
            <Text style={styles.previewImageText}>Ticket Image Preview</Text>
            <Text style={styles.previewImageSubtext}>TKT-54892</Text>
          </View>
        </View>

        {/* Extracted Data */}
        <View style={styles.extractedDataCard}>
          <View style={styles.extractedDataHeader}>
            <Ionicons name="scan-outline" size={18} color="#f59e0b" />
            <Text style={styles.extractedDataTitle}>Extracted Data</Text>
          </View>

          <View style={styles.extractedGrid}>
            <View style={styles.extractedItem}>
              <Text style={styles.extractedLabel}>Weight</Text>
              <Text style={styles.extractedValue}>22.4 tons</Text>
            </View>
            <View style={styles.extractedItem}>
              <Text style={styles.extractedLabel}>Material</Text>
              <Text style={styles.extractedValue}>#57 Limestone</Text>
            </View>
            <View style={styles.extractedItem}>
              <Text style={styles.extractedLabel}>Ticket #</Text>
              <Text style={styles.extractedValue}>TKT-54892</Text>
            </View>
            <View style={styles.extractedItem}>
              <Text style={styles.extractedLabel}>Date</Text>
              <Text style={styles.extractedValue}>Feb 14, 2026</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.previewActions}>
          {captureState === "submitting" ? (
            <View style={styles.submittingContainer}>
              <View style={styles.submitProgressBg}>
                <View
                  style={[
                    styles.submitProgressFill,
                    { width: `${submitProgress}%` },
                  ]}
                />
              </View>
              <View style={styles.submittingRow}>
                <ActivityIndicator size="small" color="#f59e0b" />
                <Text style={styles.submittingText}>
                  Uploading ticket... {submitProgress}%
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.previewButtonRow}>
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={handleRetake}
              >
                <Ionicons name="refresh-outline" size={18} color="#a1a1aa" />
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
              >
                <Ionicons name="cloud-upload-outline" size={18} color="#000" />
                <Text style={styles.submitText}>Submit Ticket</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Idle / Camera viewfinder state
  return (
    <View style={styles.container}>
      {/* Viewfinder Area */}
      <View style={styles.viewfinderArea}>
        <View style={styles.viewfinderBg}>
          {/* Document outline overlay */}
          <View style={styles.documentOutline}>
            {/* Corner markers */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {/* Center content */}
            <Ionicons name="document-text-outline" size={40} color="#f59e0b44" />
          </View>

          {/* Flash indicator */}
          <View style={styles.flashIndicator}>
            <Ionicons
              name={flashOn ? "flash" : "flash-off-outline"}
              size={14}
              color={flashOn ? "#f59e0b" : "#71717a"}
            />
            <Text
              style={[
                styles.flashText,
                flashOn ? { color: "#f59e0b" } : { color: "#71717a" },
              ]}
            >
              {flashOn ? "Flash ON" : "Flash OFF"}
            </Text>
          </View>
        </View>

        {/* Instructions */}
        <Text style={styles.alignText}>Align ticket within the frame</Text>
      </View>

      {/* Tips */}
      <View style={styles.tipsContainer}>
        <View style={styles.tipRow}>
          <Ionicons name="sunny-outline" size={16} color="#f59e0b" />
          <Text style={styles.tipText}>Good lighting</Text>
        </View>
        <View style={styles.tipRow}>
          <Ionicons name="scan-outline" size={16} color="#f59e0b" />
          <Text style={styles.tipText}>Full ticket</Text>
        </View>
        <View style={styles.tipRow}>
          <Ionicons name="eye-outline" size={16} color="#f59e0b" />
          <Text style={styles.tipText}>Clear text</Text>
        </View>
      </View>

      {/* Capture Controls */}
      <View style={styles.captureRow}>
        {/* Gallery Button */}
        <TouchableOpacity
          style={styles.sideButton}
          onPress={handlePickFromGallery}
        >
          <Ionicons name="images-outline" size={22} color="#ffffff" />
          <Text style={styles.sideButtonLabel}>Gallery</Text>
        </TouchableOpacity>

        {/* Capture Button */}
        <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
          <View style={styles.captureOuter}>
            <View style={styles.captureInner} />
          </View>
        </TouchableOpacity>

        {/* Flash Toggle */}
        <TouchableOpacity
          style={[styles.sideButton, flashOn && styles.sideButtonActive]}
          onPress={() => setFlashOn(!flashOn)}
        >
          <Ionicons
            name={flashOn ? "flash" : "flash-outline"}
            size={22}
            color={flashOn ? "#f59e0b" : "#ffffff"}
          />
          <Text
            style={[
              styles.sideButtonLabel,
              flashOn && { color: "#f59e0b" },
            ]}
          >
            Flash
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },

  // Permission State
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  permissionIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f59e0b18",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#f59e0b33",
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 12,
  },
  permissionDesc: {
    fontSize: 14,
    color: "#a1a1aa",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  grantButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f59e0b",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  grantButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  permissionNote: {
    fontSize: 12,
    color: "#52525b",
  },

  // Viewfinder
  viewfinderArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  viewfinderBg: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE * 0.75,
    backgroundColor: "#111113",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#27272a",
    overflow: "hidden",
  },
  documentOutline: {
    width: VIEWFINDER_SIZE - 48,
    height: VIEWFINDER_SIZE * 0.75 - 48,
    borderWidth: 2,
    borderColor: "#f59e0b55",
    borderStyle: "dashed",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#f59e0b",
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 4,
  },
  flashIndicator: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#18181bee",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  flashText: {
    fontSize: 10,
    fontWeight: "600",
  },
  alignText: {
    fontSize: 13,
    color: "#71717a",
    marginTop: 12,
    textAlign: "center",
  },

  // Tips
  tipsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    paddingVertical: 12,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tipText: {
    fontSize: 12,
    color: "#71717a",
  },

  // Capture Controls
  captureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 36,
    paddingBottom: 36,
    paddingTop: 8,
  },
  sideButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
  },
  sideButtonActive: {
    backgroundColor: "#f59e0b22",
    borderWidth: 1,
    borderColor: "#f59e0b44",
  },
  sideButtonLabel: {
    fontSize: 9,
    color: "#71717a",
    marginTop: 2,
    fontWeight: "500",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  captureOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: "#00000033",
    alignItems: "center",
    justifyContent: "center",
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f59e0b",
  },

  // Preview (Captured State)
  previewSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  previewImage: {
    width: "100%",
    height: 240,
    backgroundColor: "#18181b",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  previewImageText: {
    fontSize: 16,
    color: "#52525b",
    marginTop: 8,
    fontWeight: "600",
  },
  previewImageSubtext: {
    fontSize: 12,
    color: "#3f3f46",
    marginTop: 2,
  },

  // Extracted Data
  extractedDataCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#18181b",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  extractedDataHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  extractedDataTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f59e0b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  extractedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  extractedItem: {
    width: "47%",
    backgroundColor: "#111113",
    borderRadius: 10,
    padding: 12,
  },
  extractedLabel: {
    fontSize: 11,
    color: "#71717a",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  extractedValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
  },

  // Preview Actions
  previewActions: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 36,
  },
  previewButtonRow: {
    flexDirection: "row",
    gap: 12,
  },
  retakeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#27272a",
    borderRadius: 12,
    paddingVertical: 14,
  },
  retakeText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#a1a1aa",
  },
  submitButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#f59e0b",
    borderRadius: 12,
    paddingVertical: 14,
  },
  submitText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#000",
  },
  submittingContainer: {
    gap: 12,
  },
  submitProgressBg: {
    height: 8,
    backgroundColor: "#27272a",
    borderRadius: 4,
    overflow: "hidden",
  },
  submitProgressFill: {
    height: 8,
    backgroundColor: "#f59e0b",
    borderRadius: 4,
  },
  submittingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submittingText: {
    fontSize: 14,
    color: "#f59e0b",
    fontWeight: "600",
  },

  // Success State
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#22c55e18",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#22c55e44",
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 14,
    color: "#a1a1aa",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  successDataCard: {
    width: "100%",
    backgroundColor: "#18181b",
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  successDataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  successDataLabel: {
    fontSize: 13,
    color: "#71717a",
  },
  successDataValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  successDataDivider: {
    height: 1,
    backgroundColor: "#27272a",
  },
  backToLoadsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f59e0b",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  backToLoadsText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
});
