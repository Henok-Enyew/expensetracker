<p align="center">
  <img src="./assets/images/icon.png" alt="Birr Track" width="120" height="120" />
</p>

<h1 align="center">Birr Track</h1>
<p align="center">
  <strong>A modern expense tracker built for Ethiopian users</strong>
</p>
<p align="center">
  Track spending, manage bank accounts, import SMS transactions, monitor loans & debts, and visualize your finances with animated analytics.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React%20Native-0.81-61dafb?style=flat-square&logo=react" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo-SDK%2054-000020?style=flat-square&logo=expo" alt="Expo" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Platform-Android-3ddc84?style=flat-square&logo=android" alt="Android" />
</p>

---

## ✨ Features

### 💰 Core

- **Transaction Management** — Add income and expenses manually, categorize them (14+ built-in categories), and choose payment methods.
- **Bank Accounts** — Link multiple Ethiopian bank accounts (CBE, Telebirr, Awash, Dashen, BOA, Abay, Amhara, and more). View balances and per-bank transaction history.
- **Budget Tracking** — Set daily, weekly, monthly, or yearly budgets per category. Fixed-size period tabs (Daily / Weekly / Monthly / Yearly) with budget count; real-time progress bars for spending vs. limit.
- **Friends & Loans** — Track money lent and borrowed per friend. Add photos, phone numbers, and notes. See net balance per friend at a glance.

### 📱 Home & Privacy

- **Balance Overview** — Total balance, monthly income/expense, and net with friends on a gradient card.
- **Hide/Show Amounts** — Tap the eye icon to hide or reveal all amounts (default: hidden with ••••••) for privacy on the home screen.
- **Today’s Summary** — Quick view of today’s income and expense totals above recent transactions.

### 📤 Export

- **PDF Export** — Export all transactions as a **PDF file** (not CSV). Includes:
  - **Birr Track** logo and title in a styled header
  - Summary cards: Total Balance, Net (incl. friends), Transaction count, Total Income, Total Expense
  - Full transactions table (Date, Type, Amount, Category, Description, Payment)
  - Same summary repeated in the footer
  Share or save the PDF from the app (expo-print + expo-sharing).

### 📲 SMS Integration (Android)

- **Automatic Inbox Scanning** — Tap “Scan & Import” on any bank detail screen to read your SMS inbox, parse bank messages, create transactions, and update balances.
- **Real-Time Listener** — Enable auto-import per bank to catch new SMS and import them as transactions instantly.
- **Smart Parsing** — Custom parsers for CBE, Telebirr, and Bank of Abyssinia with a generic fallback. Handles credits, debits, transfers, fees, VAT, and balance extraction.
- **Deduplication** — SMS-based transactions are deduped by content hash and ID to prevent double-imports.

### 📊 Analytics Dashboard

- **Contribution Heatmap** — GitHub-style daily activity grid. Green for net income days, red for net expense days, with intensity by amount.
- **Animated Bar Charts** — Income vs. expense by time period (hourly, weekly, monthly) with spring-animated bars.
- **Spending Flow Chart** — Animated line chart for cumulative net spending/income over time.
- **Quick Insights** — Saving streak, average daily spending, best saving day, and today’s transaction count.
- **Period Selector** — Switch between daily, monthly, and yearly views.

### 🔒 Security

- **App Lock** — Lock the app with biometrics (fingerprint/face) or a 4–6 digit PIN.
- **Background Lock** — Locks when the app goes to the background; shows lock screen again when you return (no bypass from cache).
- **Loading Gate** — Security state loads before showing the main app, so the lock screen is never skipped on cold start.
- **Smart Suppression** — Lock is temporarily suppressed during in-app actions (e.g. image picking) so it doesn’t interrupt the flow.

### 🎨 Design

- **Dark & Light Mode** — Full theme support with a custom purple palette (`#45234E`, `#927C9C`, `#C2B5BF`, `#E7DBE9`). System preference or manual toggle.
- **Rubik Font** — Clean typography (Regular, Medium, SemiBold, Bold).
- **Ionicons** — Outlined/filled icon system for navigation and UI.
- **Card Design** — Color-coded cards (green income, red expense, bank brand colors) with soft borders.

---

## 🛠 Tech Stack

| Layer       | Technology                                                                 |
|------------|-----------------------------------------------------------------------------|
| Framework  | React Native 0.81 + Expo SDK 54                                            |
| Language   | TypeScript 5.9                                                             |
| Navigation | Expo Router (file-based, tab layout)                                       |
| Storage    | AsyncStorage (local-first, no backend required)                            |
| Animations | React Native Reanimated 4 + React Native SVG                                |
| Auth       | expo-local-authentication (biometric) + expo-secure-store (PIN)           |
| PDF Export| expo-print (HTML → PDF) + expo-sharing                                     |
| SMS        | Custom Expo native module (`modules/sms-inbox`) — inbox + BroadcastReceiver |
| Fonts      | `@expo-google-fonts/rubik`                                                 |
| Icons      | `@expo/vector-icons` (Ionicons)                                            |

