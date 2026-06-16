import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDB } from '../db/database';

// Get user from DB or fallback to onboarding data stored in userData key
const getUser = async (): Promise<any | null> => {
  const db = getDB();
  const users = await db.getAllAsync('SELECT * FROM users ORDER BY id DESC LIMIT 1');
  if (users.length > 0) return users[0];

  // Fallback: read from the userData key saved during onboarding (web)
  let raw: string | null = null;
  if (Platform.OS === 'web') {
    raw = window.localStorage.getItem('userData');
  } else {
    raw = await AsyncStorage.getItem('userData');
  }
  if (!raw) return null;
  const data = JSON.parse(raw);
  // Synthesise a user object matching the DB schema
  return { id: 1, fullName: data.fullName, age: data.age, phone: data.phone, sex: data.sex, education: data.education };
};

export const getSessionStatus = async () => {
  const user = await getUser();
  if (!user) return null;

  const db = getDB();

  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Get all sessions – fall back to unfiltered list on web (userId may differ)
  let sessions = await db.getAllAsync(`
    SELECT * FROM game_sessions 
    WHERE userId = ? 
    ORDER BY id ASC
  `, [user.id]) as any[];

  // If no sessions found for userId 1 (web fallback), try fetching all sessions
  if (sessions.length === 0) {
    sessions = await db.getAllAsync(`SELECT * FROM game_sessions ORDER BY id ASC`) as any[];
  }

  let maxDay = 0;
  let playedTodayCount = 0;
  let todayDayNumber = 1;

  if (sessions.length > 0) {
    const lastSession = sessions[sessions.length - 1];
    maxDay = lastSession.dayNumber;
    
    // Check sessions for today
    const todaySessions = sessions.filter(s => s.date.startsWith(todayStr));
    playedTodayCount = todaySessions.length;

    if (todaySessions.length > 0) {
      todayDayNumber = maxDay;
    } else {
      todayDayNumber = maxDay < 7 ? maxDay + 1 : 7;
    }
  }

  // Calculate distinct days completed. A day is completed if 5 games are played that day.
  const dayGroups: Record<number, number> = {};
  sessions.forEach(s => {
    dayGroups[s.dayNumber] = (dayGroups[s.dayNumber] || 0) + 1;
  });

  let completedDaysCount = 0;
  for (let i = 1; i <= 7; i++) {
    if (dayGroups[i] === 5) {
      completedDaysCount++;
    }
  }

  const isTodayDone = playedTodayCount === 5;
  const isWeekDone = completedDaysCount === 7;

  // Games left to play today
  const playedGamesToday = sessions
    .filter(s => s.date.startsWith(todayStr))
    .map(s => s.gameName);

  return {
    user,
    todayDayNumber,
    completedDaysCount,
    isTodayDone,
    isWeekDone,
    playedGamesToday,
  };
};

export const saveGameSession = async (
  userId: number,
  dayNumber: number,
  gameName: string,
  metrics: object
) => {
  const db = getDB();
  const dateStr = new Date().toISOString();
  
  await db.runAsync(`
    INSERT INTO game_sessions (userId, dayNumber, date, gameName, metrics, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [userId, dayNumber, dateStr, gameName, JSON.stringify(metrics), dateStr]);
};
