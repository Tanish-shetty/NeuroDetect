import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Text, Platform } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';

import { initDB } from './src/db/database';
import { colors } from './src/theme/colors';
import { RootStackParamList } from './src/navigation/types';

import OnboardingScreen from './src/screens/OnboardingScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import Game1Screen from './src/screens/Game1Screen';
import Game2Screen from './src/screens/Game2Screen';
import Game3Screen from './src/screens/Game3Screen';
import Game4Screen from './src/screens/Game4Screen';
import Game5Screen from './src/screens/Game5Screen';
import ReportScreen from './src/screens/ReportScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Onboarding');
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    const setup = async () => {
      try {
        await initDB();
        let hasOnboarded = null;
        if (Platform.OS === 'web') {
          hasOnboarded = window.localStorage.getItem('hasOnboarded');
        } else {
          hasOnboarded = await Promise.race([
            AsyncStorage.getItem('hasOnboarded'),
            new Promise<null>(resolve => setTimeout(() => resolve(null), 500))
          ]);
        }
        
        if (hasOnboarded === 'true') {
          setInitialRoute('MainTabs');
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsReady(true);
      }
    };
    setup();
  }, []);

  if (!isReady || !fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName={initialRoute}
          screenOptions={{
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: { fontFamily: 'Inter_700Bold' },
            contentStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
          <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />
          <Stack.Screen name="Game1" component={Game1Screen} options={{ headerShown: false }} />
          <Stack.Screen name="Game2" component={Game2Screen} options={{ headerShown: false }} />
          <Stack.Screen name="Game3" component={Game3Screen} options={{ headerShown: false }} />
          <Stack.Screen name="Game4" component={Game4Screen} options={{ headerShown: false }} />
          <Stack.Screen name="Game5" component={Game5Screen} options={{ headerShown: false }} />
          <Stack.Screen name="Report" component={ReportScreen} options={{ title: 'Evaluation Report' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
