import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface MetricPillProps {
  reactionTime?: number; // in ms
  hesitation?: number; // in ms
  corrections?: number;
}

export const MetricPill: React.FC<MetricPillProps> = ({ reactionTime = 0, hesitation = 0, corrections = 0 }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>⚡ {(reactionTime / 1000).toFixed(1)}s</Text>
      <Text style={styles.divider}>|</Text>
      <Text style={styles.text}>⏸ {(hesitation / 1000).toFixed(1)}s</Text>
      <Text style={styles.divider}>|</Text>
      <Text style={styles.text}>✏️ {corrections}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    color: colors.text,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  divider: {
    color: colors.textSecondary,
    marginHorizontal: 12,
  },
});
