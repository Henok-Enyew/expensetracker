# Birr Track

**A modern expense tracker built for Ethiopian users** — track spending, manage bank accounts, import SMS transactions, monitor loans & debts, and visualize your finances with animated analytics.

Built with React Native + Expo (SDK 54), TypeScript, and local-first storage.

---

## Features

### Core

- **Transaction Management** — Add income and expenses manually, categorize them (14 built-in categories), and choose payment methods.
- **Bank Accounts** — Link multiple Ethiopian bank accounts (CBE, Telebirr, Awash, Dashen, BOA, Abay, Amhara, and more). View balances and per-bank transaction history.
- **Budget Tracking** — Set monthly budgets per category with real-time progress bars showing spending vs. limit.
- **Friends & Loans** — Track money lent and borrowed per friend. Add photos, phone numbers, and notes. See net balance per friend at a glance.

### SMS Integration (Android)

- **Automatic Inbox Scanning** — Tap "Scan & Import" on any bank detail screen to read your SMS inbox, automatically parse bank transaction messages, create transactions, and update your balance.
- **Real-Time Listener** — Enable auto-import per bank to catch new incoming SMS in real-time and import them as transactions instantly.
- **Smart Parsing** — Custom parsers for CBE, Telebirr, and Bank of Abyssinia with a generic fallback for other banks. Handles credits, debits, transfers, fees, VAT, and balance extraction.
- **Deduplication** — SMS-based transactions are deduped by both content hash and ID to prevent double-imports.

### Analytics Dashboard

- **Contribution Heatmap** — GitHub-style daily activity grid. Green for net income days, red for net expense days, with intensity based on amount.
- **Animated Bar Charts** — Income vs. expense breakdowns by time period (hourly, weekly, monthly) with spring-animated bars.
- **Spending Flow Chart** — Animated line chart showing cumulative net spending/income trends over time.
- **Quick Insights** — Saving streak, average daily spending, best saving day, and today's transaction count.
- **Period Selector** — Switch between daily, monthly, and yearly views across all charts and metrics.

### Security

- **App Lock** — Lock the app with biometric authentication (fingerprint/face) or a 4–6 digit PIN.
- **Background Lock** — Automatically locks when the app goes to the background; requires authentication on return.
- **Smart Suppression** — Lock is temporarily suppressed during in-app actions like image picking so it doesn't interrupt the user.

### Design

- **Dark & Light Mode** — Full theme support with a custom purple-toned palette (`#45234E`, `#927C9C`, `#C2B5BF`, `#E7DBE9`). Follows system preference or manual toggle.
- **Rubik Font Family** — Clean, modern typography throughout (Regular, Medium, SemiBold, Bold).
- **Outlined Icon System** — Ionicons with outlined/filled states for navigation and UI elements.
- **Subtle Card Design** — Color-coded cards with tinted backgrounds and soft borders (green for income, red for expense, bank brand colors).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.81 + Expo SDK 54 |
| Language | TypeScript 5.9 |
| Navigation | Expo Router (file-based, tab layout) |
| Storage | AsyncStorage (local-first, no backend required) |
| Animations | React Native Reanimated 4 + React Native SVG |
| Auth | expo-local-authentication (biometric) + expo-secure-store (PIN) |
| SMS | Custom Expo native module (`modules/sms-inbox`) — inbox reading + real-time BroadcastReceiver |
| Fonts | `@expo-google-fonts/rubik` |
| Icons | `@expo/vector-icons` (Ionicons) |

---

## Project Structure

