import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

interface UnreadBadgeProps {
  /** The unread message count to display */
  count: number;
  /** The child element to wrap (e.g., a button or icon) */
  children: React.ReactNode;
  /** Custom badge background color (defaults to red #EF4444) */
  color?: string;
}

/**
 * Wraps children with an absolute-positioned unread count badge.
 * The badge animates in/out with a scale effect when the count changes.
 * Hidden when count is 0 or negative.
 */
export const UnreadBadge: React.FC<UnreadBadgeProps> = ({
  count,
  children,
  color = '#EF4444',
}) => {
  const scaleAnim = useRef(new Animated.Value(count > 0 ? 1 : 0)).current;
  const prevCountRef = useRef(count);

  useEffect(() => {
    const prevCount = prevCountRef.current;
    prevCountRef.current = count;

    if (count > 0 && prevCount <= 0) {
      // Animate badge in
      scaleAnim.setValue(0);
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 200,
        useNativeDriver: true,
      }).start();
    } else if (count <= 0 && prevCount > 0) {
      // Animate badge out
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    } else if (count > 0 && count !== prevCount) {
      // Pulse animation on count change
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [count, scaleAnim]);

  /** Format the display text — show "99+" for counts above 99 */
  const displayText = count > 99 ? '99+' : String(count);

  return (
    <View style={styles.wrapper}>
      {children}
      {count > 0 ? (
        <Animated.View
          style={[
            styles.badge,
            { backgroundColor: color, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Text style={styles.badgeText}>{displayText}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
