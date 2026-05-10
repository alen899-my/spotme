import { Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, FONTS } from "../../constants/theme";

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "white" | "outline" | "gradient";
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Button = ({ title, onPress, variant = "primary", style, textStyle }: ButtonProps) => {
  const isGradient = variant === "gradient";

  const Content = (
    <>
      <Text style={[
        styles.text,
        variant === "white" && styles.textDark,
        (variant === "outline" || variant === "primary" || variant === "gradient") && styles.textLight,
        textStyle
      ]}>
        {title}
      </Text>
    </>
  );

  if (isGradient) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.base, styles.noPadding, style]}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, styles.padding]}
        >
          {Content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.base,
        styles.padding,
        variant === "white" && styles.white,
        variant === "outline" && styles.outline,
        variant === "primary" && styles.primary,
        style
      ]}
    >
      {Content}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  noPadding: {
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  padding: {
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  gradient: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: COLORS.primary,
  },
  white: {
    backgroundColor: "#FFFFFF",
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  text: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    letterSpacing: 2,
  },
  textDark: {
    color: "#0A0000",
  },
  textLight: {
    color: COLORS.text,
  },
});

export default Button;
