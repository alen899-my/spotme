import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { FONTS } from "../../constants/theme";
import { scale, vs } from "../../constants/homeTheme";
import axios from "axios";
import { API_URL } from "../../utils/api";
import { getToken } from "../../utils/tokenStorage";

const BLUE = "#2596BE";
const BLUE_DARK = "#1a6e8a";
const TOTAL_STEPS = 5;

const GYM_TYPES = ["Commercial", "CrossFit", "Yoga / Pilates", "Boutique Studio", "Home Gym", "Other"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function RegisterGymScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Transition animations
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Form State
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("USA");
  const [capacity, setCapacity] = useState("");
  const [memberCount, setMemberCount] = useState("");
  const [gymType, setGymType] = useState("Commercial");
  const [openingTime, setOpeningTime] = useState("06:00");
  const [closingTime, setClosingTime] = useState("22:00");
  const [openDays, setOpenDays] = useState<string[]>(DAYS);
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  useEffect(() => {
    const fetchGymData = async () => {
      try {
        const token = await getToken();
        if (!token) {
          setLoading(false);
          return;
        }
        const res = await axios.get(`${API_URL}/gym`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data) {
          const g = res.data;
          setName(g.name || "");
          setTagline(g.tagline || "");
          setAddress(g.address || "");
          setCity(g.city || "");
          setState(g.state || "");
          setCountry(g.country || "USA");
          setCapacity(g.capacity ? String(g.capacity) : "");
          setMemberCount(g.member_count ? String(g.member_count) : "");
          setGymType(g.gym_type || "Commercial");
          setOpeningTime(g.opening_time || "06:00");
          setClosingTime(g.closing_time || "22:00");
          if (g.open_days) {
            const parsed = Array.isArray(g.open_days)
              ? g.open_days
              : (typeof g.open_days === "string" ? JSON.parse(g.open_days) : DAYS);
            setOpenDays(parsed);
          }
          setPhone(g.phone || "");
          setWebsite(g.website || "");
          setContactEmail(g.contact_email || "");
          setIsEditing(true);
        }
      } catch (err: any) {
        if (err?.response?.status !== 404) {
          console.error("Error fetching gym details:", err);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchGymData();
  }, []);

  const animateToStep = (nextStep: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const nextStep = () => {
    if (step < TOTAL_STEPS) animateToStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) animateToStep(step - 1);
    else router.back();
  };

  const toggleDay = (day: string) => {
    if (openDays.includes(day)) {
      setOpenDays(openDays.filter((d) => d !== day));
    } else {
      setOpenDays([...openDays, day]);
    }
  };

  const isStepValid = () => {
    if (step === 1) return name.trim() !== "";
    if (step === 2) return city.trim() !== "" && country.trim() !== "";
    return true;
  };

  const handleRegister = async () => {
    if (!isStepValid()) return;
    try {
      setSubmitting(true);
      const token = await getToken();
      if (!token) return;

      const payload = {
        name,
        tagline,
        address,
        city,
        state,
        country,
        capacity: capacity ? parseInt(capacity) : 0,
        member_count: memberCount ? parseInt(memberCount) : 0,
        gym_type: gymType,
        opening_time: openingTime,
        closing_time: closingTime,
        open_days: openDays,
        phone,
        website,
        contact_email: contactEmail,
      };

      if (isEditing) {
        await axios.put(`${API_URL}/gym`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${API_URL}/gym/register`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      router.replace("/(tabs)");
    } catch (err: any) {
      alert(err?.response?.data?.message || "Something went wrong registering your gym.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderTextInput = (
    label: string,
    val: string,
    onChange: (text: string) => void,
    placeholder: string,
    keyboardType: any = "default"
  ) => {
    return (
      <View style={styles.inputContainer}>
        <Text style={[styles.inputLabel, { color: isDark ? "rgba(255,255,255,0.75)" : colors.textMuted }]}>
          {label}
        </Text>
        <TextInput
          value={val}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
          keyboardType={keyboardType}
          style={[
            styles.textInput,
            {
              backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F5F9FC",
              borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(37,150,190,0.2)",
              color: colors.text,
            },
          ]}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={BLUE} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={prevStep}
          style={[styles.headerBack, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F5F9FC" }]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isEditing ? "Edit Gym Info" : "Register Gym"}
        </Text>
        <View style={{ width: scale(40) }} />
      </View>

      {/* Progress indicators */}
      <View style={styles.progressContainer}>
        <View style={styles.progressLineRow}>
          {Array.from({ length: TOTAL_STEPS }).map((_, idx) => {
            const stepNum = idx + 1;
            const active = stepNum <= step;
            return (
              <View
                key={idx}
                style={[
                  styles.progressLine,
                  { backgroundColor: active ? BLUE : (isDark ? "rgba(255,255,255,0.1)" : "#E0E0E0") },
                ]}
              />
            );
          })}
        </View>
        <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
          Step {step} of {TOTAL_STEPS}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {step === 1 && (
            <View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>The Basics</Text>
              <Text style={[styles.stepSub, { color: colors.textMuted }]}>
                What should we call your gym?
              </Text>
              {renderTextInput("Gym Name *", name, setName, "e.g. Iron Temple Fitness")}
              {renderTextInput("Tagline / Bio", tagline, setTagline, "e.g. Where legends are forged")}
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Location Details</Text>
              <Text style={[styles.stepSub, { color: colors.textMuted }]}>
                Where is your facility located?
              </Text>
              {renderTextInput("Street Address", address, setAddress, "e.g. 100 Main St")}
              {renderTextInput("City *", city, setCity, "e.g. New York")}
              {renderTextInput("State / Region", state, setState, "e.g. NY")}
              {renderTextInput("Country *", country, setCountry, "e.g. USA")}
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Facility & Members</Text>
              <Text style={[styles.stepSub, { color: colors.textMuted }]}>
                Tell us about your capacity and current membership.
              </Text>
              {renderTextInput(
                "Maximum Capacity (people)",
                capacity,
                setCapacity,
                "e.g. 150",
                "numeric"
              )}
              {renderTextInput(
                "Current Number of Members",
                memberCount,
                setMemberCount,
                "e.g. 84",
                "numeric"
              )}

              <Text style={[styles.inputLabel, { color: isDark ? "rgba(255,255,255,0.75)" : colors.textMuted, marginTop: vs(12) }]}>
                Gym Type
              </Text>
              <View style={styles.typesGrid}>
                {GYM_TYPES.map((t) => {
                  const selected = gymType === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setGymType(t)}
                      style={[
                        styles.typePill,
                        {
                          backgroundColor: selected
                            ? `${BLUE}20`
                            : isDark ? "rgba(255,255,255,0.05)" : "#F5F9FC",
                          borderColor: selected ? BLUE : "transparent",
                        },
                      ]}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.typePillText,
                          { color: selected ? BLUE : (isDark ? "rgba(255,255,255,0.6)" : colors.textMuted) },
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {step === 4 && (
            <View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Timing & Schedule</Text>
              <Text style={[styles.stepSub, { color: colors.textMuted }]}>
                When is your gym open?
              </Text>
              <View style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  {renderTextInput("Opening Time", openingTime, setOpeningTime, "e.g. 06:00")}
                </View>
                <View style={{ width: scale(16) }} />
                <View style={{ flex: 1 }}>
                  {renderTextInput("Closing Time", closingTime, setClosingTime, "e.g. 22:00")}
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: isDark ? "rgba(255,255,255,0.75)" : colors.textMuted, marginTop: vs(16) }]}>
                Working Days
              </Text>
              <View style={styles.daysGrid}>
                {DAYS.map((d) => {
                  const selected = openDays.includes(d);
                  return (
                    <TouchableOpacity
                      key={d}
                      onPress={() => toggleDay(d)}
                      style={[
                        styles.dayBox,
                        {
                          backgroundColor: selected
                            ? `${BLUE}20`
                            : isDark ? "rgba(255,255,255,0.05)" : "#F5F9FC",
                          borderColor: selected ? BLUE : "transparent",
                        },
                      ]}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.dayBoxText,
                          { color: selected ? BLUE : (isDark ? "rgba(255,255,255,0.6)" : colors.textMuted) },
                        ]}
                      >
                        {d}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {step === 5 && (
            <View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Contact & Info</Text>
              <Text style={[styles.stepSub, { color: colors.textMuted }]}>
                How can users reach out or learn more?
              </Text>
              {renderTextInput("Contact Phone", phone, setPhone, "e.g. +1 555-0199", "phone-pad")}
              {renderTextInput("Website URL", website, setWebsite, "e.g. www.spotgym.com", "url")}
              {renderTextInput(
                "Contact Email",
                contactEmail,
                setContactEmail,
                "e.g. info@spotgym.com",
                "email-address"
              )}
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actionsWrap}>
            {step < TOTAL_STEPS ? (
              <TouchableOpacity
                onPress={nextStep}
                disabled={!isStepValid()}
                style={[styles.actionButton, { backgroundColor: BLUE, opacity: isStepValid() ? 1 : 0.5 }]}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>Next Step</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleRegister}
                disabled={submitting}
                style={[styles.actionButton, { backgroundColor: BLUE }]}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.actionButtonText}>
                      {isEditing ? "Save Changes" : "Register Gym"}
                    </Text>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingBottom: vs(12),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerBack: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: FONTS.heading,
    fontSize: scale(20),
    letterSpacing: 0.3,
  },
  progressContainer: {
    paddingHorizontal: scale(20),
    paddingTop: vs(12),
    gap: vs(6),
  },
  progressLineRow: {
    flexDirection: "row",
    gap: scale(4),
  },
  progressLine: {
    flex: 1,
    height: vs(4),
    borderRadius: 2,
  },
  progressLabel: {
    fontFamily: FONTS.body,
    fontSize: scale(11),
    textAlign: "right",
  },
  scrollContainer: {
    paddingHorizontal: scale(20),
    paddingTop: vs(18),
  },
  stepTitle: {
    fontFamily: FONTS.heading,
    fontSize: scale(24),
    letterSpacing: 0.5,
  },
  stepSub: {
    fontFamily: FONTS.body,
    fontSize: scale(13),
    marginBottom: vs(18),
  },
  inputContainer: {
    marginBottom: vs(14),
  },
  inputLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(12),
    marginBottom: vs(6),
  },
  textInput: {
    fontFamily: FONTS.body,
    fontSize: scale(14),
    paddingVertical: vs(12),
    paddingHorizontal: scale(16),
    borderRadius: scale(12),
    borderWidth: 1,
  },
  typesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
    marginTop: vs(6),
  },
  typePill: {
    borderRadius: scale(20),
    paddingHorizontal: scale(14),
    paddingVertical: vs(8),
    borderWidth: 1,
  },
  typePillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: scale(12),
  },
  timeRow: {
    flexDirection: "row",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(6),
    marginTop: vs(6),
  },
  dayBox: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(10),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  dayBoxText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(12),
  },
  actionsWrap: {
    marginTop: vs(24),
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    borderRadius: scale(14),
    paddingVertical: vs(14),
  },
  actionButtonText: {
    fontFamily: FONTS.bodyBold,
    fontSize: scale(15),
    color: "#FFFFFF",
  },
});
