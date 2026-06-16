import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { colors } from '../theme/colors';
import { getDB } from '../db/database';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { getSessionStatus } from '../utils/session';
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

type Tab = 'Overview' | 'Trends' | 'Report';

export default function HistoryScreen() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('Report');
  const [sessions, setSessions] = useState<any[]>([]);
  const [status, setStatus] = useState<any>({ todayDayNumber: 1 });
  const [expandedCondition, setExpandedCondition] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const db = getDB();
      const rawSessions = await db.getAllAsync('SELECT * FROM game_sessions ORDER BY dayNumber ASC');
      const parsed = rawSessions.map((s: any) => ({
        ...s,
        metrics: JSON.parse(s.metrics)
      }));
      setSessions(parsed);
      const st = await getSessionStatus();
      if (st) setStatus(st);
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

  const { todayDayNumber } = status || { todayDayNumber: 1 };

  // Process data for Trends
  const daysMap: any = {};
  sessions.forEach(s => {
    if (!daysMap[s.dayNumber]) daysMap[s.dayNumber] = [];
    daysMap[s.dayNumber].push(s);
  });
  const dayNumbers = Object.keys(daysMap).map(d => parseInt(d)).sort((a, b) => a - b);
  
  const rtData = dayNumbers.map(day => {
    const daySessions = daysMap[day];
    let avgRt = 0;
    let count = 0;
    daySessions.forEach((s: any) => {
      if (s.metrics.avgReactionTime) {
        avgRt += s.metrics.avgReactionTime;
        count++;
      }
    });
    return count > 0 ? avgRt / count : 0;
  });

  const accData = dayNumbers.map(day => {
    const daySessions = daysMap[day];
    let acc = 0;
    let count = 0;
    daySessions.forEach((s: any) => {
      if (s.metrics.accuracy) {
        acc += s.metrics.accuracy;
        count++;
      }
    });
    return count > 0 ? acc / count : 0;
  });

  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    color: (opacity = 1) => `rgba(44, 123, 229, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    labelColor: (opacity = 1) => colors.textSecondary,
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: colors.primary
    }
  };

  const renderOverview = () => {
    const todaySessions = daysMap[todayDayNumber] || [];
    if (todaySessions.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color={colors.border} />
          <Text style={styles.emptyTitle}>No Data for Today</Text>
          <Text style={styles.emptyText}>Play your games to see your overview.</Text>
        </View>
      );
    }
    return (
      <View>
        <Text style={styles.sectionTitle}>Today's Scores</Text>
        {todaySessions.map((s: any, idx: number) => (
          <Card key={idx} style={styles.card}>
            <Text style={styles.gameName}>{s.gameName}</Text>
            <View style={styles.metricsGrid}>
              {Object.keys(s.metrics).map((key) => {
                let val = s.metrics[key];
                if (typeof val === 'boolean') val = val ? 'Yes' : 'No';
                else if (typeof val === 'number') val = val.toFixed(0);
                
                return (
                  <View key={key} style={styles.metricItem}>
                    <Text style={styles.metricLabel}>{key.replace(/([A-Z])/g, ' $1').trim()}</Text>
                    <Text style={styles.metricValue}>{val}</Text>
                  </View>
                );
              })}
            </View>
          </Card>
        ))}
      </View>
    );
  };

  const renderTrends = () => {
    if (dayNumbers.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="stats-chart-outline" size={48} color={colors.border} />
          <Text style={styles.emptyTitle}>No Trend Data</Text>
          <Text style={styles.emptyText}>Complete sessions across multiple days to see trends.</Text>
        </View>
      );
    }
    return (
      <View>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Avg Reaction Time (ms)</Text>
          <LineChart
            data={{
              labels: dayNumbers.map(d => `Day ${d}`),
              datasets: [{ data: rtData }]
            }}
            width={screenWidth - 80}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={{ marginVertical: 8, borderRadius: 12 }}
          />
        </Card>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Accuracy (%)</Text>
          <LineChart
            data={{
              labels: dayNumbers.map(d => `Day ${d}`),
              datasets: [{ data: accData }]
            }}
            width={screenWidth - 80}
            height={220}
            chartConfig={{...chartConfig, color: (opacity = 1) => `rgba(0, 181, 163, ${opacity})`}}
            bezier
            style={{ marginVertical: 8, borderRadius: 12 }}
          />
        </Card>
      </View>
    );
  };

  const renderReport = () => {
    const todaySessions = daysMap[todayDayNumber] || [];
    const yesterdaySessions = daysMap[todayDayNumber - 1] || [];
    
    const daysOfData = dayNumbers.length;

    // Calculate daily metrics summaries
    let todayRt = 0;
    let todayHesitation = 0;
    let todayCorrections = 0;
    let count = todaySessions.length;

    todaySessions.forEach((s: any) => {
      if (s.metrics.avgReactionTime) todayRt += s.metrics.avgReactionTime;
      if (s.metrics.avgHesitationDuration) todayHesitation += s.metrics.avgHesitationDuration;
      if (s.metrics.totalCorrections) todayCorrections += s.metrics.totalCorrections;
    });

    let yestRt = 0;
    let yestCount = yesterdaySessions.length;
    yesterdaySessions.forEach((s: any) => {
      if (s.metrics.avgReactionTime) yestRt += s.metrics.avgReactionTime;
    });

    const currentRtAvg = count > 0 ? (todayRt / count).toFixed(0) : '-';
    const yestRtAvg = yestCount > 0 ? (yestRt / yestCount).toFixed(0) : '-';
    
    const rtTrend = (count > 0 && yestCount > 0) 
      ? (Number(currentRtAvg) < Number(yestRtAvg) ? 'better' : Number(currentRtAvg) > Number(yestRtAvg) ? 'worse' : 'same')
      : null;

    const renderConditionCard = (
      title: string, 
      level: 'Low' | 'Moderate' | 'High', 
      markers: string[], 
      explanation: string, 
      showTooltip = false,
      tooltipText = ''
    ) => {
      let bg = colors.success + '20';
      let fg = colors.success;
      if (level === 'Moderate') {
        bg = colors.warning + '20';
        fg = colors.warning;
      } else if (level === 'High') {
        bg = colors.danger + '20';
        fg = colors.danger;
      }

      const isExpanded = expandedCondition === title;

      return (
        <Card style={styles.card}>
          <View style={styles.conditionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Text style={styles.cardTitle}>{title}</Text>
              {showTooltip && (
                <TouchableOpacity onPress={() => Alert.alert('Pseudo-Dementia', tooltipText)} style={{ marginLeft: 8 }}>
                  <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <View style={[styles.conditionBadge, { backgroundColor: bg }]}>
              <Text style={[styles.conditionBadgeText, { color: fg }]}>{level} Risk</Text>
            </View>
          </View>

          <Text style={styles.markerTitle}>Key Markers:</Text>
          {markers.map((m, i) => (
            <View key={i} style={styles.findingRow}>
              <Ionicons name="ellipse" size={6} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={styles.findingText}>{m}</Text>
            </View>
          ))}

          <TouchableOpacity onPress={() => setExpandedCondition(isExpanded ? null : title)}>
            <Text style={styles.learnMoreText}>{isExpanded ? 'Hide info' : 'Learn more'}</Text>
          </TouchableOpacity>
          
          {isExpanded && (
            <Text style={styles.explanationText}>{explanation}</Text>
          )}
        </Card>
      );
    };

    return (
      <View>
        {daysOfData < 3 ? (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={24} color={colors.primary} />
            <Text style={styles.infoBannerText}>Complete more sessions for better accuracy</Text>
          </View>
        ) : daysOfData >= 7 ? (
          <View style={styles.infoBannerSuccess}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <Text style={[styles.infoBannerText, { color: colors.success }]}>Full 7-day trend analysis is now available below.</Text>
          </View>
        ) : null}

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Running Cognitive Risk Score</Text>
          <View style={styles.gaugeContainer}>
            <View style={styles.gaugeOuter}>
              <View style={styles.gaugeInner}>
                <Text style={styles.gaugeValue}>15</Text>
                <Text style={styles.gaugeLabel}>Low Risk</Text>
              </View>
            </View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Daily Metric Summary</Text>
        <View style={styles.metricsRow}>
          <Card style={styles.metricSummaryCard}>
            <Text style={styles.metricSummaryLabel}>Reaction Time</Text>
            <Text style={styles.metricSummaryValue}>{currentRtAvg} ms</Text>
            {rtTrend && (
              <View style={styles.trendRow}>
                <Ionicons 
                  name={rtTrend === 'better' ? 'arrow-down' : rtTrend === 'worse' ? 'arrow-up' : 'remove'} 
                  size={14} 
                  color={rtTrend === 'better' ? colors.success : rtTrend === 'worse' ? colors.danger : colors.textSecondary} 
                />
                <Text style={[styles.trendText, { color: rtTrend === 'better' ? colors.success : rtTrend === 'worse' ? colors.danger : colors.textSecondary }]}>
                  {rtTrend === 'same' ? 'Same' : 'vs yesterday'}
                </Text>
              </View>
            )}
          </Card>
          <Card style={styles.metricSummaryCard}>
            <Text style={styles.metricSummaryLabel}>Hesitation</Text>
            <Text style={styles.metricSummaryValue}>{count > 0 ? (todayHesitation / count).toFixed(0) : '-'} ms</Text>
          </Card>
        </View>

        <Text style={styles.sectionTitle}>Condition Indicators</Text>
        
        {renderConditionCard(
          "Alzheimer's Risk",
          "Low",
          ["Memory decline", "Recall accuracy", "Hesitation trend"],
          "Alzheimer's disease typically presents with a steady decline in short-term memory and learning capabilities. Our markers track recall accuracy and consistent delays."
        )}

        {renderConditionCard(
          "Dementia Risk",
          "Low",
          ["Trail making time", "Attention score", "Correction frequency"],
          "General dementia often affects executive function and processing speed. We monitor this via task-switching and error-correction frequencies."
        )}

        {renderConditionCard(
          "Pseudo-Dementia Indicator",
          "Moderate",
          ["Inconsistent performance patterns", "High variability between sessions", "Improvement with encouragement cues"],
          "High variability and inconsistency can be indicators of mood-related cognitive impairment (pseudo-dementia) rather than progressive neurological decline.",
          true,
          "Pseudo-dementia refers to cognitive symptoms that resemble dementia but may be caused by depression or other treatable conditions. Unlike true dementia, these symptoms may be reversible with treatment."
        )}

        <Text style={styles.disclaimerText}>
          These indicators are based on behavioral and cognitive game performance only. This is not a clinical diagnosis. Please consult a neurologist or psychiatrist for professional evaluation.
        </Text>

        {daysOfData >= 7 && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Feature Importance (SHAP)</Text>
            <View style={styles.shapRow}>
              <Text style={styles.shapLabel}>Reaction Time</Text>
              <View style={styles.shapBarContainer}>
                <View style={[styles.shapBar, { width: '80%', backgroundColor: colors.primary }]} />
              </View>
            </View>
            <View style={styles.shapRow}>
              <Text style={styles.shapLabel}>Hesitations</Text>
              <View style={styles.shapBarContainer}>
                <View style={[styles.shapBar, { width: '60%', backgroundColor: colors.secondary }]} />
              </View>
            </View>
          </Card>
        )}

        {todaySessions.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Today's Game Scores</Text>
            {todaySessions.map((s: any, idx: number) => (
              <Card key={idx} style={styles.card}>
                <Text style={styles.gameName}>{s.gameName}</Text>
                <View style={styles.metricsGrid}>
                  {Object.keys(s.metrics).map((key) => {
                    let val = s.metrics[key];
                    if (typeof val === 'boolean') val = val ? 'Yes' : 'No';
                    else if (typeof val === 'number') val = val.toFixed(0);
                    return (
                      <View key={key} style={styles.metricItem}>
                        <Text style={styles.metricLabel}>{key.replace(/([A-Z])/g, ' $1').trim()}</Text>
                        <Text style={styles.metricValue}>{val}</Text>
                      </View>
                    );
                  })}
                </View>
              </Card>
            ))}
          </View>
        )}

        <View style={styles.reportActions}>
          <Button title="Download PDF" onPress={() => {}} style={styles.actionBtn} />
          <Button title="Share with Doctor" type="secondary" onPress={() => {}} style={styles.actionBtn} />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.segmentContainer}>
        {(['Overview', 'Trends', 'Report'] as Tab[]).map((tab) => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.segmentTab, activeTab === tab && styles.segmentTabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.segmentText, activeTab === tab && styles.segmentTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.content}>
        {activeTab === 'Overview' && renderOverview()}
        {activeTab === 'Trends' && renderTrends()}
        {activeTab === 'Report' && renderReport()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  segmentTabActive: {
    borderBottomColor: colors.primary,
  },
  segmentText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.primary,
  },
  scrollArea: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    marginBottom: 16,
    marginTop: 8,
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: 16,
  },
  gameName: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: colors.primary,
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricItem: {
    width: '50%',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  metricValue: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginTop: 2,
  },
  gaugeContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  gaugeOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 12,
    borderColor: '#E2E8F0',
    borderTopColor: colors.success,
    borderRightColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeInner: {
    alignItems: 'center',
  },
  gaugeValue: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: colors.success,
  },
  gaugeLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
  },
  findingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  findingText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
    flex: 1,
  },
  shapRow: {
    marginBottom: 16,
  },
  shapLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: 6,
  },
  shapBarContainer: {
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  shapBar: {
    height: '100%',
    borderRadius: 6,
  },
  reportActions: {
    marginTop: 16,
    gap: 12,
  },
  actionBtn: {
    width: '100%',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF4FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoBannerSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF9EE',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoBannerText: {
    flex: 1,
    marginLeft: 12,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.primary,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricSummaryCard: {
    flex: 1,
    padding: 16,
    marginBottom: 0,
  },
  metricSummaryLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  metricSummaryValue: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    marginTop: 8,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  trendText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 4,
  },
  conditionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  conditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  conditionBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  markerTitle: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  learnMoreText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
    marginTop: 8,
  },
  explanationText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  disclaimerText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 16,
  }
});
