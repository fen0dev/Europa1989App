import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../../screens/login/LoginScreen";
import ForgotPasswordScreen from '../../screens/login/ForgotPasswordScreen';
import ResetPasswordScreen from '../../screens/login/ResetPasswordScreen';
import MFAEnrollScreen from '../../screens/login/MFAEnrollScreen';
import MFAVerifyScreen from '../../screens/login/MFAVerifyScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="MFAEnroll" component={MFAEnrollScreen} />
        <Stack.Screen name="MFAVerify" component={MFAVerifyScreen} />
      </Stack.Navigator>
    );
}