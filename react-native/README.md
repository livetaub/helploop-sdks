# HelpLoop React Native SDK

Add a beautiful, fully-featured support messaging experience to any React Native app — in minutes.

Dark-first design with indigo primary, optimistic messaging, unread badges, and image attachments. No external UI libraries required.

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Initialization](#initialization)
4. [User Identification](#user-identification)
5. [Opening the Messaging Screen](#opening-the-messaging-screen)
6. [Unread Badge](#unread-badge)
7. [Push Notifications](#push-notifications)
8. [Hooks Reference](#hooks-reference)
9. [Components](#components)
10. [Customization](#customization)
11. [TypeScript](#typescript)
12. [API Reference](#api-reference)

---

## Installation

```bash
# npm
npm install helploop-react-native

# yarn
yarn add helploop-react-native
```

### Peer Dependencies

The SDK requires the following peer dependencies:

```bash
npm install @react-native-async-storage/async-storage react-native-image-picker react-native-webview
```

| Dependency | Purpose |
|---|---|
| `@react-native-async-storage/async-storage` | Persistent storage for user identity & session |
| `react-native-webview` | In-app WebView that renders the hosted chat widget |
| `react-native-image-picker` | Image attachment support (optional — degrades gracefully) |

> **iOS:** Run `npx pod-install` after installing.

---

## Quick Start

Get up and running in 4 steps:

```tsx
import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { HelpLoop, HelpLoopWidget, useHelpLoopUnreadCount } from 'helploop-react-native';

// Step 1: Initialize (once, e.g., in App.tsx)
await HelpLoop.initialize({
  projectId: 'your-project-id',
  apiKey: 'your-api-key',
});

// Step 2: Identify the user
await HelpLoop.identify({
  externalId: 'user-123',
  name: 'Jane Doe',
  email: 'jane@example.com',
});

// Step 3: Add a support button with unread badge
function SupportButton({ onPress }: { onPress: () => void }) {
  const count = useHelpLoopUnreadCount();

  return (
    <TouchableOpacity onPress={onPress}>
      <Text>💬 Support{count > 0 ? ` (${count})` : ''}</Text>
    </TouchableOpacity>
  );
}

// Step 4: Show the chat — an embedded WebView, so UI changes ship without an app update
function SupportScreen() {
  return <HelpLoopWidget />;
}
```

---

## Initialization

Initialize the SDK once during app startup, before any other SDK calls:

```tsx
import { HelpLoop } from 'helploop-react-native';

await HelpLoop.initialize({
  projectId: 'your-project-id',
  apiKey: 'your-api-key',

  // Optional overrides:
  apiUrl: 'https://custom-api.example.com',  // Custom API endpoint
  pollIntervalMs: 15000,                       // Poll every 15s (default: 30s)
});
```

### Config Options

| Property | Type | Required | Default | Description |
|---|---|---|---|---|
| `projectId` | `string` | ✅ | — | Your HelpLoop project ID |
| `apiKey` | `string` | ✅ | — | Your HelpLoop API key |
| `apiUrl` | `string` | — | Auto-generated | Custom API base URL |
| `pollIntervalMs` | `number` | — | `30000` | Polling interval in milliseconds |

---

## User Identification

### Identify a Known User

```tsx
await HelpLoop.identify({
  externalId: 'user-123',          // Required — your unique user ID
  email: 'jane@example.com',       // Optional
  name: 'Jane Doe',                // Optional
  company: 'Acme Inc',             // Optional
  subscriptionTier: 'pro',         // Optional
  identifierType: 'email',         // Optional: 'email' | 'device' | 'custom' | 'anonymous'
  metadata: {                      // Optional: arbitrary key-value pairs
    plan: 'enterprise',
    signupDate: '2024-01-15',
  },
});
```

### Anonymous Users

```tsx
// Generates and persists a unique anonymous ID
await HelpLoop.identifyAnonymous();
```

### Check Current User

```tsx
const user = HelpLoop.getCurrentUser();
// Returns UserIdentity | null
```

### Logout

```tsx
await HelpLoop.logout();
// Stops polling, clears storage, resets all SDK state
```

---

## Opening the Chat (Embedded WebView)

The chat UI is the hosted web widget rendered inside your app via `react-native-webview`.
This keeps the chat server-driven: redeploy the web widget and every user sees the
latest version without updating the app.

### With React Navigation

```tsx
import { HelpLoopWidget } from 'helploop-react-native';

// In your navigator:
<Stack.Screen name="Support" component={HelpLoopWidget} />

// Navigate to it:
navigation.navigate('Support');
```

### Standalone (No React Navigation)

```tsx
import { useState } from 'react';
import { Modal } from 'react-native';
import { HelpLoopWidget } from 'helploop-react-native';

function SupportChat() {
  const [visible, setVisible] = useState(false);
  return (
    <Modal visible={visible} onRequestClose={() => setVisible(false)}>
      <HelpLoopWidget />
    </Modal>
  );
}
```

---

## Unread Badge

### Using the Component

```tsx
import { UnreadBadge, useUnreadCount } from 'helploop-react-native';

function SupportTab() {
  const { count } = useUnreadCount();

  return (
    <UnreadBadge count={count} color="#EF4444">
      <TabIcon name="chat" />
    </UnreadBadge>
  );
}
```

### Using the Hook Directly

```tsx
const { count, loading, refresh } = useUnreadCount();

// Display inline
<Text>You have {count} unread messages</Text>
```

### Subscribing to Changes (Non-React)

```tsx
const unsubscribe = HelpLoop.onUnreadCountChanged((count) => {
  console.log('Unread count:', count);
  updateBadge(count);
});

// Later:
unsubscribe();
```

---

## Push Notifications

Register a device token after identifying the user:

```tsx
import messaging from '@react-native-firebase/messaging';
import { HelpLoop } from 'helploop-react-native';

// Get the FCM token
const token = await messaging().getToken();

// Register with HelpLoop
await HelpLoop.registerDeviceToken(token, Platform.OS as 'ios' | 'android');
```

### Unregister on Logout

```tsx
await HelpLoop.unregisterDeviceToken(token);
await HelpLoop.logout();
```

---

## Hooks Reference

### `useHelpLoop()`

Access core SDK state.

```tsx
const { isInitialized, currentUser, settings } = useHelpLoop();
```

| Return | Type | Description |
|---|---|---|
| `isInitialized` | `boolean` | Whether the SDK is initialized |
| `currentUser` | `UserIdentity \| null` | Current identified user |
| `settings` | `ProjectSettings \| null` | Project settings (branding, etc.) |

### `useUnreadCount()`

Track unread messages with automatic polling.

```tsx
const { count, loading, refresh } = useUnreadCount();
```

| Return | Type | Description |
|---|---|---|
| `count` | `number` | Current unread message count |
| `loading` | `boolean` | Whether a fetch is in progress |
| `refresh` | `() => Promise<void>` | Manually refresh the count |

### `useConversations()`

Fetch and manage conversations.

```tsx
const { conversations, loading, error, refresh, createConversation } = useConversations();
```

| Return | Type | Description |
|---|---|---|
| `conversations` | `Conversation[]` | List of conversations (newest first) |
| `loading` | `boolean` | Whether a fetch is in progress |
| `error` | `Error \| null` | Last error, if any |
| `refresh` | `() => Promise<void>` | Re-fetch the list |
| `createConversation` | `(message: string, subject?: string) => Promise<Conversation \| null>` | Create a new conversation |

### `useMessages(conversationId)`

Manage messages within a single conversation.

```tsx
const { messages, loading, error, hasMore, loadMore, sendMessage, markAsRead, refresh } = useMessages(conversationId);
```

| Return | Type | Description |
|---|---|---|
| `messages` | `Message[]` | Messages sorted chronologically (oldest first) |
| `loading` | `boolean` | Whether initial fetch is in progress |
| `error` | `Error \| null` | Last error, if any |
| `hasMore` | `boolean` | Whether older messages can be loaded |
| `loadMore` | `() => Promise<void>` | Load the next page of older messages |
| `sendMessage` | `(content: string, contentType?: string) => Promise<Message \| null>` | Send a message (optimistically added) |
| `markAsRead` | `() => Promise<void>` | Mark all messages as read |
| `refresh` | `() => Promise<void>` | Re-fetch the first page |

---

## Components

### `<HelpLoopWidget />`

The main chat screen — the hosted web widget embedded in an in-app WebView
(`react-native-webview`). Takes no props; it builds its URL from the current
`HelpLoop` configuration and identity. When a guest enters their email in the
widget, it is persisted on-device so they are not asked again.

```tsx
import { HelpLoopWidget } from 'helploop-react-native';

function SupportScreen() {
  return <HelpLoopWidget />;
}
```

### `<UnreadBadge />`

Animated unread count badge.

| Prop | Type | Required | Description |
|---|---|---|---|
| `count` | `number` | ✅ | The unread count to display |
| `children` | `ReactNode` | ✅ | The element to wrap |
| `color` | `string` | — | Badge color (default: `#EF4444`) |

### `<MessageBubble />`

Individual chat message bubble.

| Prop | Type | Required | Description |
|---|---|---|---|
| `message` | `Message` | ✅ | The message to render |
| `theme` | `HelpLoopTheme` | ✅ | Theme object |
| `showReadIndicators` | `boolean` | ✅ | Show ✓/✓✓ on user messages |
| `isLastInGroup` | `boolean` | — | Adjusts border radius and spacing |
| `onImagePress` | `(url: string) => void` | — | Image tap handler |

---

## Customization

### Theme System

The SDK uses a dark-first theme system. Colors are derived from your project settings:

```tsx
import { createTheme } from 'helploop-react-native';

// Default dark indigo theme
const theme = createTheme();

// Theme from project settings
const theme = createTheme({
  brandingPrimaryColor: '#8B5CF6',  // Purple primary
  brandingBgColor: '#1A1A2E',       // Deep navy background
});
```

### Theme Properties

| Property | Default | Description |
|---|---|---|
| `primaryColor` | `#6366F1` | Primary accent color (buttons, badges) |
| `backgroundColor` | `#0F172A` | Screen background |
| `surfaceColor` | `#1E293B` | Cards, headers, input areas |
| `textColor` | `#F1F5F9` | Primary text |
| `mutedTextColor` | `#94A3B8` | Secondary text, timestamps |
| `userBubbleColor` | `primaryColor` | User message bubble background |
| `agentBubbleColor` | `#1E293B` | Agent message bubble background |
| `borderRadius` | `16` | Default border radius |

### Project Settings

Branding is automatically applied from your project's dashboard settings:

- **Widget title** — header text
- **Welcome message** — shown before the first conversation
- **Primary color** — buttons, user bubbles, accents
- **Background color** — screen background
- **Read indicators** — show/hide ✓✓ on messages

---

## TypeScript

All types are fully exported:

```tsx
import type {
  HelpLoopConfig,
  UserIdentity,
  Conversation,
  Message,
  Attachment,
  ProjectSettings,
  HelpLoopTheme,
  PaginatedMessages,
  UnreadCountResponse,
} from 'helploop-react-native';

import { HelpLoopError } from 'helploop-react-native';
```

### Key Interfaces

```typescript
interface Conversation {
  id: string;
  subject?: string;
  status: 'new' | 'open' | 'pending' | 'waiting_for_user' | 'resolved' | 'closed';
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadUserCount: number;
  createdAt: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderType: 'end_user' | 'agent' | 'system';
  senderId: string;
  content: string;
  contentType: 'text' | 'image' | 'system';
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
  readAt?: string;
  attachments?: Attachment[];
}
```

---

## API Reference

### Static Methods on `HelpLoop`

| Method | Returns | Description |
|---|---|---|
| `initialize(config)` | `Promise<void>` | Initialize the SDK (call once) |
| `getInstance()` | `HelpLoop` | Get the singleton instance |
| `identify(identity)` | `Promise<void>` | Identify a known user |
| `identifyAnonymous()` | `Promise<void>` | Identify as anonymous user |
| `getCurrentUser()` | `UserIdentity \| null` | Get current user |
| `getUnreadCount()` | `Promise<number>` | Fetch unread count |
| `onUnreadCountChanged(listener)` | `() => void` | Subscribe to unread changes (returns unsubscribe) |
| `getSettings()` | `Promise<ProjectSettings>` | Get project settings |
| `registerDeviceToken(token, platform)` | `Promise<void>` | Register push notification token |
| `unregisterDeviceToken(token)` | `Promise<void>` | Unregister push token |
| `logout()` | `Promise<void>` | Logout and clear state |

### Instance Methods

| Method | Returns | Description |
|---|---|---|
| `getApiClient()` | `ApiClient` | Get the underlying API client |
| `getPollIntervalMs()` | `number` | Get the configured poll interval |

---

## License

MIT
