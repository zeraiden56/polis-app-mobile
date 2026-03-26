// src/navigation/AppNavigator.tsx
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../screens/LoginScreen";
import ChangePasswordScreen from "../screens/ChangePasswordScreen";
import HomeScreen from "../screens/HomeScreen";
import TimesheetScreen from "../screens/TimesheetScreen";
import JustificationFormScreen from "../screens/JustificationFormScreen";
import JustificationsScreen from "../screens/JustificationsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SettingsScreen from "../screens/SettingsScreen";
import SelfiesDiaScreen from "../screens/SelfiesDiaScreen";

import { useAuth } from "../hooks/useAuth";

export type RootStackParamList = {
  Login: undefined;
  ChangePassword: undefined;
  Home: undefined;

  FolhaPonto: undefined;
  JustificarBatida: { data: string };
  Justificativas: undefined;

  Perfil: undefined;
  Config: undefined;

  SelfiesDia: { date: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { user, loading, mustChangePassword } = useAuth();

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* usuário NÃO logado */}
        {!user && (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}

        {/* logado, mas precisa trocar senha */}
        {user && mustChangePassword && (
          <Stack.Screen
            name="ChangePassword"
            component={ChangePasswordScreen}
          />
        )}

        {/* logado e liberado pra usar o app */}
        {user && !mustChangePassword && (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="FolhaPonto" component={TimesheetScreen} />
            <Stack.Screen
              name="JustificarBatida"
              component={JustificationFormScreen}
            />
            <Stack.Screen
              name="Justificativas"
              component={JustificationsScreen}
            />
            <Stack.Screen name="Perfil" component={ProfileScreen} />
            <Stack.Screen name="Config" component={SettingsScreen} />
            <Stack.Screen
              name="SelfiesDia"
              component={SelfiesDiaScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
