import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  type?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  title, 
  onPress, 
  style, 
  type = 'primary', 
  disabled = false,
  loading = false
}) => {
  const getBgColor = () => {
    if (disabled) return colors.border;
    switch (type) {
      case 'secondary': return 'transparent';
      case 'danger': return colors.danger;
      case 'primary':
      default: return colors.primary;
    }
  };

  const getTextColor = () => {
    if (type === 'secondary' && !disabled) return colors.primary;
    if (disabled) return '#888';
    return '#FFF';
  };

  return (
    <TouchableOpacity 
      style={[
        styles.button, 
        { backgroundColor: getBgColor() },
        type === 'secondary' && { borderWidth: 1, borderColor: colors.primary },
        style
      ]} 
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  text: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
});
