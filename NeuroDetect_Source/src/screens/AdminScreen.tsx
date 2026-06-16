import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { getSessionStatus } from '../utils/session';
import { getDB } from '../db/database';
import { Ionicons } from '@expo/vector-icons';

export default function AdminScreen() {
  const navigation = useNavigation<any>();
  const [user, setUser] = useState<any>(null);
  const [daysActive, setDaysActive] = useState(0);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const status = await getSessionStatus();
      if (status) {
        setUser(status.user);
        setDaysActive(status.completedDaysCount);
      }

      const db = getDB();
      const rawSessions = await db.getAllAsync('SELECT * FROM game_sessions ORDER BY dayNumber DESC, id DESC');
      const parsed = rawSessions.map((s: any) => ({
        ...s,
        metrics: JSON.parse(s.metrics)
      }));
      setSessions(parsed);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleReset = () => {
    Alert.alert(
      "Reset All Data",
      "Are you sure you want to delete all your progress and start from Day 1? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset", 
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.clear();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Onboarding' }],
            });
          }
        }
      ]
    );
  };

  const handleExport = () => {
    Alert.alert("Export", "CSV export functionality is mocked for now.");
  };

  // Group by day
  const daysMap: any = {};
  sessions.forEach(s => {
    if (!daysMap[s.dayNumber]) daysMap[s.dayNumber] = [];
    daysMap[s.dayNumber].push(s);
  });

  const sortedDays = Object.keys(daysMap).map(d => parseInt(d)).sort((a, b) => b - a);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Session Manager</Text>
      
      {user && (
        <Card style={styles.card}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.fullName.charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.userName}>{user.fullName}</Text>
              <Text style={styles.userInfo}>{user.age} yrs • {user.education}</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Days Active</Text>
              <Text style={styles.statValue}>{daysActive}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Games</Text>
              <Text style={styles.statValue}>{sessions.length}</Text>
            </View>
          </View>
        </Card>
      )}

      <Text style={styles.sectionTitle}>Past Sessions</Text>
      
      {sortedDays.length === 0 && (
        <Text style={styles.emptyText}>No sessions found.</Text>
      )}

      {sortedDays.map((day) => {
        const daySessions = daysMap[day];
        const isExpanded = expandedDay === day;
        const score = 85 + (day % 10); // Mock overall score
        const dateStr = daySessions[0].date.split('T')[0];

        return (
          <Card key={`day-${day}`} style={styles.sessionCard}>
            <TouchableOpacity 
              style={styles.sessionHeader} 
              onPress={() => setExpandedDay(isExpanded ? null : day)}
            >
              <View>
                <Text style={styles.sessionDay}>Day {day}</Text>
                <Text style={styles.sessionDate}>{dateStr}</Text>
              </View>
              <View style={styles.sessionHeaderRight}>
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreText}>Score: {score}</Text>
                </View>
                <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} style={{ marginLeft: 8 }} />
              </View>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.sessionDetails}>
                {daySessions.map((s: any, idx: number) => (
                  <View key={`s-${s.id}`} style={styles.gameDetailRow}>
                    <Text style={styles.gameName}>{s.gameName}</Text>
                    <View style={styles.metricsRow}>
                      {s.metrics.avgReactionTime && (
                        <Text style={styles.metricItem}>RT: {Math.round(s.metrics.avgReactionTime)}ms</Text>
                      )}
                      {s.metrics.accuracy && (
                        <Text style={styles.metricItem}>Acc: {Math.round(s.metrics.accuracy)}%</Text>
                      )}
                      {s.metrics.score && (
                        <Text style={styles.metricItem}>Score: {Math.round(s.metrics.score)}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>
        );
      })}

      <Text style={styles.sectionTitle}>Data Management</Text>
      <Card style={styles.card}>
        <Button 
          title="Export CSV" 
          type="secondary"
          onPress={handleExport} 
          style={{ marginBottom: 12 }}
        />
        <Button 
          title="Reset All Data" 
          type="danger"
          onPress={handleReset} 
        />
        <Text style={styles.warningText}>
          Warning: Resetting will permanently delete all session data.
        </Text>
      </Card>
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
  pageTitle: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    marginBottom: 24,
  },
  card: {
    marginBottom: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  userName: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  userInfo: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
    marginHorizontal: -4,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    marginBottom: 12,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginBottom: 24,
  },
  sessionCard: {
    marginBottom: 12,
    padding: 0,
    overflow: 'hidden',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sessionDay: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  sessionDate: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
  sessionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreBadge: {
    backgroundColor: '#EAF9EE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.success,
  },
  scoreText: {
    color: colors.success,
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  sessionDetails: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  gameDetailRow: {
    marginBottom: 12,
  },
  gameName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricItem: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  warningText: {
    color: colors.danger,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 12,
  }
});
