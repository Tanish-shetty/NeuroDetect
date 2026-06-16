import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { Card } from '../components/Card';
import { getSessionStatus } from '../utils/session';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: any;
};

export default function DashboardScreen({ navigation }: Props) {
  const [status, setStatus] = useState<any>({
    user: { fullName: 'User' },
    completedDaysCount: 0,
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

  const { user, completedDaysCount, playedGamesToday } = status || {};

  
  // Mock metrics
  const riskScore = 15; // out of 100
  const avgReactionTime = "420ms";
  const streakDays = completedDaysCount;

  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  const gamesList = [
    { id: '1', name: 'Stroop', icon: 'color-palette-outline' },
    { id: '2', name: 'N-Back', icon: 'grid-outline' },
    { id: '3', name: 'Corsi', icon: 'apps-outline' },
    { id: '4', name: 'Trails', icon: 'analytics-outline' },
    { id: '5', name: 'Words', icon: 'mic-outline' },
  ];

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.fullName || 'User'}</Text>
        <Text style={styles.dateText}>{todayDate}</Text>
      </View>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Cognitive Risk Score</Text>
        <View style={styles.gaugeContainer}>
          <View style={styles.gaugeOuter}>
            <View style={styles.gaugeInner}>
              <Text style={styles.gaugeValue}>{riskScore}</Text>
              <Text style={styles.gaugeLabel}>Low Risk</Text>
            </View>
          </View>
        </View>
        <Text style={styles.cardSubtitle}>Based on recent baseline performance</Text>
      </Card>

      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>7-Day Progress</Text>
          <Text style={styles.progressText}>{completedDaysCount}/7 Days</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: `${(completedDaysCount / 7) * 100}%` }]} />
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Today's Games Status</Text>
        <View style={styles.gameIconsRow}>
          {gamesList.map((g) => {
            const isPlayed = playedGamesToday?.includes(`Game${g.id}`);
            return (
              <View key={g.id} style={styles.gameStatusItem}>
                <View style={[styles.gameIconCircle, isPlayed && styles.gameIconCirclePlayed]}>
                  <Ionicons name={g.icon as any} size={20} color={isPlayed ? '#FFF' : colors.textSecondary} />
                  {isPlayed && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={10} color="#FFF" />
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </Card>

      <View style={styles.quickStatsRow}>
        <Card style={[styles.card, styles.halfCard]}>
          <Ionicons name="flame" size={24} color={colors.warning} />
          <Text style={styles.statValue}>{streakDays}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </Card>
        <Card style={[styles.card, styles.halfCard]}>
          <Ionicons name="timer" size={24} color={colors.secondary} />
          <Text style={styles.statValue}>{avgReactionTime}</Text>
          <Text style={styles.statLabel}>Avg RT</Text>
        </Card>
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
  greeting: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  card: {
    marginBottom: 16,
  },
  halfCard: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: 12,
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  gaugeOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 10,
    borderColor: '#E2E8F0',
    borderTopColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeInner: {
    alignItems: 'center',
  },
  gaugeValue: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  gaugeLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.success,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 5,
  },
  gameIconsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  gameStatusItem: {
    alignItems: 'center',
  },
  gameIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F4F8',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gameIconCirclePlayed: {
    backgroundColor: colors.primary,
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.success,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -4,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    marginTop: 8,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
});
