import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Modal,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FONTS } from "../../constants/theme";
import { useTheme } from "../../contexts/ThemeContext";
import axios from "axios";
import { LinearGradient } from 'expo-linear-gradient';

const { width: SW } = Dimensions.get("window");

const SectionHeader = ({ title, colors }: { title: string; colors: any }) => (
  <View style={styles.sectionHeader}>
    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
    <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
  </View>
);

export default function MyDetailsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState<any>({});
  // New Photos State (stores local URIs for upload)
  const [newPhotos, setNewPhotos] = useState<any>({
    profile_pic: null,
    front_photo: null,
    back_photo: null,
    side_photo: null,
  });

  const [showDatePicker, setShowDatePicker] = useState(false);

  // Modal State for Dropdowns
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    options: string[];
    key: string;
  }>({ visible: false, title: "", options: [], key: "" });

  const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        router.replace("/");
        return;
      }
      const res = await axios.get(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
      setFormData(res.data);
    } catch (err) {
      console.error("Error fetching user details:", err);
      Alert.alert("Error", "Failed to load profile details");
    } finally {
      setLoading(false);
    }
  };

  const openDropdown = (title: string, options: string[], key: string) => {
    if (!isEditing) return;
    setModalConfig({ visible: true, title, options, key });
  };

  const handleSelectOption = (option: string) => {
    setFormData({ ...formData, [modalConfig.key]: option });
    setModalConfig({ ...modalConfig, visible: false });
  };

  const pickImage = async (type: string) => {
    if (!isEditing) return;

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: type === 'profile_pic' ? [1, 1] : [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      setNewPhotos({ ...newPhotos, [type]: result.assets[0].uri });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem("userToken");
      
      const updateData = new FormData();
      
      // List of fields to exclude from direct text append if they are processed differently
      const photoFields = ['profile_pic_url', 'front_photo_url', 'back_photo_url', 'side_photo_url'];

      // Append all text fields
      Object.keys(formData).forEach(key => {
        if (!photoFields.includes(key) && formData[key] !== null && formData[key] !== undefined) {
          updateData.append(key, formData[key].toString());
        }
      });

      // Append new images if any
      const appendImage = async (key: string, fieldName: string) => {
        if (newPhotos[key]) {
          const uri = newPhotos[key];
          if (Platform.OS === 'web') {
            const response = await fetch(uri);
            const blob = await response.blob();
            updateData.append(fieldName, blob, `${fieldName}.jpg`);
          } else {
            const ext = uri.split('.').pop() || 'jpg';
            updateData.append(fieldName, {
              uri,
              name: `${fieldName}.${ext}`,
              type: `image/${ext === 'png' ? 'png' : 'jpeg'}`
            } as any);
          }
        }
      };

      await appendImage('profile_pic', 'profile_pic');
      await appendImage('front_photo', 'front_photo');
      await appendImage('back_photo', 'back_photo');
      await appendImage('side_photo', 'side_photo');

      const response = await axios.put(`${API_URL}/profile/update`, updateData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        }
      });

      if (response.data.success) {
        setUser(response.data.user);
        setFormData(response.data.user);
        setNewPhotos({
          profile_pic: null,
          front_photo: null,
          back_photo: null,
          side_photo: null,
        });
        setIsEditing(false);
        Alert.alert("Success", "Profile updated successfully");
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      const dobStr = selectedDate.toISOString().split('T')[0];
      setFormData({ 
        ...formData, 
        dob: dobStr,
        age: calculateAge(dobStr)
      });
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return `${date.getDate().toString().padStart(2, "0")} / ${(date.getMonth() + 1).toString().padStart(2, "0")} / ${date.getFullYear()}`;
  };

  const calculateAge = (dateStr: string) => {
    if (!dateStr) return "";
    const today = new Date();
    const birthDate = new Date(dateStr);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };

  // ─── VIEW MODE HELPERS ───────────────────────────────────────────────
  const ViewField = ({ label, value }: { label: string; value: any }) => (
    <View style={[vStyles.field, { borderBottomColor: colors.border }]}>
      <Text style={[vStyles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[vStyles.fieldValue, { color: colors.text }]}>{value || '—'}</Text>
    </View>
  );

  const StatTile = ({ label, value, icon }: { label: string; value: any; icon: any }) => (
    <View style={[vStyles.statTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={vStyles.statIconWrap}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[vStyles.statValue, { color: colors.text }]}>{value || '—'}</Text>
      <Text style={[vStyles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );

  const BadgeRow = ({ label, value, icon }: { label: string; value: any; icon: any }) => (
    <View style={[vStyles.badgeRow, { borderBottomColor: colors.border }]}>
      <Text style={[vStyles.badgeLabel, { color: colors.textMuted }]}>{label}</Text>
      {value ? (
        <View style={[vStyles.badge, { backgroundColor: colors.primary }]}>
          <Text style={vStyles.badgeText}>{value}</Text>
        </View>
      ) : <Text style={[vStyles.fieldValue, { color: colors.text }]}>—</Text>}
    </View>
  );

  const MeasurementChip = ({ label, value }: { label: string; value: any }) => (
    <View style={[vStyles.measureChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[vStyles.measureValue, { color: colors.text }]}>{value || '—'}</Text>
      <Text style={[vStyles.measureLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );

  const HealthRow = ({ label, value, dot }: { label: string; value: any; dot?: string }) => (
    <View style={[vStyles.healthRow, { borderBottomColor: colors.border }]}>
      <View style={[vStyles.dot, { backgroundColor: (dot === '#E00000' || !dot) ? colors.primary : dot }]} />
      <View style={{ flex: 1 }}>
        <Text style={[vStyles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[vStyles.fieldValue, { color: colors.text }]}>{value || '—'}</Text>
      </View>
    </View>
  );
  // ─────────────────────────────────────────────────────────────────────

  const renderInfoRow = (
    label: string, 
    value: any, 
    key: string, 
    icon: any, 
    type: 'text' | 'dropdown' = 'text', 
    options: string[] = [],
    iconType: 'Ionicons' | 'MaterialCommunityIcons' = 'Ionicons'
  ) => {
    if (isEditing) {
      const IconComponent = iconType === 'Ionicons' ? Ionicons : MaterialCommunityIcons;

      if (type === 'dropdown') {
        return (
          <TouchableOpacity activeOpacity={0.7} onPress={() => openDropdown(label, options, key)} style={{ marginBottom: 12 }}>
            <Text style={[styles.dietFieldLabel, { color: colors.textMuted }]}>{label}</Text>
            <View pointerEvents="none" style={[styles.dietInputRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <IconComponent name={icon} size={18} color={colors.primary} style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.dietInputField, { color: colors.text }]}
                value={formData[key]?.toString() || ""}
                placeholder={`Select ${label.toLowerCase()}`}
                placeholderTextColor={colors.textDim}
                editable={false}
              />
              <Ionicons name="chevron-down" size={16} color="#A0A0A0" />
            </View>
          </TouchableOpacity>
        );
      }

      return (
        <View style={{ marginBottom: 12 }}>
          <Text style={[styles.dietFieldLabel, { color: colors.textMuted }]}>{label}</Text>
          <View style={[styles.dietInputRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <IconComponent name={icon} size={18} color={colors.primary} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.dietInputField, { color: colors.text }]}
              value={formData[key]?.toString() || ""}
              onChangeText={(text) => setFormData({ ...formData, [key]: text })}
              placeholder={`Enter ${label.toLowerCase()}`}
              placeholderTextColor={colors.textDim}
              editable={key !== 'age'}
            />
          </View>
        </View>
      );
    }

    return null; // view mode handled by dedicated components
  };

  if (loading) {
    return (
      <View style={[styles.centered, { flex: 1, backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[
        styles.header,
        {
          backgroundColor: isDark ? colors.bg : colors.primary,
          paddingTop: Math.max(insets.top, 12),
          borderBottomWidth: isDark ? 1 : 0,
          borderBottomColor: colors.border,
        }
      ]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[styles.headerBtn, { backgroundColor: isDark ? colors.inputBg : 'rgba(255,255,255,0.15)' }]}
        >
          <Ionicons name="chevron-back" size={24} color={isDark ? colors.text : '#FFF'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? colors.text : '#FFF' }]}>My Details</Text>
        <TouchableOpacity 
          onPress={() => isEditing ? handleSave() : setIsEditing(true)} 
          style={[
            styles.headerBtn, 
            { 
              backgroundColor: isEditing 
                ? (isDark ? colors.primary : '#FFF') 
                : (isDark ? colors.inputBg : 'rgba(255,255,255,0.15)') 
            }
          ]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={isEditing ? (isDark ? "#FFF" : colors.primary) : (isDark ? colors.primary : "#FFF")} />
          ) : (
            <Text style={[
              styles.headerBtnText, 
              { color: isDark ? colors.primary : '#FFF' }, 
              isEditing && { color: isDark ? '#FFF' : colors.primary }
            ]}>
              {isEditing ? "SAVE" : "EDIT"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
        >
          {/* ── ACCOUNT DETAILS ─────────────────────────── */}
          {isEditing ? (
            <View style={styles.section}>
              <SectionHeader title="Account Details" colors={colors} />
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {renderInfoRow("Full Name", formData.full_name, "full_name", "person-outline")}
                {renderInfoRow("Email Address", formData.email, "email", "mail-outline")}
                {renderInfoRow("Phone Number", formData.phone_number, "phone_number", "call-outline")}
                {renderInfoRow("Gender", formData.gender, "gender", "transgender-outline", 'dropdown', ["Male", "Female", "Other", "Prefer not to say"])}
                <View style={{ marginBottom: 12 }}>
                  <Text style={[styles.dietFieldLabel, { color: colors.textMuted }]}>Date of Birth</Text>
                  <TouchableOpacity activeOpacity={1} onPress={() => {
                    if (Platform.OS === "web") {
                      const d = document.getElementById("profile-web-date-picker") as any;
                      if (d && d.showPicker) d.showPicker();
                    } else { setShowDatePicker(true); }
                  }}>
                    <View pointerEvents="none" style={[styles.dietInputRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                      <Ionicons name="calendar-outline" size={18} color={colors.primary} style={{ marginRight: 10 }} />
                      <TextInput
                        style={[styles.dietInputField, { color: colors.text }]}
                        value={formData.dob ? formatDate(formData.dob) : ""}
                        placeholder="DD / MM / YYYY"
                        placeholderTextColor={colors.textDim}
                        editable={false}
                      />
                    </View>
                  </TouchableOpacity>
                  {Platform.OS === "web" && (<input id="profile-web-date-picker" type="date" style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }} onChange={(e) => { const v = e.target.value; if (v) setFormData({ ...formData, dob: v, age: calculateAge(v) }); }} />)}
                  {Platform.OS !== "web" && showDatePicker && (<DateTimePicker value={formData.dob ? new Date(formData.dob) : new Date()} mode="date" display={Platform.OS === "ios" ? "spinner" : "default"} onChange={onDateChange} maximumDate={new Date()} />)}
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <SectionHeader title="Account Details" colors={colors} />
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ViewField label="Full Name" value={formData.full_name} />
                <ViewField label="Email Address" value={formData.email} />
                <ViewField label="Phone Number" value={formData.phone_number} />
                <ViewField label="Gender" value={formData.gender} />
                <ViewField label="Date of Birth" value={formData.dob ? formatDate(formData.dob) : ''} />
              </View>
            </View>
          )}

          {/* ── PHYSICAL METRICS ────────────────────────── */}
          {isEditing ? (
            <View style={styles.section}>
              <SectionHeader title="Physical Metrics" colors={colors} />
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.grid}><View style={styles.gridItem}>{renderInfoRow("Age", formData.age, "age", "calendar-clear-outline")}</View><View style={styles.gridItem}>{renderInfoRow("Body Fat %", formData.body_fat, "body_fat", "water-outline")}</View></View>
                <View style={styles.grid}><View style={styles.gridItem}>{renderInfoRow("Height", formData.height, "height", "resize-outline")}</View><View style={styles.gridItem}>{renderInfoRow("Weight", formData.weight, "weight", "speedometer-outline")}</View></View>
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <SectionHeader title="Physical Metrics" colors={colors} />
              <View style={vStyles.statGrid}>
                <StatTile label="Age" value={formData.age} icon="calendar-clear-outline" />
                <StatTile label="Body Fat" value={formData.body_fat ? `${formData.body_fat}%` : ''} icon="water-outline" />
                <StatTile label="Height" value={formData.height} icon="resize-outline" />
                <StatTile label="Weight" value={formData.weight} icon="speedometer-outline" />
              </View>
            </View>
          )}

          {/* ── FITNESS STRATEGY ────────────────────────── */}
          {isEditing ? (
            <View style={styles.section}>
              <SectionHeader title="Fitness Strategy" colors={colors} />
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {renderInfoRow("Fitness Goal", formData.fitness_goal, "fitness_goal", "target", "dropdown", ["Lose Weight", "Build Muscle", "Improve Endurance", "Maintain Health", "Rehab"], 'MaterialCommunityIcons')}
                {renderInfoRow("Experience Level", formData.experience_level, "experience_level", "trophy-outline", "dropdown", ["Beginner (0-1 years)", "Intermediate (1-3 years)", "Advanced (3+ years)"])}
                {renderInfoRow("Activity Level", formData.activity_level, "activity_level", "flash-outline", "dropdown", ["Sedentary", "Lightly Active", "Moderately Active", "Very Active"])}
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <SectionHeader title="Fitness Strategy" colors={colors} />
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <BadgeRow label="Fitness Goal" value={formData.fitness_goal} icon="target" />
                <BadgeRow label="Experience Level" value={formData.experience_level} icon="trophy-outline" />
                <BadgeRow label="Activity Level" value={formData.activity_level} icon="flash-outline" />
              </View>
            </View>
          )}

          {/* ── BODY STATS ──────────────────────────────── */}
          {isEditing ? (
            <View style={styles.section}>
              <SectionHeader title="Body Stats" colors={colors} />
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.grid}><View style={styles.gridItem}>{renderInfoRow("Neck", formData.neck, "neck", "bandage-outline")}</View><View style={styles.gridItem}>{renderInfoRow("Chest", formData.chest, "chest", "shirt-outline")}</View></View>
                <View style={styles.grid}><View style={styles.gridItem}>{renderInfoRow("Waist", formData.waist, "waist", "body-outline")}</View><View style={styles.gridItem}>{renderInfoRow("Hip", formData.hip, "hip", "body-outline")}</View></View>
                <View style={styles.grid}><View style={styles.gridItem}>{renderInfoRow("Arm", formData.arm, "arm", "fitness-outline")}</View><View style={styles.gridItem}>{renderInfoRow("Thigh", formData.thigh, "thigh", "fitness-outline")}</View></View>
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <SectionHeader title="Body Stats (cm)" colors={colors} />
              <View style={vStyles.measureGrid}>
                <MeasurementChip label="Neck" value={formData.neck} />
                <MeasurementChip label="Chest" value={formData.chest} />
                <MeasurementChip label="Waist" value={formData.waist} />
                <MeasurementChip label="Hip" value={formData.hip} />
                <MeasurementChip label="Arm" value={formData.arm} />
                <MeasurementChip label="Thigh" value={formData.thigh} />
              </View>
            </View>
          )}

          {/* ── NUTRITION & HEALTH ──────────────────────── */}
          {isEditing ? (
            <View style={styles.section}>
              <SectionHeader title="Nutrition & Health" colors={colors} />
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {renderInfoRow("Diet Type", formData.diet_type, "diet_type", "restaurant-outline", "dropdown", ["Standard", "Vegetarian", "Vegan", "Keto", "Paleo"])}
                {renderInfoRow("Food Preference", formData.food_preference, "food_preference", "nutrition-outline", "dropdown", ["No Preference", "High Protein", "Low Carb", "Low Fat"])}
                {renderInfoRow("Water Intake", formData.water_intake, "water_intake", "water-outline", "dropdown", ["Less than 1L", "1-2L", "2-3L", "More than 3L"])}
                {renderInfoRow("Medical Issues", formData.medical_conditions, "medical_conditions", "medical-outline")}
                {renderInfoRow("Medication", formData.medication, "medication", "medkit-outline", "dropdown", ["Yes", "No"])}
                {renderInfoRow("Allergies", formData.allergies, "allergies", "warning-outline")}
                {renderInfoRow("Food Allergies", formData.food_allergies, "food_allergies", "alert-circle-outline")}
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <SectionHeader title="Nutrition & Health" colors={colors} />
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <HealthRow label="Diet Type" value={formData.diet_type} dot={colors.primary} />
                <HealthRow label="Food Preference" value={formData.food_preference} dot="#FF9800" />
                <HealthRow label="Water Intake" value={formData.water_intake} dot="#2196F3" />
                <HealthRow label="Medical Issues" value={formData.medical_conditions} dot="#9C27B0" />
                <HealthRow label="Medication" value={formData.medication} dot="#E91E63" />
                <HealthRow label="Allergies" value={formData.allergies} dot="#FF5722" />
                <HealthRow label="Food Allergies" value={formData.food_allergies} dot="#F44336" />
              </View>
            </View>
          )}

          {/* Photos Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Progress Snapshots</Text>
              <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
              {[
                { label: "Profile", url: formData.profile_pic_url, key: 'profile_pic' },
                { label: "Front View", url: formData.front_photo_url, key: 'front_photo' },
                { label: "Back View", url: formData.back_photo_url, key: 'back_photo' },
                { label: "Side View", url: formData.side_photo_url, key: 'side_photo' },
              ].map((img, i) => (
                <View key={i} style={styles.photoItem}>
                  <TouchableOpacity 
                    activeOpacity={isEditing ? 0.8 : 1}
                    onPress={() => pickImage(img.key)}
                    style={[styles.photoWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                  >
                    {(newPhotos[img.key] || img.url) ? (
                      <Image 
                        source={{ uri: newPhotos[img.key] || img.url }} 
                        style={styles.photoImg} 
                        resizeMode="cover" 
                      />
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <Ionicons name="image-outline" size={32} color={colors.border} />
                      </View>
                    )}
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.5)']}
                      style={styles.photoOverlay}
                    />
                    <Text style={styles.photoLabel}>{img.label}</Text>
                    
                    {isEditing && (
                      <View style={[styles.editPhotoBadge, { backgroundColor: colors.primary, borderColor: colors.card }]}>
                        <Ionicons name="camera" size={16} color="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>

          {isEditing && (
             <TouchableOpacity style={styles.cancelBtn} onPress={() => {
               setIsEditing(false);
               setNewPhotos({
                 profile_pic: null,
                 front_photo: null,
                 back_photo: null,
                 side_photo: null,
               });
               setFormData(user);
             }}>
               <Text style={[styles.cancelBtnText, { color: colors.textDim }]}>Discard Changes</Text>
             </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Dropdown Modal */}
      <Modal transparent animationType="fade" visible={modalConfig.visible}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalConfig({ ...modalConfig, visible: false })}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalDragIndicator, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>{modalConfig.title}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {modalConfig.options.map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.modalOption, { borderBottomColor: colors.border }]}
                  onPress={() => handleSelectOption(opt)}
                >
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBFBFB',
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    color: '#111111',
    letterSpacing: 1,
  },
  headerBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F7F7F7',
    minWidth: 44,
    alignItems: 'center',
  },
  headerBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: "#2596BE",
  },
  saveBtnHeader: {
    backgroundColor: "#2596BE",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
    flexGrow: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    color: '#666666',
    marginRight: 12,
    textTransform: 'uppercase',
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EEEEEE',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(37, 150, 190, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoLabel: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: '#666666',
  },
  infoValue: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: '#111111',
  },
  grid: {
    flexDirection: 'row',
    gap: 8,
  },
  gridItem: {
    flex: 1,
  },
  dietFieldLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  dietInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dietInputField: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    padding: 0,
  },

  photoScroll: {
    marginTop: 8,
  },
  photoItem: {
    marginRight: 16,
  },
  photoWrapper: {
    width: 140,
    height: 180,
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    overflow: "hidden",
    position: 'relative',
  },
  photoImg: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  photoLabel: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: "#FFF",
  },
  editPhotoBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: "#2596BE",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF', // fallback, overridden inline
  },
  bottomActions: {
    marginTop: 20,
    gap: 12,
  },
  saveBtnBottom: {
    backgroundColor: "#2596BE",
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: "#2596BE",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: "#FFF",
  },
  cancelBtn: {
    alignItems: 'center',
    padding: 12,
  },
  cancelBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: '#999999',
    textDecorationLine: 'underline',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalDragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#EEE',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    color: '#111',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  modalOptionText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
});

const vStyles = StyleSheet.create({
  field: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  fieldLabel: {
    fontFamily: FONTS.body,
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statTile: {
    width: (SW - 32 - 12) / 2,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIconWrap: {
    marginBottom: 8,
  },
  statValue: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: FONTS.body,
    fontSize: 11,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  badgeLabel: {
    fontFamily: FONTS.body,
    fontSize: 14,
  },
  badge: {
    backgroundColor: '#2596BE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: '#FFF',
  },
  measureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  measureChip: {
    width: (SW - 32 - 16) / 3,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
  },
  measureValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    marginBottom: 2,
  },
  measureLabel: {
    fontFamily: FONTS.body,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 16,
  },
});

