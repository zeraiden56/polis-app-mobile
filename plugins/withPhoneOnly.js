const { withAndroidManifest } = require("@expo/config-plugins");

function withPhoneOnly(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    manifest["supports-screens"] = [
      {
        $: {
          "android:smallScreens": "true",
          "android:normalScreens": "true",
          "android:largeScreens": "false",
          "android:xlargeScreens": "false",
          "android:requiresSmallestWidthDp": "320",
        },
      },
    ];

    return config;
  });
}

module.exports = withPhoneOnly;
