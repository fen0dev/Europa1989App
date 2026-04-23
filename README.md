# Europa Manuals App

A mobile app (Expo/React Native) for browsing technical manuals, completing quick-check quizzes, tracking completion, and managing user profiles. Authentication is powered by Supabase (including TOTP MFA). The app focuses on robust UI/UX: consistent feedback via toasts, skeleton loaders, accessible navigation, and clear empty/error states.

## Features

- Authentication (Supabase)
  - Email/password sign-in
  - Password recovery and deep-link reset (`europa://reset`)
  - MFA TOTP (enroll with QR, verify with 6-digit codes)
- Manuals
  - Manuals list filtered by completion status
  - Manual details with sections and articles
  - PDF viewing via WebView (Google Viewer on Android)
  - Quick-check quizzes to complete manuals
  - Article read tracking
- Progress
  - Achievements (list of completed manuals) with clean, cover-only cards
- Profile
  - View/update user info, upload profile picture, logout
- Admin (role-gated)
  - Content management flows for manuals, sections, articles, quizzes, and moderation (see `src/navigation/admin/`)
- Notifications
  - In-app notification center and optional Expo push tokens (physical device; see environment variables)
- UI/UX
  - Toast/snackbar provider with haptic feedback
  - Skeleton loaders for perceived performance
  - Reusable Empty/Error states with retry actions
  - Accessible tab bar with labels and proper hints
  - Centralized theme tokens (colors, spacing, radii, shadows)

## Tech Stack

- Expo ~54 / React Native 0.81.5 / React 19
- React Navigation 7 (Native Stack + Bottom Tabs)
- @tanstack/react-query v5
- Supabase JS v2 (auth, TOTP MFA, storage)
- react-native-webview, Safe Area, LinearGradient, BlurView, Haptics
- Ionicons (via @expo/vector-icons)

## Requirements

- **Node.js** 18.x or 20.x LTS (recommended: current LTS)
- **npm** 9+ (or a compatible package manager)
- **Expo CLI** via `npx expo` (no global install required)
- A **Supabase** project (project URL + anon public key)
- For **iOS Simulator** (macOS): Xcode from the App Store
- For **Android Emulator**: Android Studio (SDK, platform tools, a virtual device)

## Development environment setup

### 1. Clone and install

```bash
git clone <repository-url>
cd Europa1989App
npm install
```

Use the same Node major version across the team to avoid native dependency drift. Tools like [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) help pin Node locally.

### 2. Environment variables

Create a `.env` file in the project root (it is git-ignored). The app reads **public** Expo variables at build/bundle time:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Optional — required for **Expo push token** registration on a physical device (`getExpoPushTokenAsync`):

```env
EXPO_PUBLIC_PROJECT_ID=your_eas_or_expo_project_id
```

If these are missing, `src/lib/env.ts` throws on startup listing the absent keys. After changing `.env`, restart Metro (`npx expo start`).

### 3. Supabase project configuration

- In the Supabase dashboard, enable Email auth (and any providers you use).
- Under **Authentication → URL configuration**, add the redirect URL for password reset: `europa://reset` (see `src/navigation/linking.tsx` and `app.json` scheme `europa`).
- Create the database schema, RLS policies, and storage buckets your deployment expects. This repository does not ship a root-level `supabase.sql`; local SQL drafts may live under `database/` (see `.gitignore`). Apply migrations in the Supabase SQL editor or your usual migration workflow.

### 4. Run the app

```bash
npx expo start
```

From the Expo CLI UI:

- Press **`i`** — open iOS Simulator (macOS + Xcode)
- Press **`a`** — open Android Emulator (AVD must be running or device connected)
- Scan the QR code with **Expo Go** on a physical device (same network as the dev machine)

Useful variants:

```bash
npm run start    # same as expo start
npm run ios      # expo start --ios
npm run android  # expo start --android
npm run web      # web preview (feature support may be limited)
```

### 5. Platform notes

- **iOS**: First-time setup may require opening Xcode once to accept licenses and install components. Push notifications and some device APIs need a **physical iPhone** or a custom dev client, not only the simulator.
- **Android**: Ensure `ANDROID_HOME` is set and an emulator image is installed. The app declares an `europa` URL scheme in `app.json` for deep links.
- **New Architecture**: `app.json` sets `newArchEnabled: true` for Expo’s React Native new architecture flag.

## Project structure

- `App.tsx` — Session and onboarding gate; wraps navigation with React Query, toasts, and (when authenticated) notification service setup.
- `index.ts` — Expo entry (`registerRootComponent`).
- `src/navigation/` — Linking config, auth stack, root tabs (`RootTabs`), manuals stack (`ManualStack`), admin stack (`AdminStack`).
- `src/screens/` — Feature screens (login/MFA, manuals, PDF, profile, achievements, admin, onboarding, shared empty/error/toast UI).
- `src/api/` — Supabase-backed API modules (manuals, quiz, profile, admin, notifications, notes, achievements).
- `src/lib/` — `env` validation, Supabase client, secure storage adapter, query client, notification helpers.
- `src/hooks/` — Admin check, forms, notifications, pagination, onboarding storage.
- `src/theme/` — Design tokens (`tokens.tsx`).
- `assets/` — Icons and splash images referenced from `app.json`.

## Scripts

- `npm run start` — Start Expo/Metro
- `npm run ios` — Run on iOS
- `npm run android` — Run on Android
- `npm run web` — Run on web (limited support)

## Troubleshooting

- Clear Metro cache:

  ```bash
  npx expo start --clear
  ```

- **Startup error about missing `EXPO_PUBLIC_*`**: Confirm `.env` names match exactly and restart Expo.
- **Android PDF not loading**: Ensure the PDF URL is publicly accessible.
- **Password reset deep link**: Confirm `europa://reset` is allowed in Supabase Auth settings.
- **Ionicons**: Use valid names (e.g., `checkmark-circle-outline`, `document-text-outline`, `time-outline`).

## Security

- `.env` is git-ignored; do not commit secrets.
- Supabase anon key and URL are environment-driven (public client key; security relies on RLS and auth).
- TOTP MFA recommended for all users.

## License

This project is an MVP (Minimum Viable Product). Until the app is fully developed and the agreed payment is completed, all intellectual property and ownership rights in the codebase and deliverables remain the sole property of the Author/Developer: Fen0dev.

During the MVP phase and prior to full payment:

- Europa 1989 is granted a limited, non-exclusive, non-transferable, revocable license to use the code internally for evaluation, testing, and continued development purposes only.
- No production use, redistribution, sublicensing, public release, or reselling is permitted.
- All copyright and proprietary notices must be preserved.

Upon completion of development and receipt of full payment:

- All right, title, and interest in the deliverables (including source code authored for this project, excluding third‑party libraries and dependencies) shall be assigned to and owned by Europa1989.
- The Author/Developer will, upon request, execute any reasonable documents necessary to effectuate such assignment.

Disclaimer:

- The software is provided “AS IS” without warranties of any kind, express or implied, including but not limited to merchantability, fitness for a particular purpose, and non‑infringement.
- In no event shall the Author/Developer be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from or in connection with the software or its use.
