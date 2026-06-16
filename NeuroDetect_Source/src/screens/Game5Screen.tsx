import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, PanResponder, Dimensions, GestureResponderEvent, Platform } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { saveGameSession, getSessionStatus } from '../utils/session';
import { TouchableOpacity } from 'react-native';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Game5'>;
  route: RouteProp<RootStackParamList, 'Game5'>;
};

const { width, height } = Dimensions.get('window');
const CIRCLE_RADIUS = 28;
const PLAY_AREA_TOP = 140; // offset from top of screen (header height)

const generateCircles = () => {
  const circles: { id: number; x: number; y: number }[] = [];
  const padding = CIRCLE_RADIUS + 16;
  const areaWidth = width - padding * 2 - CIRCLE_RADIUS * 2;
  const areaHeight = height * 0.65 - CIRCLE_RADIUS * 2;

  for (let i = 1; i <= 10; i++) {
    let x = 0, y = 0, overlaps = true, attempts = 0;
    while (overlaps && attempts < 200) {
      x = padding + Math.random() * areaWidth;
      y = padding + Math.random() * areaHeight;
      overlaps = circles.some(c => {
        const dx = c.x - x, dy = c.y - y;
        return Math.sqrt(dx * dx + dy * dy) < CIRCLE_RADIUS * 2 + 20;
      });
      attempts++;
    }
    circles.push({ id: i, x, y });
  }
  return circles;
};

