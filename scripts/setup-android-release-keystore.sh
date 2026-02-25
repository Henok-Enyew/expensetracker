#!/usr/bin/env bash
# Create a release keystore and android/keystore.properties for signing release APKs.
# Run this ONCE after: npx expo prebuild --platform android
# Use the SAME keystore and passwords for every release so "install over existing" keeps user data.
#
# Usage:
#   KEYSTORE_PASSWORD=mysecret KEY_PASSWORD=mysecret ./scripts/setup-android-release-keystore.sh
# Or you will be prompted for passwords (if keytool supports it).

set -e
ANDROID_DIR="android"
KEYSTORE_FILE="${ANDROID_DIR}/release.keystore"
PROPS_FILE="${ANDROID_DIR}/keystore.properties"
ALIAS="birrtrack"

if [[ ! -d "$ANDROID_DIR" ]]; then
  echo "Run first: npx expo prebuild --platform android"
  exit 1
fi

STOREPASS="${KEYSTORE_PASSWORD:-}"
KEYPASS="${KEY_PASSWORD:-$STOREPASS}"

if [[ -z "$STOREPASS" ]]; then
  echo "Enter keystore password (store and key; remember this for all future releases):"
  read -s STOREPASS
  KEYPASS="$STOREPASS"
fi

if [[ -f "$KEYSTORE_FILE" ]]; then
  echo "Keystore already exists at $KEYSTORE_FILE. Skip creation."
else
  keytool -genkeypair -v -storetype PKCS12 -keystore "$KEYSTORE_FILE" \
    -alias "$ALIAS" -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$STOREPASS" -keypass "$KEYPASS" \
    -dname "CN=Birr Track, OU=App, O=Birr Track, L=Addis Ababa, ST=Ethiopia, C=ET"
  echo "Created $KEYSTORE_FILE"
fi

# storeFile path in keystore.properties is relative to android/app/ (build.gradle runs there)
echo "storeFile=../release.keystore
storePassword=$STOREPASS
keyAlias=$ALIAS
keyPassword=$KEYPASS" > "$PROPS_FILE"
echo "Created $PROPS_FILE"
echo "Done. Build release APK with: npm run android:release"
