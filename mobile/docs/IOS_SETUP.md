# iOS Setup: Pod Install and Encoding

This document explains the two main issues that can break `pod install` / `npx expo run:ios` and the **documented, solid fixes** used in this project.

---

## 0. PRD vs current versions (Expo SDK 52)

| Package | PRD / desired | Current in this project | Note |
|---------|----------------|-------------------------|------|
| expo | ~52.0.0 | ~52.0.0 | ✅ |
| react-native | 0.76.x | 0.76.9 | ✅ |
| expo-router | ~4.0.17 | ~4.0.17 | ✅ |
| react-native-reanimated | ~4.1.1 | ~3.18.0 | Reanimated 4.1.x requires **RN 0.78+**; Expo 52 default is 0.76, so we use 3.18.x for compatibility. |
| react-native-worklets | 0.5.1 | — | Only needed for Reanimated 4+; omitted when using Reanimated 3.x. |

To use **Reanimated 4.1.1 + worklets 0.5.1** you would need React Native 0.78+ (e.g. when Expo supports it in a future SDK). Until then, Reanimated 3.18.x is the compatible choice for Expo 52 + RN 0.76.

---

## 1. Podfile: `undefined method '[]' for nil` (project.ios)

### What happens

When the Podfile runs `use_native_modules!`, it calls `react-native config`. In Expo projects the CLI often returns **`"project": {}`** (empty). The script then does `config["project"]["ios"]["sourceDir"]`, which becomes `nil["sourceDir"]` and raises: **undefined method '[]' for nil**.

### Why it happens

- Expo uses **app.json / app.config.js** for configuration, not `react-native config`.
- React Native CLI’s `react-native config` is still used by the generated Podfile for autolinking.
- So when the Podfile runs from the `ios/` directory, the config can have an empty `project` and no `project.ios.sourceDir`.

**References:**

