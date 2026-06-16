import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { Button } from '../components/Button';
import { MetricPill } from '../components/MetricPill';
import { saveGameSession, getSessionStatus } from '../utils/session';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Game1'>;
  route: RouteProp<RootStackParamList, 'Game1'>;
};

export default function Game1Screen({ navigation, route }: Props) {
  const { dayNumber } = route.params;
  const [step, setStep] = useState(0); // 0 to 4 (5 questions)
  const [currentNumber, setCurrentNumber] = useState(100);
  const [answer, setAnswer] = useState('');
  
  // Metrics
  const [startTime, setStartTime] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [firstInputTime, setFirstInputTime] = useState(0);
  const [corrections, setCorrections] = useState(0);
  const [lastAnswerLen, setLastAnswerLen] = useState(0);

  // Accumulated metrics
  const accMetrics = useRef({
    totalReactionTime: 0,
    totalHesitation: 0,
    totalCorrections: 0,
    correctAnswers: 0,
  });

  const [liveReaction, setLiveReaction] = useState(0);
  const [liveHesitation, setLiveHesitation] = useState(0);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const now = Date.now();
    setStartTime(now);
    setQuestionStartTime(now);
    
    const interval = setInterval(() => {
      setLiveReaction(Date.now() - questionStartTime);
    }, 100);
    return () => clearInterval(interval);
  }, [step]);

  const handleTextChange = (text: string) => {
    if (firstInputTime === 0) {
      const hesTime = Date.now() - questionStartTime;
      setFirstInputTime(hesTime);
      setLiveHesitation(hesTime);
    }
    
    // Check for correction
    if (text.length < lastAnswerLen) {
      setCorrections(prev => prev + 1);
    }
    setLastAnswerLen(text.length);
    setAnswer(text);
  };

  const handleSubmit = async () => {
    if (!answer) return;
    
    const endTime = Date.now();
    const reactionTime = endTime - questionStartTime;
    const hesitationTime = firstInputTime > 0 ? firstInputTime : reactionTime;
    const isCorrect = parseInt(answer, 10) === currentNumber - 7;

    accMetrics.current.totalReactionTime += reactionTime;
    accMetrics.current.totalHesitation += hesitationTime;
    accMetrics.current.totalCorrections += corrections;
    if (isCorrect) accMetrics.current.correctAnswers += 1;

    if (step < 4) {
      const userAnswer = parseInt(answer, 10);
      setCurrentNumber(isNaN(userAnswer) ? currentNumber - 7 : userAnswer);
      setStep(prev => prev + 1);
      setAnswer('');
      setFirstInputTime(0);
      setCorrections(0);
      setLastAnswerLen(0);
      setLiveHesitation(0);
      setLiveReaction(0);
      setQuestionStartTime(Date.now());
    } else {
      // Done
      setIsDone(true);
      const totalTime = Date.now() - startTime;
      
      const metricsToSave = {
        avgReactionTime: accMetrics.current.totalReactionTime / 5,
        avgHesitationDuration: accMetrics.current.totalHesitation / 5,
        totalCorrections: accMetrics.current.totalCorrections,
        accuracy: accMetrics.current.correctAnswers / 5,
        totalCompletionTime: totalTime
      };

      const status = await getSessionStatus();
      if (status?.user) {
        await saveGameSession(status.user.id, dayNumber, 'Game1', metricsToSave);
      }
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.topBar}>
        <MetricPill 
          reactionTime={liveReaction} 
          hesitation={liveHesitation} 
          corrections={accMetrics.current.totalCorrections + corrections} 
        />
        <Text style={styles.progressText}>{step + 1} / 5</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.instruction}>Subtract 7 from the number below</Text>
        <Text style={styles.numberDisplay}>{currentNumber}</Text>
        
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={answer}
          onChangeText={handleTextChange}
          placeholder="Tap to answer"
          placeholderTextColor={colors.textSecondary}
          autoFocus
          onSubmitEditing={handleSubmit}
        />
        
        <Button 
          title={step === 4 ? "Finish" : "Next"} 
          onPress={handleSubmit} 
          style={styles.button}
          disabled={!answer || isDone}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  instruction: {
    fontSize: 20,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  numberDisplay: {
    fontSize: 72,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 48,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    color: colors.text,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 20,
    width: '100%',
    marginBottom: 24,
  },
  button: {
    width: '100%',
  }
});
