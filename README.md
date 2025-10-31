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

- Node.js 18+
- npm 9+ (or yarn/pnpm)
- Expo CLI (via `npx expo`)
- A Supabase project (URL + anon key)

## Environment

Create a `.env` file at the project root:

```env
SUPABASE_URL=<<your_supabase_url>>
SUPABASE_ANON_KEY=<<your_supabase_anon_key>>
```

Deep link:
- Scheme: `europa` (configured in `app.json`)
- Reset password redirect: `europa://reset` (add it to Supabase Auth redirect URLs)

Android:
- `app.json` includes `intentFilters` for the `europa` scheme.

## Getting Started

```bash
# 1) Install dependencies
npm install

# 2) Configure environment
#    Create .env with SUPABASE_URL and SUPABASE_ANON_KEY

# 3) (Recommended) Apply Supabase schema
#    Open supabase.sql in Supabase SQL Editor and execute

# 4) Start the app
npx expo start
# press i (iOS) or a (Android) to run on simulator
```

## Scripts

- `npm run start` — Start Expo/Metro
- `npm run ios` — Run on iOS
- `npm run android` — Run on Android
- `npm run web` — Run on web (limited support)

## Project Structure

env
SUPABASE_URL=<<your_supabase_url>>
SUPABASE_ANON_KEY=<<your_supabase_anon_key>>

Deep link:
- Scheme: `europa` (configured in `app.json`)
- Reset password redirect: `europa://reset` (add it to Supabase Auth redirect URLs)

Android:
- `app.json` includes `intentFilters` for the `europa` scheme.

## Getting Started

```bash
# 1) Install dependencies
npm install

# 2) Configure environment
#    Create .env with SUPABASE_URL and SUPABASE_ANON_KEY

# 3) (Recommended) Apply Supabase schema
#    Open supabase.sql in Supabase SQL Editor and execute

# 4) Start the app
npx expo start
# press i (iOS) or a (Android) to run on simulator
in: list factors -> create challenge -> verify code.
- UI/UX patterns:
  - Toasts for success/error; haptics for important feedback.
  - Skeletons for list and detail loading states.
  - Consistent Empty/Error components with retry options.
  - Tab bar includes accessible labels.
  - Achievement card uses only the cover image (no overlays or background icons); “Review” button stacked under the date.

## Troubleshooting

- Clear Metro cache:
  ```bash
  npx expo start --clear
  ```
- Android PDF not loading:
  - Ensure the PDF URL is publicly accessible.
- Password reset deep link:
  - Confirm `europa://reset` is allowed in Supabase Auth settings.
- Ionicons:
  - Use valid names (e.g., `checkmark-circle-outline`, `document-text-outline`, `time-outline`).

## Security

- `.env` is git-ignored; do not commit secrets.
- Supabase anon key and URL are environment-driven.
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

If you need a separate LICENSE file mirroring these terms, copy this section into a new `LICENSE` file at the repository root.