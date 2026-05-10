import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, FONTS } from "../../constants/theme";
import Input from "../../components/ui/Input";
import axios from "axios";

export default function MyDetailsScreen() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState<any>({});

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
      const res = await axios.get(`${API_URL}/auth/me`, {
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

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem("userToken");
      
      // Use the new JSON update endpoint
      const response = await axios.post(`${API_URL}/auth/update-profile`, {
        ...formData,
        userId: user.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 200) {
        setUser(formData);
        setIsEditing(false);
        Alert.alert("Success", "Profile updated successfully");
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const renderInfoRow = (label: string, value: string, key: string) => {
    if (isEditing) {
      return (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{label}</Text>
          <TextInput
            style={styles.textInput}
            value={formData[key]?.toString() || ""}
            onChangeText={(text) => setFormData({ ...formData, [key]: text })}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        </View>
      );
    }

    return (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || "Not set"}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E00000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Details</Text>
        <TouchableOpacity 
          onPress={() => isEditing ? handleSave() : setIsEditing(true)} 
          style={styles.editHeaderBtn}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#E00000" />
          ) : (
            <Text style={[styles.editHeaderText, isEditing && { color: "#4CAF50" }]}>
              {isEditing ? "Save" : "Edit"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Basic Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.card}>
            {renderInfoRow("Full Name", formData.full_name, "full_name")}
            {renderInfoRow("Email", formData.email, "email")}
            {renderInfoRow("Age", formData.age, "age")}
            {renderInfoRow("Height", formData.height, "height")}
            {renderInfoRow("Weight", formData.weight, "weight")}
            {renderInfoRow("Body Fat %", formData.body_fat, "body_fat")}
          </View>
        </View>

        {/* Fitness Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fitness Goals</Text>
          <View style={styles.card}>
            {renderInfoRow("Primary Goal", formData.fitness_goal, "fitness_goal")}
            {renderInfoRow("Experience Level", formData.experience_level, "experience_level")}
            {renderInfoRow("Activity Level", formData.activity_level, "activity_level")}
          </View>
        </View>

        {/* Measurements Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Measurements</Text>
          <View style={styles.card}>
            {renderInfoRow("Neck", formData.neck, "neck")}
            {renderInfoRow("Waist", formData.waist, "waist")}
            {renderInfoRow("Hip", formData.hip, "hip")}
            {renderInfoRow("Chest", formData.chest, "chest")}
            {renderInfoRow("Arm", formData.arm, "arm")}
            {renderInfoRow("Thigh", formData.thigh, "thigh")}
          </View>
        </View>

        {/* Nutrition Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrition & Health</Text>
          <View style={styles.card}>
            {renderInfoRow("Diet Type", formData.diet_type, "diet_type")}
            {renderInfoRow("Water Intake", formData.water_intake, "water_intake")}
            {renderInfoRow("Medical Conditions", formData.medical_conditions, "medical_conditions")}
            {renderInfoRow("Allergies", formData.allergies, "allergies")}
          </View>
        </View>
        {/* Photos Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
            {[
              { label: "Profile", url: formData.profile_pic_url || formData.profilePicUrl },
              { label: "Front", url: formData.front_photo_url || formData.frontPhotoUrl },
              { label: "Back", url: formData.back_photo_url || formData.backPhotoUrl },
              { label: "Side", url: formData.side_photo_url || formData.sidePhotoUrl },
            ].map((img, i) => (
              <View key={i} style={styles.photoItem}>
                <View style={styles.photoWrapper}>
                  {img.url ? (
                    <Image source={{ uri: img.url }} style={styles.photoImg} resizeMode="cover" />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Ionicons name="image-outline" size={24} color="#CCC" />
                    </View>
                  )}
                </View>
                <Text style={styles.photoLabel}>{img.label}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FBFBFB",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // Add Image to imports
  photoScroll: {
    paddingVertical: 10,
  },
  photoItem: {
    alignItems: "center",
    marginRight: 16,
  },
  photoWrapper: {
    width: 120,
    height: 160,
    borderRadius: 12,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    overflow: "hidden",
    marginBottom: 8,
  },
  photoImg: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
  },
  photoLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    color: "#111",
  },
  editHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editHeaderText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: "#E00000",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F9F9F9",
  },
  infoLabel: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: "#666",
  },
  infoValue: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: "#111",
    textAlign: "right",
    flex: 1,
    marginLeft: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: "#111",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: FONTS.body,
    fontSize: 14,
    color: "#111",
  },
});
