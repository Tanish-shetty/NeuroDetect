import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import Slider from '@react-native-community/slider';
import { colors } from '../theme/colors';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Ionicons } from '@expo/vector-icons';

export default function UploadScreen() {
  const [history, setHistory] = useState([
    { id: 1, name: 'MRI_Scan_2026.nii', date: 'Oct 12, 2026', status: 'Processed' },
    { id: 2, name: 'Clinical_Notes.pdf', date: 'Oct 14, 2026', status: 'Pending' },
    { id: 3, name: 'Old_Scan.dicom', date: 'Oct 15, 2026', status: 'Failed' },
  ]);

  const [modalVisible, setModalVisible] = useState(false);
  const [mmse, setMmse] = useState(28);
  const [moca, setMoca] = useState(26);
  const [memoryComplaints, setMemoryComplaints] = useState(false);
  
  // ADL Scores
  const [adlFinancial, setAdlFinancial] = useState(5);
  const [adlAppointment, setAdlAppointment] = useState(5);
  const [adlMedication, setAdlMedication] = useState(5);
  const [adlNavigation, setAdlNavigation] = useState(5);
  const [adlGadget, setAdlGadget] = useState(5);

  const [speech, setSpeech] = useState('Normal');
  const [familyHistory, setFamilyHistory] = useState(false);
  const [medications, setMedications] = useState('');

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Processed': return colors.success;
      case 'Pending': return colors.warning;
      case 'Failed': return colors.danger;
      default: return colors.textSecondary;
    }
  };

  const StarRating = ({ label, value, onChange }: { label: string, value: number, onChange: (val: number) => void }) => {
    return (
      <View style={styles.starRow}>
        <Text style={styles.starLabel}>{label}</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map(star => (
            <TouchableOpacity key={star} onPress={() => onChange(star)}>
              <Ionicons 
                name={star <= value ? 'star' : 'star-outline'} 
                size={24} 
                color={star <= value ? colors.warning : colors.border} 
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const handleSubmit = () => {
    // Mock saving to localStorage/state
    const newEntry = {
      id: Date.now(),
      name: `Manual_Entry_${new Date().toISOString().split('T')[0]}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'Processed'
    };
    setHistory([newEntry, ...history]);
    setModalVisible(false);
    
    // Reset form
    setMmse(28);
    setMoca(26);
    setMemoryComplaints(false);
    setAdlFinancial(5);
    setAdlAppointment(5);
    setAdlMedication(5);
    setAdlNavigation(5);
    setAdlGadget(5);
    setSpeech('Normal');
    setFamilyHistory(false);
    setMedications('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Data Upload</Text>
      
      <Card style={styles.uploadCard}>
        <View style={styles.uploadHeader}>
          <Ionicons name="scan-outline" size={24} color={colors.primary} />
          <Text style={styles.uploadTitle}>MRI Scan Upload</Text>
        </View>
        <Text style={styles.uploadDesc}>Supported formats: NIfTI, DICOM, JPG, PNG</Text>
        <TouchableOpacity style={styles.dropZone}>
          <Ionicons name="cloud-upload-outline" size={32} color={colors.textSecondary} />
          <Text style={styles.dropText}>Tap to select file</Text>
        </TouchableOpacity>
      </Card>

      <Card style={styles.uploadCard}>
        <View style={styles.uploadHeader}>
          <Ionicons name="document-text-outline" size={24} color={colors.secondary} />
          <Text style={styles.uploadTitle}>Clinical Reports</Text>
        </View>
        <Text style={styles.uploadDesc}>Supported formats: PDF, JPG</Text>
        <TouchableOpacity style={styles.dropZone}>
          <Ionicons name="cloud-upload-outline" size={32} color={colors.textSecondary} />
          <Text style={styles.dropText}>Tap to select file</Text>
        </TouchableOpacity>
      </Card>

      <Card style={styles.uploadCard}>
        <View style={styles.uploadHeader}>
          <Ionicons name="create-outline" size={24} color={colors.warning} />
          <Text style={styles.uploadTitle}>Enter Data Manually</Text>
        </View>
        <Text style={styles.uploadDesc}>Input clinical scores and behavioral observations directly.</Text>
        <Button 
          title="Open Entry Form" 
          type="secondary"
          onPress={() => setModalVisible(true)} 
          style={{ marginTop: 8 }}
        />
      </Card>

      <Text style={styles.sectionTitle}>Upload History</Text>
      {history.map((item) => (
        <Card key={item.id} style={styles.historyCard}>
          <View style={styles.historyRow}>
            <View style={styles.historyInfo}>
              <Ionicons name="document-outline" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <View>
                <Text style={styles.historyName}>{item.name}</Text>
                <Text style={styles.historyDate}>{item.date}</Text>
              </View>
            </View>
            <View style={[styles.statusChip, { borderColor: getStatusColor(item.status) }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
            </View>
          </View>
          {item.status === 'Pending' && (
            <View style={styles.stepperContainer}>
              <View style={styles.step}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.stepText}>Uploaded</Text>
              </View>
              <View style={styles.stepLineActive} />
              <View style={styles.step}>
                <Ionicons name="time" size={16} color={colors.warning} />
                <Text style={[styles.stepText, { color: colors.warning }]}>Processing</Text>
              </View>
              <View style={styles.stepLine} />
              <View style={styles.step}>
                <Ionicons name="ellipse-outline" size={16} color={colors.border} />
                <Text style={styles.stepText}>Analysis</Text>
              </View>
            </View>
          )}
        </Card>
      ))}

      {/* Manual Entry Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView 
          style={{ flex: 1, backgroundColor: colors.background }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Manual Data Entry</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.formSectionTitle}>Cognitive Scores</Text>
            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>MMSE Score: {mmse}/30</Text>
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={0}
                maximumValue={30}
                step={1}
                value={mmse}
                onValueChange={setMmse}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
              />
            </View>
            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>MoCA Score: {moca}/30</Text>
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={0}
                maximumValue={30}
                step={1}
                value={moca}
                onValueChange={setMoca}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Memory Complaints?</Text>
              <Switch 
                value={memoryComplaints} 
                onValueChange={setMemoryComplaints} 
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            <Text style={styles.formSectionTitle}>ADL Score Sections (1-5)</Text>
            <Card style={styles.adlCard}>
              <StarRating label="Financial management" value={adlFinancial} onChange={setAdlFinancial} />
              <StarRating label="Appointment keeping" value={adlAppointment} onChange={setAdlAppointment} />
              <StarRating label="Medication management" value={adlMedication} onChange={setAdlMedication} />
              <StarRating label="Navigation ability" value={adlNavigation} onChange={setAdlNavigation} />
              <StarRating label="Gadget usage" value={adlGadget} onChange={setAdlGadget} />
            </Card>

            <Text style={styles.formSectionTitle}>Clinical Observations</Text>
            <Select 
              label="Speech observations"
              value={speech}
              onSelect={setSpeech}
              options={[
                { label: 'Normal', value: 'Normal' },
                { label: 'Occasional pauses', value: 'Occasional pauses' },
                { label: 'Frequent pauses', value: 'Frequent pauses' },
                { label: 'Word finding difficulty', value: 'Word finding difficulty' }
              ]}
            />
            
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Family history of dementia?</Text>
              <Switch 
                value={familyHistory} 
                onValueChange={setFamilyHistory} 
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            <Input 
              label="Current medications (optional)" 
              placeholder="e.g. Donepezil, Memantine"
              value={medications}
              onChangeText={setMedications}
            />

            <Button title="Submit Data" onPress={handleSubmit} style={{ marginTop: 24 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    marginBottom: 24,
  },
  uploadCard: {
    marginBottom: 16,
  },
  uploadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginLeft: 8,
  },
  uploadDesc: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginBottom: 16,
  },
  dropZone: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  historyCard: {
    marginBottom: 12,
    padding: 16,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  historyDate: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFF',
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  step: {
    alignItems: 'center',
    flex: 1,
  },
  stepText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
    marginTop: 4,
  },
  stepLine: {
    height: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginHorizontal: -8,
  },
  stepLineActive: {
    height: 2,
    flex: 1,
    backgroundColor: colors.primary,
    marginHorizontal: -8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#FFF',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 60,
  },
  formSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 16,
  },
  sliderRow: {
    marginBottom: 20,
  },
  sliderLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  adlCard: {
    padding: 16,
    marginBottom: 24,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  starLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
