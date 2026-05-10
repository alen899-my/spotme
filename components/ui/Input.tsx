import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  Platform,
  TouchableOpacity,
} from "react-native";
import { COLORS, FONTS } from "../../constants/theme";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  type?: string; // Web only: 'date', 'password', etc.
  unitOptions?: string[];
  unitValue?: string;
  onUnitChange?: (unit: string) => void;
}

const Input = ({ label, error, containerStyle, icon, rightIcon, type, unitOptions, unitValue, onUnitChange, ...props }: InputProps) => {
  const [isFocused, setIsFocused] = React.useState(false);

  const handleUnitToggle = () => {
    if (unitOptions && unitValue && onUnitChange) {
      const currentIndex = unitOptions.indexOf(unitValue);
      const nextIndex = (currentIndex + 1) % unitOptions.length;
      onUnitChange(unitOptions[nextIndex]);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputFocused,
          !!error && styles.inputError,
        ]}
      >
        {icon && <View style={styles.iconWrapper}>{icon}</View>}
        <TextInput
          style={styles.input}
          placeholderTextColor="#BBBBBB"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
          {...(Platform.OS === "web" ? { type } : {})}
        />
        {unitOptions && unitOptions.length > 0 && unitValue && onUnitChange ? (
          <TouchableOpacity style={styles.unitToggleBtn} onPress={handleUnitToggle} activeOpacity={0.7}>
            <Text style={styles.unitToggleText}>{unitValue}</Text>
          </TouchableOpacity>
        ) : rightIcon ? (
          <View style={styles.rightIconWrapper}>{rightIcon}</View>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: "#333333",
    marginBottom: 7,
  },
  inputWrapper: {
    backgroundColor: "#F7F7F7",
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 12,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: "#FFFFFF",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  inputError: {
    borderColor: COLORS.error ?? "#E00000",
  },
  iconWrapper: {
    marginRight: 10,
    opacity: 0.6,
    justifyContent: "center",
    alignItems: "center",
  },
  rightIconWrapper: {
    marginLeft: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 14,
    color: "#1A1A1A",
    height: "100%",
    paddingVertical: 0, // fix Android vertical misalignment
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  errorText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: COLORS.error ?? "#E00000",
    marginTop: 5,
  },
  unitToggleBtn: {
    backgroundColor: "#FFF0F0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 10,
  },
  unitToggleText: {
    fontFamily: FONTS.bodySemiBold,
    color: "#E00000",
    fontSize: 12,
  },
});

export default Input;