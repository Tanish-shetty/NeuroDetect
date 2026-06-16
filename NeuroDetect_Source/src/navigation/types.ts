import { NavigatorScreenParams } from '@react-navigation/native';

export type BottomTabParamList = {
  Home: undefined;
  Games: undefined;
  Dashboard: undefined;
  Upload: undefined;
  Admin: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  MainTabs: NavigatorScreenParams<BottomTabParamList>;
  Game1: { dayNumber: number };
  Game2: { dayNumber: number };
  Game3: { dayNumber: number };
  Game4: { dayNumber: number };
  Game5: { dayNumber: number };
};
