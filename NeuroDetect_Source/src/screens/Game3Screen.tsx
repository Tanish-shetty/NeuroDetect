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
  navigation: NativeStackNavigationProp<RootStackParamList, 'Game3'>;
  route: RouteProp<RootStackParamList, 'Game3'>;
};

const IMAGES = [
  { emoji: '🍎', name: 'apple', category: 'fruit' },
  { emoji: '🐕', name: 'dog', category: 'animal' },
  { emoji: '🚗', name: 'car', category: 'vehicle' },
  { emoji: '🏠', name: 'house', category: 'building' },
  { emoji: '🎸', name: 'guitar', category: 'instrument' },
  { emoji: '🚲', name: 'bicycle', category: 'vehicle' },
  { emoji: '🦁', name: 'lion', category: 'animal' },
  { emoji: '🌻', name: 'sunflower', category: 'plant' },
  { emoji: '⌚', name: 'watch', category: 'accessory' },
  { emoji: '🔑', name: 'key', category: 'tool' },
];

export default function Game3Screen({ navigation, route }: Props) {
  const { dayNumber } = route.params;
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState('');
  
  // Metrics
  const [startTime, setStartTime] = useState(0);
  const [imageStartTime, setImageStartTime] = useState(0);
  const [firstInputTime, setFirstInputTime] = useState(0);
  const [corrections, setCorrections] = useState(0);
  const [lastAnswerLen, setLastAnswerLen] = useState(0);

  // Accumulated metrics
  const accMetrics = useRef({
    totalReactionTime: 0,
    totalHesitation: 0,
    totalCorrections: 0,
    correctAnswers: 0,
    semanticErrors: 0,
  });

  const [liveReaction, setLiveReaction] = useState(0);
  const [liveHesitation, setLiveHesitation] = useState(0);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const now = Date.now();
    if (step === 0) setStartTime(now);
    setImageStartTime(now);
    
    const interval = setInterval(() => {
      setLiveReaction(Date.now() - imageStartTime);
    }, 100);
    return () => clearInterval(interval);
  }, [step]);

  const handleTextChange = (text: string) => {
    if (firstInputTime === 0) {
      const hesTime = Date.now() - imageStartTime;
      setFirstInputTime(hesTime);
      setLiveHesitation(hesTime);
    }
    
    if (text.length < lastAnswerLen) {
      setCorrections(prev => prev + 1);
    }
    setLastAnswerLen(text.length);
    setAnswer(text);
  };

  const handleSubmit = async () => {
    if (!answer) return;
    
    const endTime = Date.now();
    const reactionTime = endTime - imageStartTime;
    const hesitationTime = firstInputTime > 0 ? firstInputTime : reactionTime;
    
    const currentItem = IMAGES[step];
    const normalizedAnswer = answer.trim().toLowerCase();
    
    let isCorrect = false;
    let isSemanticError = false;

    if (normalizedAnswer === currentItem.name) {
      isCorrect = true;
    } else {
      // Basic check for semantic error (e.g. typing "animal" instead of "dog")
      if (normalizedAnswer === currentItem.category) {
        isSemanticError = true;
      }
    }

    accMetrics.current.totalReactionTime += reactionTime;
    accMetrics.current.totalHesitation += hesitationTime;
    accMetrics.current.totalCorrections += corrections;
    if (isCorrect) accMetrics.current.correctAnswers += 1;
    if (isSemanticError) accMetrics.current.semanticErrors += 1;

    if (step < 9) {
      setStep(prev => prev + 1);
      setAnswer('');
      setFirstInputTime(0);
      setCorrections(0);
      setLastAnswerLen(0);
      setLiveHesitation(0);
      setLiveReaction(0);
    } else {
      // Done
      setIsDone(true);
      const totalTime = Date.now() - startTime;
      
      const metricsToSave = {
        avgReactionTime: accMetrics.current.totalReactionTime / 10,
        avgHesitationDuration: accMetrics.current.totalHesitation / 10,
        totalCorrections: accMetrics.current.totalCorrections,
        accuracy: accMetrics.current.correctAnswers / 10,
        semanticErrors: accMetrics.current.semanticErrors,
        totalCompletionTime: totalTime
      };

      const status = await getSessionStatus();
      if (status?.user) {
        await saveGameSession(status.user.id, dayNumber, 'Game3', metricsToSave);
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
        <Text style={styles.progressText}>{step + 1} / 10</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.instruction}>Name the object below</Text>
        <Text style={styles.emojiDisplay}>{IMAGES[step]?.emoji}</Text>
        
        <TextInput
          style={styles.input}
          value={answer}
          onChangeText={handleTextChange}
          placeholder="Type name here"
          placeholderTextColor={colors.textSecondary}
          autoFocus
          onSubmitEditing={handleSubmit}
        />
        
        <Button 
          title={step === 9 ? "Finish" : "Next"} 
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
    marginBottom: 40,
  },
  emojiDisplay: {
    fontSize: 120,
    marginBottom: 60,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 16,
    width: '100%',
    marginBottom: 24,
  },
  button: {
    width: '100%',
  }
});
