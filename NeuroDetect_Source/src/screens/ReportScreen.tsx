import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Share } from 'react-native';
import { colors } from '../theme/colors';
import { getDB } from '../db/database';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

import { getSessionStatus } from '../utils/session';

export default function ReportScreen() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const db = getDB();
      const sessions = await db.getAllAsync('SELECT * FROM game_sessions ORDER BY dayNumber ASC');
      
      // Parse metrics
      const parsedSessions = sessions.map((s: any) => ({
        ...s,
        metrics: JSON.parse(s.metrics)
      }));

      // Group by game
      const gamesData = {
        Game1: parsedSessions.filter(s => s.gameName === 'Game1'),
        Game2: parsedSessions.filter(s => s.gameName === 'Game2'),
        Game3: parsedSessions.filter(s => s.gameName === 'Game3'),
        Game4: parsedSessions.filter(s => s.gameName === 'Game4'),
        Game5: parsedSessions.filter(s => s.gameName === 'Game5'),
      };

      // Calculate trends
      // We will look at difference between first half and second half, or just Day 1 vs Day 7 (last available).
      let totalWorseningFactors = 0;
      let totalFactors = 0;
      
      const gameSummaries = [];
      const findings: any[] = [];

      const analyzeTrend = (gameName: string, metricKey: string, isHigherBetter: boolean, label: string) => {
        const data = gamesData[gameName as keyof typeof gamesData];
        if (data.length < 2) return null;
        
        const first = data[0].metrics[metricKey];
        const last = data[data.length - 1].metrics[metricKey];
        
        let percentChange = 0;
        if (first > 0) {
          percentChange = ((last - first) / first) * 100;
        }

        const isWorsening = isHigherBetter ? last < first : last > first;
        
        totalFactors++;
        if (isWorsening && Math.abs(percentChange) > 10) {
          totalWorseningFactors++;
          findings.push({ gameName, label, percentChange: Math.abs(percentChange).toFixed(0), isWorsening: true });
        } else if (!isWorsening && Math.abs(percentChange) > 10) {
          findings.push({ gameName, label, percentChange: Math.abs(percentChange).toFixed(0), isWorsening: false });
        }

        return { first, last, percentChange, isWorsening };
      };

      // Game 1
      const g1Trend = analyzeTrend('Game1', 'avgReactionTime', false, 'Reaction Time');
      if (g1Trend) gameSummaries.push({ name: 'MMSE Series of 7s', keyMetric: 'Reaction Time', trend: g1Trend, unit: 'ms' });
      analyzeTrend('Game1', 'accuracy', true, 'Accuracy');
      
      // Game 2
      const g2Trend = analyzeTrend('Game2', 'accuracy', true, 'Recall Accuracy');
      if (g2Trend) gameSummaries.push({ name: 'Memory Recall', keyMetric: 'Accuracy', trend: g2Trend, unit: '' });
      analyzeTrend('Game2', 'omissionErrors', false, 'Omission Errors');

      // Game 3
      const g3Trend = analyzeTrend('Game3', 'avgReactionTime', false, 'Reaction Time');
      if (g3Trend) gameSummaries.push({ name: 'Boston Naming Test', keyMetric: 'Reaction Time', trend: g3Trend, unit: 'ms' });

      // Game 4
      const g4Trend = analyzeTrend('Game4', 'accuracy', true, 'Match Accuracy');
      if (g4Trend) gameSummaries.push({ name: 'N-Back Test', keyMetric: 'Accuracy', trend: g4Trend, unit: '' });
      analyzeTrend('Game4', 'reactionTimeDrift', false, 'Fatigue / Drift');

      // Game 5
      const g5Trend = analyzeTrend('Game5', 'completionTime', false, 'Completion Time');
      if (g5Trend) gameSummaries.push({ name: 'Trail Making Test', keyMetric: 'Completion Time', trend: g5Trend, unit: 'ms' });

      // Risk Score
      // If 100% of factors are worsening > 10%, score is 100.
      let riskScore = 0;
      if (totalFactors > 0) {
        riskScore = (totalWorseningFactors / totalFactors) * 100;
        // add some base risk for age/etc later if needed, but keeping it simple based on trends.
      }
      // scale it a bit
      riskScore = Math.min(100, Math.max(0, riskScore * 1.5));

      // Sort findings by worsening
      findings.sort((a, b) => (b.isWorsening ? 1 : 0) - (a.isWorsening ? 1 : 0));

      setReportData({
        riskScore,
        gameSummaries,
        findings: findings.slice(0, 3) // Top 3
      });

      const status = await getSessionStatus();
      if (status && status.isWeekDone) {
        setIsUnlocked(true);
      } else {
        setIsUnlocked(false);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score <= 35) return colors.success;
    if (score <= 65) return colors.warning;
    return colors.danger;
  };

  const getRiskLabel = (score: number) => {
    if (score <= 35) return 'Low Risk';
    if (score <= 65) return 'Moderate Risk';
    return 'High Risk';
  };

  const handleShare = async () => {
    if (!reportData) return;
    const msg = `NeuroDetect Cognitive Report\nRisk Score: ${reportData.riskScore.toFixed(0)}/100 (${getRiskLabel(reportData.riskScore)})\n\nTop Findings:\n` + 
      reportData.findings.map((f: any) => `- ${f.label} in ${f.gameName} ${f.isWorsening ? 'declined' : 'improved'} by ${f.percentChange}%`).join('\n') +
      '\n\nNote: This is not a medical diagnosis.';
      
    try {
      await Share.share({ message: msg });
    } catch (error) {
      console.log(error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isUnlocked) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🔒</Text>
        <Text style={[styles.mainTitle, { textAlign: 'center' }]}>Report Locked</Text>
        <Text style={[styles.text, { textAlign: 'center', fontSize: 16 }]}>
          Complete all 7 days of your cognitive assessment cycle to unlock your full risk analysis report.
        </Text>
      </View>
    );
  }

  if (!reportData) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Not enough data to generate a report.</Text>
      </View>
    );
  }

  const { riskScore, gameSummaries, findings } = reportData;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.mainTitle}>7-Day Evaluation Report</Text>

      {/* SECTION 1 - Risk Score */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Overall Risk Indicator</Text>
        <View style={styles.gaugeContainer}>
          <Text style={[styles.scoreValue, { color: getRiskColor(riskScore) }]}>
            {riskScore.toFixed(0)}
          </Text>
          <Text style={[styles.scoreLabel, { color: getRiskColor(riskScore) }]}>
            {getRiskLabel(riskScore)}
          </Text>
        </View>
        <Text style={styles.disclaimerText}>
          Based on 7-day cognitive metric trends.
        </Text>
      </Card>

      {/* SECTION 3 - Key Findings */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Key Findings</Text>
        {findings.length > 0 ? findings.map((f: any, idx: number) => (
          <View key={idx} style={styles.findingRow}>
            <Text style={styles.findingIcon}>{f.isWorsening ? '⚠️' : '✅'}</Text>
            <Text style={styles.findingText}>
              Your {f.label} in {f.gameName.replace('Game', 'Game ')} 
              <Text style={{ fontWeight: 'bold', color: f.isWorsening ? colors.danger : colors.success }}>
                {' '}{f.isWorsening ? 'worsened' : 'improved'} by {f.percentChange}%
              </Text>
              {' '}over the week.
            </Text>
          </View>
        )) : (
          <Text style={styles.text}>Your metrics are stable.</Text>
        )}
      </Card>

      {/* SECTION 2 - Per Game Summary */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Per Game Summary</Text>
        {gameSummaries.map((g: any, idx: number) => (
          <View key={idx} style={styles.gameRow}>
            <Text style={styles.gameName}>{g.name}</Text>
            <View style={styles.gameStatsRow}>
              <Text style={styles.statText}>
                Day 1: {typeof g.trend.first === 'number' && g.trend.first > 100 ? (g.trend.first/1000).toFixed(1) + 's' : typeof g.trend.first === 'number' ? g.trend.first.toFixed(2) : g.trend.first}
              </Text>
              <Text style={styles.statText}> → </Text>
              <Text style={styles.statText}>
                Day 7: {typeof g.trend.last === 'number' && g.trend.last > 100 ? (g.trend.last/1000).toFixed(1) + 's' : typeof g.trend.last === 'number' ? g.trend.last.toFixed(2) : g.trend.last}
              </Text>
              <Text style={styles.trendIcon}>
                {Math.abs(g.trend.percentChange) < 5 ? '➡️' : (g.trend.isWorsening ? '📉' : '📈')}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      {/* SECTION 5 - Share */}
      <Button title="Export / Share Report" onPress={handleShare} style={styles.shareButton} />

      {/* SECTION 4 - Disclaimer */}
      <View style={styles.disclaimerBox}>
        <Text style={styles.medicalDisclaimer}>
          This is not a medical diagnosis. Please consult a neurologist or physician for clinical evaluation.
        </Text>
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
    padding: 24,
    paddingBottom: 40,
  },
  text: {
    color: colors.text,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  gaugeContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  disclaimerText: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
    marginTop: 10,
  },
  findingRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  findingIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  findingText: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  gameRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  gameName: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
  },
  gameStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  trendIcon: {
    fontSize: 18,
  },
  shareButton: {
    marginVertical: 16,
  },
  disclaimerBox: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#E6394620',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  medicalDisclaimer: {
    color: colors.danger,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
  }
});
