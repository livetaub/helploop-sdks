import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import type { SupportHubTheme } from '../models/types';

interface LoadingIndicatorProps {
  /** Optional loading message displayed below the spinner */
  message?: string;
  /** Theme object for styling */
  theme: SupportHubTheme;
}

/**
 * A centered loading spinner with an optional descriptive message.
 */
export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ message, theme }) => {
  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <ActivityIndicator size="large" color={theme.primaryColor} />
      {message ? (
        <Text style={[styles.message, { color: theme.mutedTextColor }]}>{message}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: 14,
    marginTop: 12,
    letterSpacing: 0.2,
  },
});
