# Android release APK (install over existing, no data loss)

So you can send a new APK and users **install it over the existing app** without uninstalling (data is kept).

## One-time setup

1. **Generate Android project** (if you don’t have an `android/` folder):
   ```bash
   npx expo prebuild --platform android
   ```

2. **Create release keystore and credentials** (keep these safe; use the same for every release):
   ```bash
   KEYSTORE_PASSWORD=your_secret KEY_PASSWORD=your_secret ./scripts/setup-android-release-keystore.sh
   ```
   Or run the script and enter passwords when prompted. This creates `android/release.keystore` and `android/keystore.properties`. Do not commit these files.

## Each new release (when you want to send an updated APK)

1. **Bump version** in `app.json`:
   - `expo.version` (e.g. `"1.0.0"` → `"1.0.1"`)
   - `expo.android.versionCode` (e.g. `1` → `2`, then `3`, …). Must increase every time.

2. **Build release APK**:
   ```bash
   npm run android:release
   ```

3. **Get the APK**  
   After the build, the APK is under:
   `android/app/build/outputs/apk/release/app-release.apk`  
   (path may vary slightly; check the Gradle output.)

4. **Share the APK** (e.g. via Telegram). Users install it; Android will **update** the existing app and **keep data** because:
   - Same package: `com.birrtrack`
   - Same signing key (the keystore you created)
   - Higher `versionCode` than the installed app

## Summary

| Step              | Command / action                                      |
|-------------------|--------------------------------------------------------|
| First-time setup  | `npx expo prebuild --platform android` then run script |
| Bump version      | Edit `app.json`: `version` and `android.versionCode`   |
| Build release APK| `npm run android:release`                              |
| APK location      | `android/app/build/outputs/apk/release/`               |

Use the **same keystore and passwords** for every release so updates install on top and data is preserved.
