import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Alert, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { getDB } from '../db/database';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

export default function OnboardingScreen({ navigation }: Props) {
  const [formData, setFormData] = useState({
    fullName: '',
    age: '',
    phone: '',
    sex: '',
    education: '',
    height: '',
    weight: '',
  });

  const [loading, setLoading] = useState(false);

  const sexOptions = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Other', value: 'Other' },
  ];

  const educationOptions = [
    { label: 'Below 10th', value: 'Below 10th' },
    { label: '10th', value: '10th' },
    { label: '12th', value: '12th' },
    { label: 'Graduate', value: 'Graduate' },
    { label: 'Postgraduate', value: 'Postgraduate' },
  ];

  const updateForm = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    // Basic validation
    if (!formData.fullName || !formData.age || !formData.phone || !formData.sex || !formData.education || !formData.height || !formData.weight) {
      if (Platform.OS === 'web') {
        window.alert('Please fill all fields');
      } else {
        Alert.alert('Error', 'Please fill all fields');
      }
      return;
    }

    setLoading(true);
    try {
      // Save all form data to localStorage (AsyncStorage)
      await AsyncStorage.setItem('userData', JSON.stringify(formData));
      await AsyncStorage.setItem('hasOnboarded', 'true');
      
      // Try saving to SQLite (may fail on web)
      if (Platform.OS !== 'web') {
        try {
          const db = getDB();
          const query = `
            INSERT INTO users (fullName, age, phone, sex, education, height, weight, createdAt) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `;
          const args = [
            formData.fullName,
            parseInt(formData.age, 10),
            formData.phone,
            formData.sex,
            formData.education,
            parseFloat(formData.height),
            parseFloat(formData.weight),
            new Date().toISOString()
          ];
          await db.runAsync(query, args);
        } catch (dbError) {
          console.warn('SQLite error (ignored):', dbError);
        }
      }

      // Navigate to Dashboard (MainTabs)
      navigation.replace('MainTabs');
    } catch (error) {
      console.error(error);
      if (Platform.OS === 'web') {
        window.alert('Failed to save data');
      } else {
        Alert.alert('Error', 'Failed to save data');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to NeuroDetect</Text>
        <Text style={styles.subtitle}>Please provide your details to personalize your cognitive assessment plan.</Text>
      </View>

      <View style={styles.form}>
        <Input 
          label="Full Name" 
          value={formData.fullName} 
          onChangeText={t => updateForm('fullName', t)} 
          placeholder="e.g. John Doe"
        />
        <Input 
          label="Age" 
          value={formData.age} 
          onChangeText={t => updateForm('age', t)} 
          keyboardType="number-pad"
          placeholder="e.g. 65"
        />
        <Input 
          label="Phone Number" 
          value={formData.phone} 
          onChangeText={t => updateForm('phone', t)} 
          keyboardType="phone-pad"
          placeholder="e.g. +1 234 567 890"
        />
        <Select 
          label="Sex" 
          value={formData.sex} 
          options={sexOptions} 
          onSelect={v => updateForm('sex', v)} 
        />
        <Select 
          label="Education Level" 
          value={formData.education} 
          options={educationOptions} 
          onSelect={v => updateForm('education', v)} 
        />
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Input 
              label="Height (cm)" 
              value={formData.height} 
              onChangeText={t => updateForm('height', t)} 
              keyboardType="decimal-pad"
              placeholder="e.g. 170"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Input 
              label="Weight (kg)" 
              value={formData.weight} 
              onChangeText={t => updateForm('weight', t)} 
              keyboardType="decimal-pad"
              placeholder="e.g. 70"
            />
          </View>
        </View>

        <Button 
          title="Get Started" 
          onPress={handleSave} 
          loading={loading}
          style={{ marginTop: 20 }}
        />
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
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: colors.primary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: 'Inter_400Regular',
    lineHeight: 24,
  },
  form: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  }
});