---

## 📁 Project Structure

```
app/
  _layout.tsx                 # Root layout, font loading, providers, lock gate
  (tabs)/
    _layout.tsx               # Tab bar configuration
    index.tsx                 # Home — balance card, today summary, recent transactions
    transactions.tsx          # Full transaction list with filters
    analytics.tsx             # Charts, heatmap, insights dashboard
    budget.tsx                # Budget overview, period tabs, progress bars
    friends.tsx               # Friends/loans list
    settings.tsx              # Theme, security, SMS, PDF export
  add-transaction.tsx         # Add/edit transaction form
  add-bank.tsx                # Add bank account
  bank-detail.tsx             # Bank detail — SMS scan & import
  add-budget.tsx              # Add/edit budget
  add-friend.tsx              # Add friend with photo
  friend-detail.tsx           # Friend detail — loan history
  about.tsx                   # About — app info, developer intro

components/
  BalanceCard.tsx             # Gradient card (balance, income, expense, hide/show)
  TransactionItem.tsx         # Single transaction row
  BankAccountCard.tsx         # Bank account summary card
  BudgetProgressBar.tsx       # Budget usage bar
  CategoryPicker.tsx          # Category selection grid
  ContributionHeatmap.tsx    # Daily activity heatmap
  AnimatedBarChart.tsx       # Animated income vs expense bars
  SpendingFlowChart.tsx      # Cumulative line chart
  SpendingStreakCard.tsx     # Quick insight cards
  AppLockScreen.tsx          # Biometric/PIN lock overlay
  SmsListenerProvider.tsx    # Global SMS listener

contexts/
  AppContext.tsx              # Global state: transactions, banks, budgets, categories
  ThemeContext.tsx            # Theme mode, color palette
  SecurityContext.tsx         # App lock, biometric, PIN, resume lock

lib/
  types.ts                    # Transaction, BankAccount, Budget, Friend, etc.
  storage.ts                  # AsyncStorage CRUD, dedup tracking
  utils.ts                    # Currency, dates, ID generation
  security.ts                 # PIN hashing, secure storage
  pdfExport.ts                # PDF HTML builder (logo, summary, table)
  query-client.ts             # TanStack Query client
  sms/                        # Parsers, sync, listener, inbox

modules/
  sms-inbox/                  # Expo native module (Android SMS reader)
```

---

## 🏦 Supported Banks

| Bank                          | SMS Parser | Logo |
|-------------------------------|------------|------|
| Commercial Bank of Ethiopia   | Custom     | Yes  |
| Telebirr (Ethio Telecom)      | Custom     | Yes  |
| Bank of Abyssinia             | Custom     | Yes  |
| Awash, Dashen, Abay, Amhara   | Generic    | Yes  |
| Cooperative Bank of Oromia, Nib, Wegagen, United, Bunna, M-Pesa, Enat | Generic | — |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm  
- **Android SDK** (API 24+) with platform-tools  
- **Java JDK** 17+  
- Physical Android device or emulator  

### Install & run

```bash
git clone <repo-url>
cd "Expense tracker"
npm install
npx expo run:android
```

### Run with Expo Dev Client

```bash
npx expo start --dev-client
```

### Build for production (EAS)

```bash
npm install -g eas-cli
eas build --platform android --profile production   # AAB for Play Store
eas build --platform android --profile preview      # APK for testing
```

Release output:

- **AAB:** Download from [expo.dev](https://expo.dev) → your project → Builds (for Play Store).
- **APK (local):** `npx expo run:android --variant release` → `android/app/build/outputs/apk/release/app-release.apk`.

---

## 🌍 Environment (Fedora / Linux)

```bash
sudo dnf install java-17-openjdk-devel
# Android SDK: https://developer.android.com/studio#command-tools

export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
```

---

## 📄 SMS Import Flow

```
User taps "Scan & Import" on Bank Detail
  → Check READ_SMS permission
  → Read inbox (SmsInbox module), filter by bank senders
  → Parse with bank-specific or generic parser
  → Create transactions (dedup by hash + ID), update balance
  → Show result summary
```

---

## 👤 About

**Birr Track** is built by **Henok Enyew** (Software Engineer). For bug reports and feature requests, reach out via [henokenyew.me](https://henokenyew.me).

---

<p align="center">
  <strong>© 2026 Ethiopia. All rights reserved.</strong>
</p>
