import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { Button } from '../components/Button';
import { saveGameSession, getSessionStatus } from '../utils/session';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Game4'>;
  route: RouteProp<RootStackParamList, 'Game4'>;
};

const LETTER_DURATION = 2200;

const generateSequence = () => {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'X', 'Y', 'Z'];
  const seq: string[] = [];
  let targets = 0;
  for (let i = 0; i < 20; i++) {
    if (i > 0 && targets < 6 && Math.random() < 0.35) {
      seq.push(seq[i - 1]);
      targets++;
    } else {
      let l = letters[Math.floor(Math.random() * letters.length)];
      while (i > 0 && l === seq[i - 1]) {
        l = letters[Math.floor(Math.random() * letters.length)];
      }
      seq.push(l);
    }
  }
  return seq;
};

export default function Game4Screen({ navigation, route }: Props) {
  const { dayNumber } = route.params;
  const [sequence] = useState(generateSequence());
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [tappedForCurrent, setTappedForCurrent] = useState(false);
  const [tapResult, setTapResult] = useState<'correct' | 'wrong' | null>(null);

  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const bgFlashAnim = useRef(new Animated.Value(0)).current;

  const startTimeRef = useRef(0);
  const letterShowTimeRef = useRef(0);
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tappedRef = useRef(false);

  const metrics = useRef({
    totalTargets: 0,
    correctHits: 0,
    falsePositives: 0,
    missedTargets: 0,
    reactionTimes: [] as number[],
  });

  useEffect(() => {
    let targets = 0;
    for (let i = 1; i < sequence.length; i++) {
      if (sequence[i] === sequence[i - 1]) targets++;
    }
    metrics.current.totalTargets = targets;
  }, [sequence]);

  const triggerLetterChange = () => {
    scaleAnim.setValue(0.4);
    opacityAnim.setValue(0);
    progressAnim.setValue(1);

    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 7, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();

    Animated.sequence([
      Animated.timing(bgFlashAnim, { toValue: 1, duration: 80, useNativeDriver: false }),
      Animated.timing(bgFlashAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
    ]).start();

    Animated.timing(progressAnim, { toValue: 0, duration: LETTER_DURATION, useNativeDriver: false }).start();
  };

  useEffect(() => {
    if (currentIndex >= 0 && currentIndex < sequence.length) {
      tappedRef.current = false;
      setTappedForCurrent(false);
      setTapResult(null);
      letterShowTimeRef.current = Date.now();
      triggerLetterChange();

      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);

      progressTimerRef.current = setTimeout(() => {
        const isTarget = currentIndex > 0 && sequence[currentIndex] === sequence[currentIndex - 1];
        if (isTarget && !tappedRef.current) {
          metrics.current.missedTargets++;
        }
        if (currentIndex < sequence.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          finishGame();
        }
      }, LETTER_DURATION);

      return () => { if (progressTimerRef.current) clearTimeout(progressTimerRef.current); };
    }
  }, [currentIndex]);

  const startGame = () => {
    startTimeRef.current = Date.now();
    setCurrentIndex(0);
  };

  const finishGame = async () => {
    const totalTime = Date.now() - startTimeRef.current;
    const rts = metrics.current.reactionTimes;
    let drift = 0;
    if (rts.length >= 2) {
      const firstHalf = rts.slice(0, Math.floor(rts.length / 2));
      const secondHalf = rts.slice(Math.floor(rts.length / 2));
      drift = (secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length) - (firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length);
    }
    const metricsToSave = {
      accuracy: metrics.current.correctHits / Math.max(1, metrics.current.totalTargets),
      falsePositiveRate: metrics.current.falsePositives / Math.max(1, 20 - metrics.current.totalTargets),
      missedTargetRate: metrics.current.missedTargets / Math.max(1, metrics.current.totalTargets),
      avgReactionTime: rts.length ? rts.reduce((a, b) => a + b, 0) / rts.length : 0,
      reactionTimeDrift: drift,
      totalCompletionTime: totalTime,
    };
    const status = await getSessionStatus();
    if (status?.user) await saveGameSession(status.user.id, dayNumber, 'Game4', metricsToSave);
    navigation.goBack();
  };

  const handleMatchPress = () => {
    if (tappedRef.current || currentIndex < 0 || currentIndex >= sequence.length) return;
    tappedRef.current = true;
    setTappedForCurrent(true);
    const rt = Date.now() - letterShowTimeRef.current;
    const isTarget = currentIndex > 0 && sequence[currentIndex] === sequence[currentIndex - 1];
    if (isTarget) {
      metrics.current.correctHits++;
      metrics.current.reactionTimes.push(rt);
      setTapResult('correct');
    } else {
      metrics.current.falsePositives++;
      setTapResult('wrong');
    }
  };

  const bgColor = bgFlashAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.background, '#D6E8FF'] });
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  if (currentIndex === -1) {
    return (
      <View style={styles.startContainer}>
        <Text style={styles.title}>N-Back Test</Text>
        <Text style={styles.subtitle}>1-Back Working Memory</Text>
        <View style={styles.instructionCard}>
          <Text style={styles.instructionStep}>① A letter appears on screen for ~2 seconds</Text>
          <Text style={styles.instructionStep}>② Watch the <Text style={{ fontFamily: 'Inter_700Bold' }}>PREV</Text> chip — it shows the last letter</Text>
          <Text style={styles.instructionStep}>③ If the current letter <Text style={{ color: colors.primary, fontFamily: 'Inter_700Bold' }}>matches PREV</Text>, tap MATCH!</Text>
        </View>
        <Button title="Start Test" onPress={startGame} style={{ width: 220 }} />
      </View>
    );
  }

  const prevLetter = currentIndex > 0 ? sequence[currentIndex - 1] : null;
  const currentLetter = sequence[currentIndex];

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.topBar}>
        <View style={styles.progressChip}>
          <Text style={styles.progressChipText}>{currentIndex + 1} / 20</Text>
        </View>
        <View style={styles.prevLetterChip}>
          <Text style={styles.prevLetterLabel}>PREV</Text>
          <Text style={styles.prevLetterValue}>{prevLetter ?? '—'}</Text>
        </View>
      </View>

      <View style={styles.countdownContainer}>
        <Animated.View style={[styles.countdownBar, { width: progressWidth }]} />
      </View>

      <View style={styles.letterArea}>
        <Animated.View style={[
          styles.letterCard,
          tapResult === 'correct' && styles.letterCardCorrect,
          tapResult === 'wrong' && styles.letterCardWrong,
          { transform: [{ scale: scaleAnim }], opacity: opacityAnim }
        ]}>
          <Text style={[
            styles.letterText,
            tapResult === 'correct' && { color: colors.success },
            tapResult === 'wrong' && { color: colors.danger },
          ]}>
            {currentLetter}
          </Text>
        </Animated.View>

        {tapResult && (
          <Text style={[styles.resultLabel, { color: tapResult === 'correct' ? colors.success : colors.danger }]}>
            {tapResult === 'correct' ? '✓  Correct match!' : '✗  Not a match'}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.matchButton,
          tappedForCurrent && tapResult === 'correct' && styles.matchButtonCorrect,
          tappedForCurrent && tapResult === 'wrong' && styles.matchButtonWrong,
          tappedForCurrent && styles.matchButtonTapped,
        ]}
        onPress={handleMatchPress}
        activeOpacity={0.75}
        disabled={tappedForCurrent}
      >
        <Text style={styles.matchButtonText}>
          {tappedForCurrent ? (tapResult === 'correct' ? '✓' : '✗') : 'MATCH'}
        </Text>
        {!tappedForCurrent && (
          <Text style={styles.matchButtonSub}>same as previous?</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  startContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.background, paddingHorizontal: 32,
  },
  title: { fontSize: 32, fontFamily: 'Inter_700Bold', color: colors.primary, marginBottom: 4 },
  subtitle: { fontSize: 16, fontFamily: 'Inter_400Regular', color: colors.textSecondary, marginBottom: 40 },
  instructionCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 24,
    width: '100%', marginBottom: 40, borderWidth: 1, borderColor: colors.border, gap: 16,
  },
  instructionStep: { fontSize: 16, fontFamily: 'Inter_400Regular', color: colors.text, lineHeight: 26 },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 60, paddingBottom: 16,
  },
  progressChip: {
    backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: 14,
    paddingVertical: 6, borderWidth: 1, borderColor: colors.border,
  },
  progressChipText: { fontFamily: 'Inter_600SemiBold', color: colors.textSecondary, fontSize: 14 },
  prevLetterChip: {
    backgroundColor: colors.primary + '15', borderRadius: 12, paddingHorizontal: 20,
    paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.primary + '40',
    minWidth: 80,
  },
  prevLetterLabel: { fontSize: 10, fontFamily: 'Inter_700Bold', color: colors.primary, letterSpacing: 1.5 },
  prevLetterValue: { fontSize: 32, fontFamily: 'Inter_700Bold', color: colors.primary, lineHeight: 38 },
  countdownContainer: {
    height: 7, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden', marginBottom: 0,
  },
  countdownBar: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  letterArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  letterCard: {
    width: 200, height: 200, borderRadius: 32, backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
    borderWidth: 2, borderColor: colors.border,
  },
  letterCardCorrect: { borderColor: colors.success, backgroundColor: colors.success + '12' },
  letterCardWrong: { borderColor: colors.danger, backgroundColor: colors.danger + '12' },
  letterText: { fontSize: 120, fontFamily: 'Inter_700Bold', color: colors.text, lineHeight: 140 },
  resultLabel: { fontSize: 18, fontFamily: 'Inter_700Bold', marginTop: 20 },
  matchButton: {
    backgroundColor: colors.primary, marginHorizontal: 20, marginBottom: 60,
    paddingVertical: 24, borderRadius: 20, alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 10,
  },
  matchButtonTapped: { shadowOpacity: 0, elevation: 0 },
  matchButtonCorrect: { backgroundColor: colors.success },
  matchButtonWrong: { backgroundColor: colors.danger },
  matchButtonText: { fontSize: 32, fontFamily: 'Inter_700Bold', color: '#FFF' },
  matchButtonSub: {
    fontSize: 13, fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.75)', marginTop: 4,
  },
});
