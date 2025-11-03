import * as Linking from 'expo-linking';

const prefixes = [Linking.createURL('/'), 'europa://'];

const linking = {
    prefixes,
    config: {
      screens: {
        // Auth screens
        Login: 'login',
        ForgotPassword: 'forgot',
        ResetPassword: 'reset',
        MFAEnroll: 'mfa-enroll',
        MFAVerify: 'mfa-verify',
        // Main app screens - Tab navigator
        Home: {
          path: '',
          screens: {
            Manuals: 'manuals',
            ManualDetail: 'manual/:manualId',
            Section: 'section/:sectionId',
            Article: 'article/:articleId',
            PDF: 'pdf/:manualId',
          },
        },
        Search: 'search',
        Profile: 'profile',
      },
    },
};

export default linking;