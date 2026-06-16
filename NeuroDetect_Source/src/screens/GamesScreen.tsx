import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { getSessionStatus } from '../utils/session';
import { Ionicons } from '@expo/vector-icons';

const GAMES = [
  { id: 'Game1', name: 'Series of 7s', icon: 'color-palette-outline', metric: 'Reaction Time' },
  { id: 'Game2', name: 'Memory Recall', icon: 'grid-outline', metric: 'Accuracy' },
  { id: 'Game3', name: 'Boston Naming', icon: 'apps-outline', metric: 'Hesitation' },
  { id: 'Game4', name: 'N-Back Test', icon: 'analytics-outline', metric: 'Working Memory' },
  { id: 'Game5', name: 'Trail Making', icon: 'mic-outline', metric: 'Speed' },
];

export default function GamesScreen() {
  const navigation = useNavigation<any>();
  const [status, setStatus] = useState<any>({
    todayDayNumber: 1,
    isTodayDone: false,
    isWeekDone: false,
    playedGamesToday: []
  });
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const data = await getSessionStatus();
    if (data) setStatus(data);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const { todayDayNumber, isTodayDone, isWeekDone, playedGamesToday } = status || {};


  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Day {todayDayNumber} Session</Text>
        <Text style={styles.headerSubtitle}>Tap a game to begin</Text>
      </View>

      {isTodayDone && !isWeekDone && (
        <View style={styles.doneContainer}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          <Text style={styles.doneText}>All done for today!</Text>
          <Text style={styles.doneSubText}>Come back tomorrow.</Text>
        </View>
      )}

      {isWeekDone && (
        <View style={styles.doneContainer}>
          <Ionicons name="trophy" size={48} color={colors.primary} />
          <Text style={styles.doneText}>7-Day Cycle Complete!</Text>
          <Text style={styles.doneSubText}>Check your comprehensive report.</Text>
        </View>
      )}

      <View style={styles.gridContainer}>
        {GAMES.map((game, index) => {
          const isPlayed = playedGamesToday?.includes(game.id);
          const isLocked = !isPlayed && isTodayDone; // Example logic

          return (
            <TouchableOpacity 
              key={game.id} 
              style={[styles.gameCard, isPlayed && styles.gameCardPlayed]}
              disabled={isPlayed || isLocked}
              onPress={() => navigation.navigate(game.id, { dayNumber: todayDayNumber })}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, isPlayed && styles.iconContainerPlayed]}>
                  <Ionicons name={game.icon as any} size={24} color={isPlayed ? '#FFF' : colors.primary} />
                </View>
                {isPlayed ? (
                  <View style={styles.badgePlayed}>
                    <Text style={styles.badgeTextPlayed}>Done</Text>
                  </View>
                ) : (
                  <View style={styles.badgePending}>
                    <Text style={styles.badgeTextPending}>Pending</Text>
                  </View>
                )}
              </View>
              
              <Text style={[styles.gameName, isPlayed && styles.gameNamePlayed]}>{game.name}</Text>
              
              <View style={styles.metricContainer}>
                <Ionicons name="pulse-outline" size={12} color={colors.textSecondary} />
                <Text style={styles.metricText}>Tracks: {game.metric}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  doneContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  doneText: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  doneSubText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gameCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#1A2B4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  gameCardPlayed: {
    opacity: 0.7,
    backgroundColor: '#F8FAFC',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerPlayed: {
    backgroundColor: colors.success,
  },
  badgePending: {
    backgroundColor: '#FFFBEA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  badgeTextPending: {
    color: colors.warning,
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  badgePlayed: {
    backgroundColor: '#EAF9EE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.success,
  },
  badgeTextPlayed: {
    color: colors.success,
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  gameName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: 8,
  },
  gameNamePlayed: {
    color: colors.textSecondary,
  },
  metricContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricText: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginLeft: 4,
  },
});