```
app/
  _layout.tsx                 # Root layout, font loading, global providers
  (tabs)/
    _layout.tsx               # Tab bar configuration
    index.tsx                 # Home — balance card, recent transactions, bank accounts
    transactions.tsx          # Full transaction list with filters
    analytics.tsx             # Charts, heatmap, insights dashboard
    budget.tsx                # Budget overview and progress bars
    friends.tsx               # Friends/loans list
    settings.tsx              # Theme, security, SMS permissions, export
  add-transaction.tsx         # Add/edit transaction form
  add-bank.tsx                # Add bank account
  bank-detail.tsx             # Bank detail — SMS scan & import, transaction list
  add-budget.tsx              # Add/edit budget
  add-friend.tsx              # Add friend with photo
  friend-detail.tsx           # Friend detail — loan history

components/
  BalanceCard.tsx             # Gradient overview card (income, expense, balance)
  TransactionItem.tsx         # Single transaction row
  BankAccountCard.tsx         # Bank account summary card
  PieChart.tsx                # Category breakdown pie chart
  BudgetProgressBar.tsx       # Budget usage bar
  CategoryPicker.tsx          # Category selection grid
  ContributionHeatmap.tsx     # GitHub-style daily activity heatmap
  AnimatedBarChart.tsx        # Animated income vs. expense bars
  SpendingFlowChart.tsx       # Animated cumulative line chart
  SpendingStreakCard.tsx      # Quick insight cards with animations
  AppLockScreen.tsx           # Biometric/PIN lock overlay
  SmsListenerProvider.tsx     # Global SMS listener mount point

contexts/
  AppContext.tsx               # Global state: transactions, banks, budgets, categories
  ThemeContext.tsx              # Theme mode, color palette, dark/light colors
  SecurityContext.tsx           # App lock state, biometric, PIN, suppress logic

hooks/
  useSmsPermission.ts          # Android SMS permission management
  useSmsListener.ts            # Global SMS listener lifecycle

lib/
  types.ts                     # TypeScript interfaces (Transaction, BankAccount, Budget, Friend, etc.)
  storage.ts                   # AsyncStorage CRUD operations, dedup tracking
  utils.ts                     # Currency formatting, date helpers, ID generation
  security.ts                  # PIN hashing, secure storage operations
  query-client.ts              # TanStack Query client
  sms/
    parser.ts                  # Per-bank SMS parsers (CBE, Telebirr, BOA, generic)
    sync.ts                    # SMS → Transaction creation, balance updates, dedup
    listener.ts                # Real-time SMS listener (Android)
    service.ts                 # SMS orchestration, permission checks
    inbox.ts                   # Inbox scanner — bulk read, parse, sync

modules/
  sms-inbox/                   # Local Expo native module
    index.ts                   # JS interface
    expo-module.config.json    # Module config
    android/
      build.gradle
      src/main/java/.../SmsInboxModule.kt   # Android ContentResolver SMS reader

constants/
  banks.ts                     # Bank definitions (14 Ethiopian banks with logos/colors)
  categories.ts                # Default expense/income categories
  colors.ts                    # Static color fallbacks
  smsBankShortcodes.ts         # Bank SMS sender IDs and shortcode mappings
```

---

## Supported Banks

| Bank | SMS Parser | Logo |
|------|-----------|------|
| Commercial Bank of Ethiopia (CBE) | Custom | Yes |
| Telebirr (Ethio Telecom) | Custom | Yes |
| Bank of Abyssinia (BOA) | Custom | Yes |
| Awash Bank | Generic | Yes |
| Dashen Bank | Generic | Yes |
| Abay Bank | Generic | Yes |
| Amhara Bank | Generic | Yes |
| Cooperative Bank of Oromia | Generic | — |
| Nib International Bank | Generic | — |
| Wegagen Bank | Generic | — |
| United Bank | Generic | — |
| Bunna International Bank | Generic | — |
| M-Pesa | Generic | — |
| Enat Bank | Generic | — |

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Android SDK** (API 24+) with platform-tools
- **Java JDK** 17+
- A physical Android device or emulator

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd "Expense tracker"

# Install dependencies
npm install
```

### Running on Android (Physical Device)

1. **Enable Developer Options** on your phone:
   - Go to Settings > About Phone > tap "Build Number" 7 times

2. **Enable USB Debugging**:
   - Settings > Developer Options > USB Debugging > ON

3. **Connect via USB** and verify:
   ```bash
   adb devices
   # Should show your device listed
   ```

4. **Run the app**:
   ```bash
   npx expo run:android
   ```
   This generates the native Android project (if needed) and installs the app on your device.

### Running with Expo Dev Client

```bash
npx expo start --dev-client
```

### Building for Production (EAS)

```bash
# Install EAS CLI
npm install -g eas-cli

# Build APK
eas build --platform android --profile preview
```

---

## Environment Setup (Fedora / Linux)

```bash
# Install Java JDK
sudo dnf install java-17-openjdk-devel

# Download Android SDK command-line tools
# https://developer.android.com/studio#command-tools

# Set environment variables (add to ~/.bashrc or ~/.zshrc)
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/emulator

# Accept licenses
sdkmanager --licenses

# Install required SDK components
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
```

---

## SMS Import Flow

```
User taps "Scan & Import" on Bank Detail screen
  │
  ├─ Check READ_SMS permission (request if needed)
  │
  ├─ Read SMS from device inbox (via SmsInbox native module)
  │   └─ Filters by date (since last sync or 90 days)
  │
  ├─ Filter SMS by bank sender address
  │   ├─ Known bank senders (e.g. "CBE", "Telebirr")
  │   └─ Shared shortcodes (e.g. "8990") → auto-detect bank from body
  │
  ├─ Parse each SMS with bank-specific parser
  │   ├─ Extract: direction, amount, fees, balance, date, description
  │   └─ Generate unique SMS ID for deduplication
  │
  ├─ Create Transaction records (with body-hash + ID-based dedup)
  │   ├─ Main transaction (income/expense)
  │   └─ Fee transaction (if service charge + VAT present)
  │
  ├─ Update bank account balance (from latest SMS balance)
  │
  └─ Display result summary
```

---

## License

Private project. All rights reserved.
