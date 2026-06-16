import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabParamList } from './types';
import { colors } from '../theme/colors';

import DashboardScreen from '../screens/DashboardScreen';
import GamesScreen from '../screens/GamesScreen';
import HistoryScreen from '../screens/HistoryScreen'; // Actually Dashboard
import UploadScreen from '../screens/UploadScreen';
import AdminScreen from '../screens/AdminScreen';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: 'Inter_700Bold' },
        tabBarStyle: { 
          backgroundColor: colors.card, 
          borderTopColor: colors.border,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 11, marginBottom: 4 },
        tabBarIcon: ({ color, size }) => {
          let iconName: any = 'home';

          if (route.name === 'Home') iconName = 'home-outline';
          else if (route.name === 'Games') iconName = 'game-controller-outline';
          else if (route.name === 'Dashboard') iconName = 'bar-chart-outline';
          else if (route.name === 'Upload') iconName = 'cloud-upload-outline';
          else if (route.name === 'Admin') iconName = 'shield-checkmark-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Games" component={GamesScreen} options={{ title: 'Games' }} />
      <Tab.Screen name="Dashboard" component={HistoryScreen} options={{ title: 'Reports' }} />
      <Tab.Screen name="Upload" component={UploadScreen} options={{ title: 'Upload' }} />
      <Tab.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin' }} />
    </Tab.Navigator>
  );
}
