import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { getSessionStatus } from '../utils/session';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const [user, setUser] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      getSessionStatus().then((status) => {
        if (status) setUser(status.user);
      });
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {user ? (
        <Card style={styles.card}>
          <Text style={styles.title}>Your Profile</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{user.fullName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Age:</Text>
            <Text style={styles.value}>{user.age}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Education:</Text>
            <Text style={styles.value}>{user.education}</Text>
          </View>
        </Card>
      ) : null}

      <Card style={styles.card}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.warningText}>
          Resetting data will erase all your game sessions and evaluation history. You will start fresh from Day 1.
        </Text>
        <Button 
          title="Reset All Data" 
          onPress={handleReset} 
          style={{ backgroundColor: colors.danger, marginTop: 16 }}
        />
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
    padding: 24,
    paddingTop: 40,
  },
  card: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  label: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 16,
  },
  value: {
    flex: 2,
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  warningText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  }
});
