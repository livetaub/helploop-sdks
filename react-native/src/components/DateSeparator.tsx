import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { SupportHubTheme } from '../models/types';
import { formatDateSeparator } from '../utils/dateUtils';

interface DateSeparatorProps {
  /** ISO date string to display */
  date: string;
  /** Theme object for styling */
  theme: SupportHubTheme;
}

/**
 * A centered date label with hairline dividers on either side.
 * Used between message groups from different days.
 */
export const DateSeparator: React.FC<DateSeparatorProps> = ({ date, theme }) => {
  const lineColor = theme.mutedTextColor + '40'; // 25% opacity

  return (
    <View style={styles.container}>
      <View style={[styles.line, { backgroundColor: lineColor }]} />
      <Text style={[styles.text, { color: theme.mutedTextColor }]}>
        {formatDateSeparator(date)}
      </Text>
      <View style={[styles.line, { backgroundColor: lineColor }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 12,
    letterSpacing: 0.3,
  },
});
