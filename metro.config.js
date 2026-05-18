const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");
const fs = require("fs");

const config = getDefaultConfig(__dirname);

// Fix: react-native-svg v15 references a missing ./deprecated module on web
const stubPath = path.resolve(__dirname, "node_modules/react-native-svg/lib/module/deprecated.js");
if (!fs.existsSync(stubPath)) {
  fs.writeFileSync(stubPath, "module.exports = {};");
}

module.exports = withNativeWind(config, {
  input: "./global.css",
  inlineRem: 16,
});
