import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Safe timeout wrapper for AsyncStorage
const asyncStorageWithTimeout = async (key: string): Promise<string | null> => {
  return Promise.race([
    AsyncStorage.getItem(key),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 500))
  ]);
};

// Synchronous helper for web
const getStorageItemSync = (key: string): string | null => {
  if (Platform.OS === 'web') {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }
  return null;
};

// Set item helper
const setStorageItem = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {}
  } else {
    await AsyncStorage.setItem(key, value);
  }
};

const db = {
  getAllAsync: async (query: string, args: any[] = []) => {
    if (query.includes('SELECT * FROM users')) {
      let usersStr = getStorageItemSync('users');
      if (!usersStr && Platform.OS !== 'web') {
        usersStr = await asyncStorageWithTimeout('users');
      }
      const users = usersStr ? JSON.parse(usersStr) : [];
      if (users.length > 0) {
        return [users[users.length - 1]];
      }
      return [];
    } else if (query.includes('SELECT * FROM game_sessions')) {
      let sessionsStr = getStorageItemSync('game_sessions');
      if (!sessionsStr && Platform.OS !== 'web') {
        sessionsStr = await asyncStorageWithTimeout('game_sessions');
      }
      let sessions = sessionsStr ? JSON.parse(sessionsStr) : [];
      if (query.includes('WHERE userId = ?')) {
        sessions = sessions.filter((s: any) => s.userId === args[0]);
      }
      return sessions;
    }
    return [];
  },
  runAsync: async (query: string, args: any[]) => {
    if (query.includes('INSERT INTO users')) {
      let usersStr = getStorageItemSync('users');
      if (!usersStr && Platform.OS !== 'web') {
        usersStr = await asyncStorageWithTimeout('users');
      }
      const users = usersStr ? JSON.parse(usersStr) : [];
      const newUser = {
        id: users.length + 1,
        fullName: args[0],
        age: args[1],
        phone: args[2],
        sex: args[3],
        education: args[4],
        height: args[5],
        weight: args[6],
        createdAt: args[7]
      };
      users.push(newUser);
      await setStorageItem('users', JSON.stringify(users));
    } else if (query.includes('INSERT INTO game_sessions')) {
      let sessionsStr = getStorageItemSync('game_sessions');
      if (!sessionsStr && Platform.OS !== 'web') {
        sessionsStr = await asyncStorageWithTimeout('game_sessions');
      }
      const sessions = sessionsStr ? JSON.parse(sessionsStr) : [];
      const newSession = {
        id: sessions.length + 1,
        userId: args[0],
        dayNumber: args[1],
        date: args[2],
        gameName: args[3],
        metrics: args[4],
        createdAt: args[5]
      };
      sessions.push(newSession);
      await setStorageItem('game_sessions', JSON.stringify(sessions));
    }
  }
};

export const initDB = async () => {
  // No-op to prevent blocking
  return Promise.resolve();
};

export const getDB = () => {
  return db;
};
