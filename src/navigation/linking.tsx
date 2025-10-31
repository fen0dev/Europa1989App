import * as Linking from 'expo-linking';

const prefixes = [Linking.createURL('/'), 'europa://'];

export default {
    prefixes,
    config: {
      screens: {
        Login: 'login',
        ForgotPassword: 'forgot',
        ResetPassword: 'reset',
        MFAEnroll: 'mfa-enroll',
        MFAVerify: 'mfa-verify',
      },
    },
};