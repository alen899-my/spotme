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
import { FONTS } from "../../constants/theme";
import { useTheme } from "../../contexts/ThemeContext";

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
}

const Input = ({ label, error, containerStyle, icon, rightIcon, type, unitOptions, unitValue, onUnitChange, ...props }: InputProps) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const { colors, isDark } = useTheme();

  const handleUnitToggle = () => {
    if (unitOptions && unitValue && onUnitChange) {
      const currentIndex = unitOptions.indexOf(unitValue);
      const nextIndex = (currentIndex + 1) % unitOptions.length;
      onUnitChange(unitOptions[nextIndex]);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: isDark ? 'rgba(255,255,255,0.6)' : '#333333' }]}>{label}</Text>
      )}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: isDark
              ? (isFocused ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)')
              : (isFocused ? '#FFFFFF' : '#F7F7F7'),
            borderColor: isFocused
              ? '#E00000'
              : isDark ? 'rgba(255,255,255,0.1)' : '#EBEBEB',
           shadowColor: '#E00000',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: isFocused ? 0.15 : 0,
            shadowRadius: 6,
            elevation: isFocused ? 2 : 0,
          },
          !!error && { borderColor: '#E00000' },
        ]}
      >
        {icon && <View style={styles.iconWrapper}>{icon}</View>}
        <TextInput
          style={[styles.input, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}
          placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : '#BBBBBB'}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
          {...(Platform.OS === "web" ? { type } : {})}
        />
        {unitOptions && unitOptions.length > 0 && unitValue && onUnitChange ? (
          <TouchableOpacity
            style={[styles.unitToggleBtn, { backgroundColor: isDark ? 'rgba(224,0,0,0.15)' : '#FFF0F0' }]}
            onPress={handleUnitToggle}
            activeOpacity={0.7}
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
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    marginBottom: 7,
  },
  inputWrapper: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  iconWrapper: {
    marginRight: 10,
    opacity: 0.7,
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
    paddingVertical: 0,
    // Android: vertically centre placeholder & typed text inside fixed-height row
    textAlignVertical: "center",
  },
  errorText: {
    fontFamily: FONTS.body,
    fontSize: 12,
    color: '#E00000',
    marginTop: 5,
  },
  unitToggleBtn: {
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
