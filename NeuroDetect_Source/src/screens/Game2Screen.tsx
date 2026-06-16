import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { Button } from '../components/Button';
import { saveGameSession, getSessionStatus } from '../utils/session';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Game2'>;
  route: RouteProp<RootStackParamList, 'Game2'>;
};

const GROCERY_LIST = ['Apple', 'Bread', 'Milk', 'Eggs', 'Cheese', 'Tomato', 'Chicken', 'Rice'];

export default function Game2Screen({ navigation, route }: Props) {
  const { dayNumber } = route.params;
  const [phase, setPhase] = useState<'memorize' | 'distraction' | 'recall'>('memorize');
  const [timeLeft, setTimeLeft] = useState(10);
  
  // Distraction task state
  const [distractTaps, setDistractTaps] = useState(0);

  // Recall task state
  const [answers, setAnswers] = useState<string[]>(['', '', '', '', '', '', '', '']);
  const [startTime, setStartTime] = useState(0);
  const [firstInputTime, setFirstInputTime] = useState(0);
  const [corrections, setCorrections] = useState(0);
  const [lastLens, setLastLens] = useState<number[]>(Array(8).fill(0));

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (phase === 'memorize') {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setPhase('distraction');
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (phase === 'distraction') {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setPhase('recall');
            setStartTime(Date.now());
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [phase]);

  const handleTextChange = (text: string, index: number) => {
    if (firstInputTime === 0) {
      setFirstInputTime(Date.now() - startTime);
    }
    
    if (text.length < lastLens[index]) {
      setCorrections(prev => prev + 1);
    }
    
    const newLens = [...lastLens];
    newLens[index] = text.length;
    setLastLens(newLens);

    const newAnswers = [...answers];
    newAnswers[index] = text;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    const endTime = Date.now();
    const completionTime = endTime - startTime;
    
    const submittedItems = answers.map(a => a.trim().toLowerCase()).filter(a => a.length > 0);
    const targetItems = GROCERY_LIST.map(i => i.toLowerCase());

    let correctCount = 0;
    let intrusionCount = 0;

    submittedItems.forEach(item => {
      if (targetItems.includes(item)) {
        correctCount++;
      } else {
        intrusionCount++;
      }
    });

    const omissionCount = 8 - correctCount;

    const metricsToSave = {
      accuracy: correctCount / 8,
      recallLatency: firstInputTime,
      correctionFrequency: corrections,
      omissionErrors: omissionCount,
      intrusionErrors: intrusionCount,
      completionTime: completionTime
    };

    const status = await getSessionStatus();
    if (status?.user) {
      await saveGameSession(status.user.id, dayNumber, 'Game2', metricsToSave);
    }
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {phase === 'memorize' && (
          <View style={styles.centerContainer}>
            <Text style={styles.title}>Memorize these items</Text>
            <Text style={styles.timer}>{timeLeft}s</Text>
            <View style={styles.grid}>
              {GROCERY_LIST.map((item, idx) => (
                <View key={idx} style={styles.itemBox}>
                  <Text style={styles.itemText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {phase === 'distraction' && (
          <View style={styles.centerContainer}>
            <Text style={styles.title}>Distraction Task</Text>
            <Text style={styles.timer}>{timeLeft}s left</Text>
            <Text style={styles.instruction}>Tap the button as many times as you can!</Text>
            <Text style={styles.scoreText}>Taps: {distractTaps}</Text>
            <Button 
              title="TAP ME" 
              onPress={() => setDistractTaps(prev => prev + 1)} 
              style={styles.tapButton}
            />
          </View>
        )}

        {phase === 'recall' && (
          <View style={styles.recallContainer}>
            <Text style={styles.title}>Recall</Text>
            <Text style={styles.instruction}>Type the 8 items you remember (order doesn't matter)</Text>
            
            <View style={styles.inputsGrid}>
              {answers.map((ans, idx) => (
                <TextInput
                  key={idx}
                  style={styles.input}
                  value={ans}
                  onChangeText={(t) => handleTextChange(t, idx)}
                  placeholderTextColor={colors.textSecondary}
                  placeholder={`Item ${idx + 1}`}
                />
              ))}
            </View>

            <Button 
              title="Submit" 
              onPress={handleSubmit} 
              style={styles.submitButton}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  timer: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 40,
  },
  instruction: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  itemBox: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: '40%',
    alignItems: 'center',
  },
  itemText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  scoreText: {
    fontSize: 24,
    color: colors.success,
    marginBottom: 40,
  },
  tapButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  recallContainer: {
    flex: 1,
  },
  inputsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    color: colors.text,
    fontSize: 16,
    padding: 16,
    width: '48%',
  },
  submitButton: {
    marginTop: 'auto',
  }
});
