const { withAppBuildGradle } = require("@expo/config-plugins");

/**
 * Expo config plugin: inject release signing into android/app/build.gradle
 * so that release APKs are signed with the same keystore (keystore.properties).
 * When android/keystore.properties exists, release uses it; otherwise falls back to debug key.
 * This allows "install over existing" updates without losing data (same key + higher versionCode).
 */
function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // 1) Add release signingConfig that reads from keystore.properties (with fallback to debug)
    //    Insert after the closing "}" of the debug block inside signingConfigs, before the closing "}" of signingConfigs.
    const releaseSigningBlock = `
    release {
        def keystorePropertiesFile = rootProject.file("keystore.properties")
        if (keystorePropertiesFile.exists()) {
            def keystoreProperties = new Properties()
            keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        } else {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`;

    const signingConfigsDebugEnd = /(signingConfigs\s*\{\s*debug\s*\{[^}]*\})\s*(\}\s*)(?=buildTypes)/s;
    if (signingConfigsDebugEnd.test(contents)) {
      contents = contents.replace(
        signingConfigsDebugEnd,
        (match, upToDebugClose, closingBrace) => `${upToDebugClose}${releaseSigningBlock}${closingBrace}`
      );
    }

    // 2) In buildTypes.release, use signingConfigs.release instead of .debug (only the one in release block)
    contents = contents.replace(
      /(buildTypes\s*\{\s*release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/,
      "$1signingConfig signingConfigs.release"
    );

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withAndroidReleaseSigning;
