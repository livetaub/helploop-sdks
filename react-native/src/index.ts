export { HelpLoop } from './HelpLoop';
export type { HelpLoopConfig, UserIdentity } from './HelpLoop';

import React, { useState, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native';
import { HelpLoop } from './HelpLoop';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useHelpLoopUnreadCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    HelpLoop.getUnreadCount().then(c => {
      if (mounted) setCount(c);
    });
    return () => { mounted = false; };
  }, []);

  return count;
}

const STORAGE_KEY = '@helploop_guest_identity';

export const HelpLoopWidget: React.FC = () => {
  const [uri, setUri] = React.useState<string | null>(null);

  React.useEffect(() => {
    // If not already identified, try loading from storage
    const init = async () => {
      try {
        if (!HelpLoop.hasIdentity()) {
          const stored = await AsyncStorage.getItem(STORAGE_KEY);
          if (stored) {
            const data = JSON.parse(stored);
            await HelpLoop.identify({ externalId: data.externalId || 'guest', email: data.email, name: data.name });
          }
        }
      } catch (e) {}
      setUri(HelpLoop.getWidgetUrl());
    };
    init();
  }, []);

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.email) {
        const guestData = { externalId: 'guest', email: data.email, name: data.name };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(guestData));
        await HelpLoop.identify(guestData);
      }
    } catch (e) {}
  };

  if (!uri) return null;

  return React.createElement(SafeAreaView, { style: { flex: 1, backgroundColor: 'transparent' } }, 
    React.createElement(WebView, { 
      source: { uri }, 
      style: { flex: 1 },
      onMessage: handleMessage
    })
  );
};