- [Expo Autolinking](https://docs.expo.dev/modules/autolinking/) – Expo’s autolinking and `expo.autolinking` config.
- [Expo Prebuild](https://docs.expo.dev/workflow/prebuild/) – Native dirs are generated from app config; Podfile comes from the Expo template.

### What we did (solid fix)

1. **Podfile**  
   In `ios/Podfile`, when **not** using `EXPO_UNSTABLE_CORE_AUTOLINKING`, we:
   - Run `react-native config` from the **project root** (`chdir: project_root`).
   - If `config["project"]` or `config["project"]["ios"]` is missing, we set:
     - `config["project"]["ios"]["sourceDir"] = "<project_root>/ios"`.
   - We call the original `use_native_modules!(config)` with this patched config.

   So the Podfile no longer depends on `react-native config` returning a non-empty `project.ios`.

2. **react-native.config.js** (optional but recommended)  
   At the project root we have:

   ```js
   module.exports = {
     project: {
       ios: { sourceDir: path.join(__dirname, 'ios') },
       android: { sourceDir: path.join(__dirname, 'android') },
     },
   };
   ```

   This helps any tool that uses `react-native config`; the Podfile still works without it thanks to the patch above.

---

## 2. CocoaPods: `Unicode Normalization not appropriate for ASCII-8BIT`

### What happens

CocoaPods uses Ruby’s unicode normalization on paths. If the environment is **ASCII-8BIT** (e.g. no UTF-8 locale), you get:

**Unicode Normalization not appropriate for ASCII-8BIT (Encoding::CompatibilityError)**

CocoaPods itself suggests adding `export LANG=en_US.UTF-8` to `~/.profile`.

### Official / documented fix

From [CocoaPods/CocoaPods#11891](https://github.com/CocoaPods/CocoaPods/issues/11891) and related threads:

**1. Shell (terminal) – required for `pod install` from terminal**

Add to **all** of these that you use: `~/.zshrc`, `~/.profile`, `~/.bash_profile`:

```bash
export LANG=en_US.UTF-8
export LANGUAGE=en_US.UTF-8
export LC_ALL=en_US.UTF-8
```

Then open a **new** terminal and run:

```bash
cd /path/to/buffr-g2p/ios
pod install
```

**2. When Xcode runs `pod install` (e.g. Run Script phases)**

Shell config files are **not** used by Xcode. You must set the variables in the environment where Xcode runs. Two options:

- **Option A – LaunchAgent (persistent, recommended)**  
  So that **all** GUI apps (including Xcode) see UTF-8:

  1. Create `~/Library/LaunchAgents/environment.utf8.plist`:

  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  <plist version="1.0">
  <dict>
    <key>Label</key>
    <string>environment.utf8</string>
    <key>ProgramArguments</key>
    <array>
      <string>sh</string>
      <string>-c</string>
      <string>launchctl setenv LANG en_US.UTF-8 && launchctl setenv LC_ALL en_US.UTF-8</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
  </dict>
  </plist>
  ```

  2. Load it once (and after reboot it will run again if you have `RunAtLoad`):

  ```bash
  launchctl load ~/Library/LaunchAgents/environment.utf8.plist
  ```

  3. **Restart Xcode** so it picks up the new environment.

- **Option B – One-off for current session**  
  Before opening Xcode, run in terminal:

  ```bash
  launchctl setenv LANG en_US.UTF-8
  launchctl setenv LC_ALL en_US.UTF-8
  ```

  Then start Xcode from that same terminal (e.g. `open -a Xcode`). This is not persistent across reboots.

**References:**

- [CocoaPods #11891 – Unicode Normalization not appropriate for ASCII-8BIT](https://github.com/CocoaPods/CocoaPods/issues/11891)
- [Stack Overflow – CocoaPods UTF-8](https://stackoverflow.com/questions/60522520/cocoa-pods-terminal-utf-8-encoding)
- [Setting environment variables for GUI apps on macOS](https://superuser.com/questions/476752/setting-environment-variables-in-os-x-for-gui-applications)

---

## 3. How to run and verify in this project

### One-time shell setup (recommended)

```bash
# Add to ~/.zshrc (and optionally ~/.profile, ~/.bash_profile):
export LANG=en_US.UTF-8
export LANGUAGE=en_US.UTF-8
export LC_ALL=en_US.UTF-8
```

Reload the shell: `source ~/.zshrc` or open a new terminal.

### Pod install

From project root:

```bash
# Option 1: script (sets UTF-8 and runs pod install)
./scripts/pod-install.sh

# Option 2: manually
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
cd ios && pod install
```

### Full iOS run

**Option A – Run from terminal (recommended)**  
Ensure UTF-8 is set (see “One-time shell setup” above), then:

```bash
cd /path/to/buffr-g2p
# Install pods once with UTF-8 (if not already done)
npm run ios:pod
# Run the app (Expo may run pod install again; UTF-8 must be in env)
npx expo run:ios
```

**Option B – Use Xcode**  
After `npm run ios:pod`, open the workspace and run:

```bash
cd /path/to/buffr-g2p
open ios/BuffrG2P.xcworkspace
```

Then in Xcode: select the simulator/device and press Run. If Xcode runs a script that invokes `pod install`, set UTF-8 via the LaunchAgent in section 2 (Option A) and restart Xcode.

Expo will run `pod install` under the hood when you use `npx expo run:ios`; if your terminal has the UTF-8 exports above, encoding errors should be gone. If you see `cannot load such file -- ./scripts/ios/autolinking_manager` or missing `expo-dev-client/ios`, run `npm run ios:pod` first, then open `ios/BuffrG2P.xcworkspace` in Xcode and run from there.

### If Xcode build runs `pod install` and still fails with encoding

Use the LaunchAgent in section 2 (Option A), then restart Xcode and rebuild.

---

## 4. Summary

| Issue | Cause | Fix in this repo |
|-------|--------|-------------------|
| `undefined method '[]' for nil` at Podfile line ~27 | `react-native config` returns `project: {}` | Podfile patch: run config from project root and set `project.ios.sourceDir` when missing |
| `Unicode Normalization ... ASCII-8BIT` | CocoaPods needs UTF-8; shell or Xcode env is not UTF-8 | Set `LANG`/`LANGUAGE`/`LC_ALL` in shell config; for Xcode use LaunchAgent or `launchctl setenv` |

The Podfile and `scripts/pod-install.sh` are already in place. You only need to set the UTF-8 environment variables (and optionally the LaunchAgent) as above.