export default function Game5Screen({ navigation, route }: Props) {
  const { dayNumber } = route.params;
  const [circles] = useState(generateCircles());
  const [currentExpected, setCurrentExpected] = useState(1);
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragFromCircle, setDragFromCircle] = useState<number | null>(null);
  const [errorFlash, setErrorFlash] = useState(false);

  const startTimeRef = useRef(0);
  const lastTapTimeRef = useRef(0);
  const playAreaRef = useRef<View>(null);
  const playAreaOffset = useRef({ x: 0, y: 0 });

  const metrics = useRef({
    misclickFrequency: 0,
    hesitationDurations: [] as number[],
    errorRecoveryTimes: [] as number[],
  });
  const lastErrorTimeRef = useRef(0);

  // Find which circle is at a given point
  const hitTest = useCallback((px: number, py: number) => {
    for (const c of circles) {
      const dx = c.x + CIRCLE_RADIUS - px;
      const dy = c.y + CIRCLE_RADIUS - py;
      if (Math.sqrt(dx * dx + dy * dy) <= CIRCLE_RADIUS + 8) return c;
    }
    return null;
  }, [circles]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        const lx = pageX - playAreaOffset.current.x;
        const ly = pageY - playAreaOffset.current.y;
        const hit = hitTest(lx, ly);
        if (hit) {
          setIsDragging(true);
          setDragFromCircle(hit.id);
          setDragPos({ x: hit.x + CIRCLE_RADIUS, y: hit.y + CIRCLE_RADIUS });
        }
      },

      onPanResponderMove: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        const lx = pageX - playAreaOffset.current.x;
        const ly = pageY - playAreaOffset.current.y;
        setDragPos({ x: lx, y: ly });
      },

      onPanResponderRelease: async (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        const lx = pageX - playAreaOffset.current.x;
        const ly = pageY - playAreaOffset.current.y;
        const hit = hitTest(lx, ly);

        setIsDragging(false);

        if (!hit || dragFromCircle === null) {
          setDragFromCircle(null);
          return;
        }

        // Must drag FROM the expected circle TO the next expected circle
        // OR drag between any two circles and check if destination is expected
        const now = Date.now();

        if (hit.id === currentExpectedRef.current && dragFromCircle === hit.id) {
          // Tapped the correct circle (started and ended on same correct circle) — count as correct
          const hesitation = now - lastTapTimeRef.current;
          metrics.current.hesitationDurations.push(hesitation);
          lastTapTimeRef.current = now;
          advanceCircle(hit.id, now);
        } else if (hit.id === currentExpectedRef.current && dragFromCircle !== hit.id) {
          // Dragged to the correct circle
          const prevCircle = circles.find(c => c.id === dragFromCircle);
          if (prevCircle) {
            const hesitation = now - lastTapTimeRef.current;
            metrics.current.hesitationDurations.push(hesitation);
            setLines(prev => [...prev, {
              x1: prevCircle.x + CIRCLE_RADIUS,
              y1: prevCircle.y + CIRCLE_RADIUS,
              x2: hit.x + CIRCLE_RADIUS,
              y2: hit.y + CIRCLE_RADIUS,
            }]);
          }
          lastTapTimeRef.current = now;
          advanceCircle(hit.id, now);
        } else {
          // Wrong target
          metrics.current.misclickFrequency++;
          setErrorFlash(true);
          setTimeout(() => setErrorFlash(false), 300);
          if (lastErrorTimeRef.current === 0) lastErrorTimeRef.current = now;
        }

        setDragFromCircle(null);
      },

      onPanResponderTerminate: () => {
        setIsDragging(false);
        setDragFromCircle(null);
      },
    })
  ).current;

  // Keep a ref so the panResponder closure can access current value
  const currentExpectedRef = useRef(1);

  const advanceCircle = async (id: number, now: number) => {
    setCompletedIds(prev => [...prev, id]);

    if (lastErrorTimeRef.current > 0) {
      metrics.current.errorRecoveryTimes.push(now - lastErrorTimeRef.current);
      lastErrorTimeRef.current = 0;
    }

    if (id === 10) {
      const totalTime = now - startTimeRef.current;
      const hesitations = metrics.current.hesitationDurations;
      const recoveries = metrics.current.errorRecoveryTimes;
      const metricsToSave = {
        completionTime: totalTime,
        sequenceAccuracy: 1 - metrics.current.misclickFrequency / Math.max(1, 10 + metrics.current.misclickFrequency),
        misclickFrequency: metrics.current.misclickFrequency,
        avgHesitationDuration: hesitations.length ? hesitations.reduce((a, b) => a + b, 0) / hesitations.length : 0,
        avgErrorRecoveryTime: recoveries.length ? recoveries.reduce((a, b) => a + b, 0) / recoveries.length : 0,
      };
      const status = await getSessionStatus();
      if (status?.user) await saveGameSession(status.user.id, dayNumber, 'Game5', metricsToSave);
      navigation.goBack();
    } else {
      const next = id + 1;
      currentExpectedRef.current = next;
      setCurrentExpected(next);
    }
  };

  const startGame = () => {
    const now = Date.now();
    startTimeRef.current = now;
    lastTapTimeRef.current = now;
    currentExpectedRef.current = 1;
    setHasStarted(true);
  };

  if (!hasStarted) {
    return (
      <View style={styles.startContainer}>
        <Text style={styles.title}>Trail Making Test</Text>
        <View style={styles.instructionCard}>
          <Text style={styles.instructionStep}>① Numbers 1–10 are scattered on the screen</Text>
          <Text style={styles.instructionStep}>② <Text style={{ fontFamily: 'Inter_700Bold' }}>Drag</Text> your finger from one number to the next in order</Text>
          <Text style={styles.instructionStep}>③ Connect 1 → 2 → 3 → ... → 10 as fast as you can</Text>
        </View>
        <TouchableOpacity style={styles.startButton} onPress={startGame}>
          <Text style={styles.startButtonText}>Start</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header — no hints, just progress */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trail Making</Text>
        <View style={[styles.progressChip, errorFlash && styles.progressChipError]}>
          <Text style={styles.progressText}>
            {errorFlash ? '✗ Wrong order' : `${completedIds.length} / 10`}
          </Text>
        </View>
      </View>

      {/* Play area */}
      <View
        ref={playAreaRef}
        style={styles.playArea}
        onLayout={() => {
          playAreaRef.current?.measure((_x, _y, _w, _h, px, py) => {
            playAreaOffset.current = { x: px, y: py };
          });
        }}
        {...panResponder.panHandlers}
      >
        {/* SVG lines for completed connections */}
        <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {lines.map((ln, i) => (
            <Line
              key={i}
              x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2}
              stroke={colors.success} strokeWidth={3} strokeDasharray="6,4"
            />
          ))}
          {/* Live drag line */}
          {isDragging && dragFromCircle !== null && (() => {
            const from = circles.find(c => c.id === dragFromCircle);
            if (!from) return null;
            return (
              <Line
                x1={from.x + CIRCLE_RADIUS} y1={from.y + CIRCLE_RADIUS}
                x2={dragPos.x} y2={dragPos.y}
                stroke={colors.primary} strokeWidth={2} strokeOpacity={0.5}
              />
            );
          })()}
        </Svg>

        {/* Circles */}
        {circles.map(c => {
          const done = completedIds.includes(c.id);
          const isActive = isDragging && dragFromCircle === c.id;
          return (
            <View
              key={c.id}
              style={[
                styles.circle,
                { left: c.x, top: c.y },
                done && styles.circleDone,
                isActive && styles.circleActive,
              ]}
            >
              <Text style={[styles.circleText, done && styles.circleTextDone]}>
                {c.id}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  startContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.background, paddingHorizontal: 32,
  },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', color: colors.primary, marginBottom: 28 },
  instructionCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 24,
    width: '100%', marginBottom: 40, borderWidth: 1, borderColor: colors.border, gap: 16,
  },
  instructionStep: { fontSize: 15, fontFamily: 'Inter_400Regular', color: colors.text, lineHeight: 24 },
  startButton: {
    backgroundColor: colors.primary, paddingVertical: 16,
    paddingHorizontal: 48, borderRadius: 30,
  },
  startButtonText: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFF' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16,
  },
  headerTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: colors.text },
  progressChip: {
    backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: 14,
    paddingVertical: 6, borderWidth: 1, borderColor: colors.border,
  },
  progressChipError: { borderColor: colors.danger, backgroundColor: colors.danger + '10' },
  progressText: { fontFamily: 'Inter_600SemiBold', color: colors.textSecondary, fontSize: 14 },
  playArea: {
    flex: 1,
    position: 'relative',
    marginHorizontal: 8,
    marginBottom: 20,
  },
  circle: {
    position: 'absolute',
    width: CIRCLE_RADIUS * 2,
    height: CIRCLE_RADIUS * 2,
    borderRadius: CIRCLE_RADIUS,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  circleDone: {
    backgroundColor: colors.success + '20',
    borderColor: colors.success,
  },
  circleActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  circleText: { fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.text },
  circleTextDone: { color: colors.success },
});
