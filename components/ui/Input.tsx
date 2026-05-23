import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { FONTS } from "../../constants/theme";

const BASE_PALETTE = {
  sun: "#F7CB16",
  error: "#FF4D4D",
  darkInputBg: "#0E3C44",
  darkInputFocusBg: "#0A4F5C",
  darkBorder: "rgba(37, 150, 190, 0.30)",
  darkBorderFocus: "rgba(247, 203, 22, 0.70)",
  darkLabelIdle: "rgba(247, 251, 248, 0.45)",
  darkLabelActive: "#F7CB16",
  darkPlaceholder: "rgba(247, 251, 248, 0.32)",
  darkText: "#F7FBF8",
  lightInputBg: "#FFFFFF",
  lightInputFocusBg: "#FFFFFF",
  lightBorder: "rgba(4, 40, 43, 0.16)",
  lightBorderFocus: "rgba(247, 203, 22, 0.95)",
  lightLabelIdle: "rgba(255, 255, 255, 0.82)",
  lightLabelActive: "#F7CB16",
  lightPlaceholder: "#90A0AA",
  lightText: "#0C2E35",
};

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  type?: string;
  unitOptions?: string[];
  unitValue?: string;
  onUnitChange?: (unit: string) => void;
  tone?: "dark" | "light";
}

export default function Input({
  label,
  error,
  containerStyle,
  icon,
  rightIcon,
  type,
  unitOptions,
  unitValue,
  onUnitChange,
  tone = "dark",
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const isLight = tone === "light";

  const palette = isLight
    ? {
        inputBg: BASE_PALETTE.lightInputBg,
        inputFocusBg: BASE_PALETTE.lightInputFocusBg,
        border: BASE_PALETTE.lightBorder,
        borderFocus: BASE_PALETTE.lightBorderFocus,
        labelIdle: BASE_PALETTE.lightLabelIdle,
        labelActive: BASE_PALETTE.lightLabelActive,
        placeholder: BASE_PALETTE.lightPlaceholder,
        text: BASE_PALETTE.lightText,
      }
    : {
        inputBg: BASE_PALETTE.darkInputBg,
        inputFocusBg: BASE_PALETTE.darkInputFocusBg,
        border: BASE_PALETTE.darkBorder,
        borderFocus: BASE_PALETTE.darkBorderFocus,
        labelIdle: BASE_PALETTE.darkLabelIdle,
        labelActive: BASE_PALETTE.darkLabelActive,
        placeholder: BASE_PALETTE.darkPlaceholder,
        text: BASE_PALETTE.darkText,
      };

  const handleUnitToggle = () => {
    if (unitOptions && unitValue && onUnitChange) {
      const currentIndex = unitOptions.indexOf(unitValue);
      const nextIndex = (currentIndex + 1) % unitOptions.length;
      onUnitChange(unitOptions[nextIndex]);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text
          style={[
            styles.label,
            { color: isFocused ? palette.labelActive : palette.labelIdle },
          ]}
        >
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: isFocused ? palette.inputFocusBg : palette.inputBg,
            borderColor: isFocused ? palette.borderFocus : palette.border,
          },
          !!error && styles.inputWrapperError,
        ]}
      >
        {icon ? <View style={styles.iconWrapper}>{icon}</View> : null}

        <TextInput
          style={[styles.input, { color: palette.text }]}
          placeholderTextColor={palette.placeholder}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
          {...(Platform.OS === "web" ? { type } : {})}
        />

        {unitOptions && unitOptions.length > 0 && unitValue && onUnitChange ? (
          <TouchableOpacity
            style={styles.unitToggleBtn}
            onPress={handleUnitToggle}
            activeOpacity={0.75}
          >
            <Text style={styles.unitToggleText}>{unitValue}</Text>
          </TouchableOpacity>
        ) : rightIcon ? (
          <View style={styles.rightIconWrapper}>{rightIcon}</View>
        ) : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
    width: "100%",
  },
  label: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: 7,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  inputWrapperError: {
    borderColor: BASE_PALETTE.error,
  },
  iconWrapper: {
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 15,
    paddingVertical: 0,
    textAlignVertical: "center",
    backgroundColor: "transparent",
  },
  rightIconWrapper: {
    marginLeft: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  unitToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(247, 203, 22, 0.14)",
    marginLeft: 10,
    borderWidth: 1,
    borderColor: "rgba(247, 203, 22, 0.3)",
  },
  unitToggleText: {
    fontFamily: FONTS.bodySemiBold,
    color: BASE_PALETTE.sun,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  errorText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: BASE_PALETTE.error,
    marginTop: 6,
    marginLeft: 2,
  },
});
