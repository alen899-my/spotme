import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  KeyboardAvoidingView,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, FONTS } from "../../constants/theme";
import Input from "../../components/ui/Input";
import axios from "axios";
import { LinearGradient } from 'expo-linear-gradient';

export default function MyDetailsScreen() {
  const router = useRouter();
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
      if (type === 'dropdown') {
        return (
          <TouchableOpacity activeOpacity={0.7} onPress={() => openDropdown(label, options, key)}>
            <View pointerEvents="none">
              <Input
                label={label}
                value={formData[key]?.toString() || ""}
                placeholder={`Select ${label.toLowerCase()}`}
                icon={iconType === 'Ionicons' ? <Ionicons name={icon} size={20} color="#E00000" /> : <MaterialCommunityIcons name={icon} size={20} color="#E00000" />}
                containerStyle={styles.inputContainer}
                editable={false}
                rightIcon={<Ionicons name="chevron-down" size={16} color="#A0A0A0" />}
              />
            </View>
          </TouchableOpacity>
        );
      }

      return (
        <Input
          label={label}
          value={formData[key]?.toString() || ""}
          onChangeText={(text) => setFormData({ ...formData, [key]: text })}
          placeholder={`Enter ${label.toLowerCase()}`}
          icon={iconType === 'Ionicons' ? <Ionicons name={icon} size={20} color="#E00000" /> : <MaterialCommunityIcons name={icon} size={20} color="#E00000" />}
          containerStyle={styles.inputContainer}
          editable={key !== 'age'} // Age is not directly editable
        />
      );
    }

    return (
      <View style={styles.infoRow}>
        <View style={styles.infoLabelContainer}>
          <View style={styles.iconCircle}>
            {iconType === 'Ionicons' ? <Ionicons name={icon} size={18} color="#E00000" /> : <MaterialCommunityIcons name={icon} size={18} color="#E00000" />}
          </View>
          <Text style={styles.infoLabel}>{label}</Text>
        </View>
        <Text style={styles.infoValue}>{value || "—"}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#E00000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Details</Text>
        <TouchableOpacity 
          onPress={() => isEditing ? handleSave() : setIsEditing(true)} 
          style={[styles.headerBtn, isEditing && styles.saveBtnHeader]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={isEditing ? "#FFF" : "#E00000"} />
          ) : (
            <Text style={[styles.headerBtnText, isEditing && { color: "#FFF" }]}>
              {isEditing ? "SAVE" : "EDIT"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
        >
          {/* Section: Account Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Account Details</Text>
              <View style={styles.sectionLine} />
            </View>
            <View style={styles.card}>
              {renderInfoRow("Full Name", formData.full_name, "full_name", "person-outline")}
              {renderInfoRow("Email Address", formData.email, "email", "mail-outline")}
              {renderInfoRow("Phone Number", formData.phone_number, "phone_number", "call-outline")}
              {renderInfoRow("Gender", formData.gender, "gender", "transgender-outline", 'dropdown', ["Male", "Female", "Other", "Prefer not to say"])}
              
              {/* Date of Birth with Picker */}
              {isEditing ? (
                <View>
                  <TouchableOpacity 
                    activeOpacity={1} 
                    onPress={() => {
                      if (Platform.OS === "web") {
                        const dateInput = document.getElementById("profile-web-date-picker") as any;
                        if (dateInput && dateInput.showPicker) {
                          dateInput.showPicker();
                        }
                      } else {
                        setShowDatePicker(true);
                      }
                    }}
                  >
                    <View pointerEvents="none">
                      <Input
                        label="Date of Birth"
                        placeholder="DD / MM / YYYY"
                        value={formData.dob ? formatDate(formData.dob) : ""}
                        editable={false}
                        icon={<Ionicons name="calendar-outline" size={20} color="#E00000" />}
                        containerStyle={styles.inputContainer}
                      />
                    </View>
                  </TouchableOpacity>
                  {Platform.OS === "web" && (
                    <input
                      id="profile-web-date-picker"
                      type="date"
                      style={{
                        position: "absolute",
                        opacity: 0,
                        width: 0,
                        height: 0,
                        pointerEvents: "none",
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          setFormData({ 
                            ...formData, 
                            dob: val,
                            age: calculateAge(val)
                          });
                        }
                      }}
                    />
                  )}
                  {Platform.OS !== "web" && showDatePicker && (
                    <DateTimePicker
                      value={formData.dob ? new Date(formData.dob) : new Date()}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={onDateChange}
                      maximumDate={new Date()}
                    />
                  )}
                </View>
              ) : (
                renderInfoRow("Date of Birth", formData.dob ? formatDate(formData.dob) : "", "dob", "calendar-outline")
              )}
            </View>
          </View>

          {/* Section: Vital Metrics */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Physical Metrics</Text>
              <View style={styles.sectionLine} />
            </View>
            <View style={styles.card}>
              <View style={styles.grid}>
                <View style={styles.gridItem}>{renderInfoRow("Age", formData.age, "age", "calendar-clear-outline")}</View>
                <View style={styles.gridItem}>{renderInfoRow("Body Fat %", formData.body_fat, "body_fat", "water-outline")}</View>
              </View>
              <View style={styles.grid}>
                <View style={styles.gridItem}>{renderInfoRow("Height", formData.height, "height", "resize-outline")}</View>
                <View style={styles.gridItem}>{renderInfoRow("Weight", formData.weight, "weight", "speedometer-outline")}</View>
              </View>
            </View>
          </View>

          {/* Section: Fitness Profile */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Fitness Strategy</Text>
              <View style={styles.sectionLine} />
            </View>
            <View style={styles.card}>
              {renderInfoRow("Fitness Goal", formData.fitness_goal, "fitness_goal", "target", "dropdown", ["Lose Weight", "Build Muscle", "Improve Endurance", "Maintain Health", "Rehab"], 'MaterialCommunityIcons')}
              {renderInfoRow("Experience Level", formData.experience_level, "experience_level", "trophy-outline", "dropdown", ["Beginner (0-1 years)", "Intermediate (1-3 years)", "Advanced (3+ years)"])}
              {renderInfoRow("Activity Level", formData.activity_level, "activity_level", "flash-outline", "dropdown", ["Sedentary", "Lightly Active", "Moderately Active", "Very Active"])}
            </View>
          </View>

          {/* Section: Body Measurements */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Body Stats</Text>
              <View style={styles.sectionLine} />
            </View>
            <View style={styles.card}>
              <View style={styles.grid}>
                <View style={styles.gridItem}>{renderInfoRow("Neck", formData.neck, "neck", "bandage-outline")}</View>
                <View style={styles.gridItem}>{renderInfoRow("Chest", formData.chest, "chest", "shirt-outline")}</View>
              </View>
              <View style={styles.grid}>
                <View style={styles.gridItem}>{renderInfoRow("Waist", formData.waist, "waist", "body-outline")}</View>
                <View style={styles.gridItem}>{renderInfoRow("Hip", formData.hip, "hip", "body-outline")}</View>
              </View>
              <View style={styles.grid}>
                <View style={styles.gridItem}>{renderInfoRow("Arm", formData.arm, "arm", "fitness-outline")}</View>
                <View style={styles.gridItem}>{renderInfoRow("Thigh", formData.thigh, "thigh", "fitness-outline")}</View>
              </View>
            </View>
          </View>

          {/* Section: Health & Nutrition */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nutrition & Health</Text>
              <View style={styles.sectionLine} />
            </View>
            <View style={styles.card}>
              {renderInfoRow("Diet Type", formData.diet_type, "diet_type", "restaurant-outline", "dropdown", ["Standard", "Vegetarian", "Vegan", "Keto", "Paleo"])}
              {renderInfoRow("Food Preference", formData.food_preference, "food_preference", "nutrition-outline", "dropdown", ["No Preference", "High Protein", "Low Carb", "Low Fat"])}
              {renderInfoRow("Water Intake", formData.water_intake, "water_intake", "water-outline", "dropdown", ["Less than 1L", "1-2L", "2-3L", "More than 3L"])}
              {renderInfoRow("Medical Issues", formData.medical_conditions, "medical_conditions", "medical-outline")}
              {renderInfoRow("Medication", formData.medication, "medication", "medkit-outline", "dropdown", ["Yes", "No"])}
              {renderInfoRow("Allergies", formData.allergies, "allergies", "warning-outline")}
              {renderInfoRow("Food Allergies", formData.food_allergies, "food_allergies", "alert-circle-outline")}
            </View>
          </View>

          {/* Photos Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Progress Snapshots</Text>
              <View style={styles.sectionLine} />
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
                    style={styles.photoWrapper}
                  >
                    {(newPhotos[img.key] || img.url) ? (
                      <Image 
                        source={{ uri: newPhotos[img.key] || img.url }} 
                        style={styles.photoImg} 
                        resizeMode="cover" 
                      />
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <Ionicons name="image-outline" size={32} color={COLORS.border} />
                      </View>
                    )}
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.5)']}
                      style={styles.photoOverlay}
                    />
                    <Text style={styles.photoLabel}>{img.label}</Text>
                    
                    {isEditing && (
                      <View style={styles.editPhotoBadge}>
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
               <Text style={styles.cancelBtnText}>Discard Changes</Text>
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
          <View style={styles.modalContent}>
            <View style={styles.modalDragIndicator} />
            <Text style={styles.modalTitle}>{modalConfig.title}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {modalConfig.options.map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.modalOption}
                  onPress={() => handleSelectOption(opt)}
                >
                  <Text style={styles.modalOptionText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
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
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    color: COLORS.text,
    letterSpacing: 1,
  },
  headerBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: COLORS.inputBg,
    minWidth: 44,
    alignItems: 'center',
  },
  headerBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: "#E00000",
  },
  saveBtnHeader: {
    backgroundColor: "#E00000",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
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
    color: COLORS.textMuted,
    marginRight: 12,
    textTransform: 'uppercase',
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    borderBottomColor: COLORS.border,
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(224, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoLabel: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  infoValue: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: COLORS.text,
  },
  grid: {
    flexDirection: 'row',
    gap: 8,
  },
  gridItem: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 12,
    paddingHorizontal: 8,
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
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: "#E00000",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  bottomActions: {
    marginTop: 20,
    gap: 12,
  },
  saveBtnBottom: {
    backgroundColor: "#E00000",
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: "#E00000",
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
    color: COLORS.textDim,
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
