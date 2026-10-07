# react-native-kerabie-helpdesk

Embed the [Kerabie](https://kerabie.com) help desk into any React Native or Expo app.
Full TypeScript support, real-time chat, push notifications, contextual help, and multi-app analytics.

## Contents

- [Installation](#installation)
- [Provider setup](#provider-setup)
- [KerAbieProvider props](#kerAbieProvider-props)
- [Hooks](#hooks)
  - [useKerAbieChat](#usekerAbieChat)
  - [useKerAbieUser](#usekerAbieUser)
  - [useKerAbieApp](#usekerAbieApp)
  - [useKerAbieNotifications](#usekerAbieNotifications)
- [Components](#components)
  - [KerAbieFloatingButton](#kerAbieFloatingButton)
  - [KerAbieChatScreen](#kerAbieChatScreen)
- [Types](#types)
- [Open modes in depth](#open-modes-in-depth)
- [Campaigns](#campaigns)
- [Notification setup](#notification-setup)
  - [Android — register channels first](#android--register-channels-first)
  - [One-call setup](#one-call-setup)
- [Contextual chat](#contextual-chat)
  - [Product click](#product-click)
  - [Order inquiry](#order-inquiry)
  - [Fintech transaction](#fintech-transaction)
  - [Ride sharing](#ride-sharing)
- [User identity](#user-identity)

---

## Installation

```bash
# Expo managed workflow
npx expo install react-native-kerabie-helpdesk @react-native-async-storage/async-storage

# Bare React Native
npm install react-native-kerabie-helpdesk @react-native-async-storage/async-storage
npx pod-install
```

Optional peer dependencies (only install what you use):

```bash
# Required for openMode="sheet"
npx expo install @gorhom/bottom-sheet react-native-reanimated react-native-gesture-handler

# Required for push notifications
npx expo install expo-notifications
```

---

## Provider setup

`KerAbieProvider` must be an **ancestor** of every component that calls a `useKerAbie*` hook.
Place it below your gesture/safe-area wrappers but above your navigation stack.

### Expo Router (`app/_layout.tsx`)

```tsx
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { KerAbieProvider } from 'react-native-kerabie-helpdesk'
import Constants from 'expo-constants'

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KerAbieProvider              {/* ← below gesture/safe-area */}
          widgetKey="wk_yourorg_123"
          appName="My App"
          appVersion={Constants.expoConfig?.version ?? '1.0.0'}
          openMode="modal"
        >
          <Stack />                   {/* ← above navigation */}
        </KerAbieProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
```

### React Navigation (`App.tsx`)

For `openMode="push"`, `KerAbieProvider` must be **inside** `NavigationContainer`.
For `openMode="modal"` it can go either side, but inside is safer.

```tsx
import { NavigationContainer } from '@react-navigation/native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KerAbieProvider } from 'react-native-kerabie-helpdesk'

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <KerAbieProvider widgetKey="wk_yourorg_123" appName="My App" appVersion="1.0.0">
          <MyRootNavigator />
        </KerAbieProvider>
      </NavigationContainer>
    </GestureHandlerRootView>
  )
}
```

---

## KerAbieProvider props

### Required

| Prop | Type | Description |
| ---- | ---- | ----------- |
| `widgetKey` | `string` | Your widget key from Kerabie dashboard → Settings → Chat Widget. Format: `wk_yourorg_xxx`. |
| `children` | `ReactNode` | Your app tree. |

### App identity

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `appName` | `string` | device package name | Human-readable app name shown in the agent sidebar and analytics filters (e.g. `"Delivery App"`). |
| `appVersion` | `string` | `"0.0.0"` | Semver string. Use `Constants.expoConfig?.version` to set automatically. |
| `appBuild` | `string` | `""` | iOS build number or Android `versionCode`. |

### Open mode

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `openMode` | `"modal" \| "sheet" \| "push"` | `"modal"` | How the chat screen opens. See [Open modes in depth](#open-modes-in-depth). |
| `navigation` | `"expo-router" \| "react-navigation" \| "custom"` | — | Required when `openMode="push"`. |
| `navigationRef` | `any` | — | Your navigation ref (React Navigation only). |
| `onOpenChat` | `() => void` | — | Called when chat opens. Use with `openMode="custom"` to navigate yourself. |
| `onCloseChat` | `() => void` | — | Called when chat closes. |

### Floating button

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `position` | `"bottom-right" \| "bottom-left" \| "top-right" \| "top-left"` | `"bottom-right"` | Position of the auto-rendered floating button. |
| `defaultOpen` | `boolean` | `false` | Open the chat immediately on mount. |
| `hideFloatingButton` | `boolean` | `false` | Hide the auto-rendered button. Use your own trigger with `useKerAbieChat().open()`. |

### User identity

| Prop | Type | Description |
| ---- | ---- | ----------- |
| `user` | `KerUser` | Initial visitor identity. Can also be set at runtime with `useKerAbieUser().setUser()`. |

### Appearance

All fields inside the `theme` object are optional.

| Field | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `theme.primaryColor` | `string` | `"rgb(78 121 105)"` | Accent colour for buttons, links, and agent bubbles. |
| `theme.backgroundColor` | `string` | `"#ffffff"` | Chat screen background. |
| `theme.textColor` | `string` | `"#0f172a"` | Body text colour. |
| `theme.bubbleColor` | `string` | same as `primaryColor` | Floating button background colour. |
| `theme.bubbleIcon` | `ImageSourcePropType` | 💬 emoji | Custom floating button icon. |
| `theme.bubbleSize` | `number` | `56` | Floating button diameter in points. |
| `theme.fontFamily` | `string` | system default | Font family applied to all widget text. |
| `theme.agentBubbleColor` | `string` | `"#f1f5f9"` | Background colour of agent message bubbles. |
| `theme.userBubbleColor` | `string` | same as `primaryColor` | Background colour of visitor message bubbles. |

### Chat settings (override dashboard)

| Field | Type | Description |
| ----- | ---- | ----------- |
| `chatSettings.welcomeMessage` | `string` | Text shown before the first message. `{{name}}` is replaced by the identified user's first name (dropped when unknown). |
| `chatSettings.offlineMessage` | `string` | Placeholder shown in the input when disconnected. |
| `chatSettings.showBranding` | `boolean` | Show "Powered by Kerabie" footer (Pro feature: set to `false` to hide). |
| `chatSettings.enableFileAttachments` | `boolean` | Allow visitors to send file attachments. |
| `chatSettings.enableVoiceMessages` | `boolean` | Allow visitors to record voice messages. |

### Notifications

| Field | Type | Description |
| ----- | ---- | ----------- |
| `notifications.provider` | `"expo"` | Push provider. Only `"expo"` is supported currently. |
| `notifications.getToken` | `() => Promise<string>` | Override the default Expo token fetch. |
| `notifications.onTokenRegister` | `(token: string) => void` | Called after the token is registered with Kerabie. |
| `notifications.onNotificationReceived` | `(n: KerNotification) => void` | Called when a Kerabie push notification arrives. |

---

## Hooks

All hooks must be called inside a component that is a descendant of `KerAbieProvider`.

### useKerAbieChat

Primary hook for controlling the chat and reading its state.

```tsx
const {
  isOpen,           // boolean       — is the chat screen currently visible?
  open,             // () => void    — open the chat
  close,            // () => void    — close the chat
  toggle,           // () => void    — toggle open/close
  unreadCount,      // number        — messages received while chat was closed
  conversations,    // KerConversation[]  — visitor's conversation list
  currentConversation,  // KerConversation | null
  messages,         // KerMessage[]  — messages in the active conversation
  sendMessage,      // (body: string, attachments?: KerAttachment[]) => Promise<void>
  isTyping,         // boolean       — an agent is currently typing
  onlineAgents,     // number        — agents currently online
  isConnected,      // boolean       — socket connected to Kerabie
} = useKerAbieChat()
```

**Example — custom help button with unread badge:**

```tsx
function HelpButton() {
  const { open, unreadCount } = useKerAbieChat()
  return (
    <Pressable onPress={open}>
      <Text>Help</Text>
      {unreadCount > 0 && <Text>{unreadCount}</Text>}
    </Pressable>
  )
}
```

---

### useKerAbieUser

Manage visitor identity. Call `setUser` after login and `clearUser` after logout.

```tsx
const {
  currentUser,      // KerUser | null — currently identified visitor
  setUser,          // (user: KerUser) => void
  clearUser,        // () => void — resets to anonymous session
  updateAttribute,  // (key: string, value: string) => void
} = useKerAbieUser()
```

`KerUser` fields:

| Field | Type | Description |
| ----- | ---- | ----------- |
| `id` | `string` | Your internal user ID. |
| `name` | `string` | Visitor name shown to agents. |
| `email` | `string` | Visitor email. |
| `phone` | `string` | Visitor phone number. |
| `role` | `string` | e.g. `"customer"`, `"driver"`, `"admin"`. |
| `customAttributes` | `Record<string, string>` | Any extra key-value pairs shown in the agent sidebar. |

**Example:**

```tsx
const { setUser, clearUser, updateAttribute } = useKerAbieUser()

// On login
setUser({ id: 'u_123', name: 'Ada Obi', email: 'ada@example.com', role: 'customer' })

// Attach live context — appears in agent sidebar immediately
updateAttribute('plan', 'pro')
updateAttribute('last_order', '#ORD-4521')

// On logout
clearUser()
```

---

### useKerAbieApp

Read or update app identity at runtime (e.g. after an OTA update changes the version).

```tsx
const {
  appName,        // string
  appVersion,     // string
  appBuild,       // string
  setAppVersion,  // (v: string) => void
} = useKerAbieApp()
```

---

### useKerAbieNotifications

Manage Expo push notification permissions and token registration.

```tsx
const {
  hasPermission,    // boolean        — user has granted push permission
  requestPermission,// () => Promise<boolean> — request OS permission
  registerToken,    // (token: string) => void — send token to Kerabie backend
} = useKerAbieNotifications()
```

**Example — full push setup alongside your existing notification config:**

```tsx
// Must be called inside a component that is inside KerAbieProvider
function NotificationSetup() {
  const { requestPermission, registerToken } = useKerAbieNotifications()

  useEffect(() => {
    requestPermission().then(async (granted) => {
      if (!granted) return
      const { data: token } = await Notifications.getExpoPushTokenAsync()
      registerToken(token)
    })
  }, [])

  return null
}

// In your layout, render it as a sibling of your navigation stack:
<KerAbieProvider widgetKey="..." appName="My App" appVersion="1.0.0">
  <NotificationSetup />
  <Stack />
</KerAbieProvider>
```

> `NotificationSetup` must be **inside** `KerAbieProvider` so `useKerAbieNotifications()` can access the context.

---

## Components

### KerAbieFloatingButton

The floating chat bubble. Rendered automatically by the provider unless `hideFloatingButton` is set. Use this component directly if you need to render it in a specific place (e.g. inside a tab bar).

```tsx
import { KerAbieFloatingButton } from 'react-native-kerabie-helpdesk'

<KerAbieFloatingButton
  size={56}           // number — button diameter, default 56
  badgeColor="#ef4444"// string — unread badge colour, default red
  style={styles.btn}  // ViewStyle — additional positioning/style
/>
```

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `size` | `number` | `56` | Button diameter in points. |
| `badgeColor` | `string` | `"#ef4444"` | Unread count badge background colour. |
| `style` | `ViewStyle` | — | Extra style applied to the wrapper `View`. |

---

### KerAbieChatScreen

Full chat screen. Used automatically by the provider for `openMode="modal"`. Use it directly when `openMode="push"` and you render it in your own navigator screen.

```tsx
import { KerAbieChatScreen } from 'react-native-kerabie-helpdesk'

<KerAbieChatScreen
  onClose={() => navigation.goBack()}
  theme={{ primaryColor: '#6d28d9' }}
/>
```

| Prop | Type | Required | Description |
| ---- | ---- | -------- | ----------- |
| `onClose` | `() => void` | Yes | Called when the user taps the close/back button. |
| `theme` | `KerTheme` | No | Theme override (merged with provider theme). |
| `chatSettings` | `KerChatSettings` | No | Override welcome/offline messages. |

---

## Types

```tsx
import type {
  KerAbieProviderProps,
  KerUser,
  KerTheme,
  KerChatSettings,
  KerNotificationConfig,
  KerMessage,
  KerAttachment,
  KerConversation,
  KerNotification,
  OpenMode,          // "modal" | "sheet" | "push"
  BubblePosition,    // "bottom-right" | "bottom-left" | "top-right" | "top-left"
  NavigationAdapter, // "expo-router" | "react-navigation" | "custom"
} from 'react-native-kerabie-helpdesk'
```

#### `KerMessage`

| Field | Type | Description |
| ----- | ---- | ----------- |
| `id` | `number \| string` | Message ID. |
| `body` | `string` | Message text. |
| `createdAt` | `string` | ISO 8601 timestamp. |
| `senderType` | `"visitor" \| "agent" \| "bot"` | Who sent the message. |
| `senderName` | `string` | Display name (agents/bot only). |
| `senderAvatar` | `string` | Avatar URL. |
| `attachments` | `KerAttachment[]` | File/image attachments. |
| `status` | `"sent" \| "delivered" \| "read" \| "failed"` | Delivery status (visitor messages). |

#### `KerConversation`

| Field | Type | Description |
| ----- | ---- | ----------- |
| `id` | `number` | Conversation ID. |
| `status` | `"open" \| "resolved" \| "closed"` | Current status. |
| `assignedAgent` | `{ id, name, avatar? }` | Assigned agent, if any. |
| `lastMessage` | `KerMessage` | Most recent message. |
| `unreadCount` | `number` | Unread message count. |
| `createdAt` | `string` | ISO timestamp. |
| `updatedAt` | `string` | ISO timestamp. |

#### `KerAttachment`

| Field | Type | Description |
| ----- | ---- | ----------- |
| `id` | `string` | Attachment ID. |
| `url` | `string` | Download/display URL. |
| `type` | `"image" \| "file" \| "audio" \| "video"` | Media type. |
| `name` | `string` | File name. |
| `size` | `number` | File size in bytes. |

---

## Open modes in depth

### `openMode="modal"` — recommended default

Renders a React Native `<Modal>` over your app. Works with **any** navigation setup, no extra configuration.

```tsx
<KerAbieProvider widgetKey="wk_xxx" openMode="modal">
  <YourApp />
</KerAbieProvider>
```

### `openMode="sheet"` — bottom sheet

Requires `@gorhom/bottom-sheet`. Chat slides up from the bottom; the content behind stays visible.

```bash
npx expo install @gorhom/bottom-sheet react-native-reanimated react-native-gesture-handler
```

```tsx
<KerAbieProvider widgetKey="wk_xxx" openMode="sheet">
  <YourApp />
</KerAbieProvider>
```

### `openMode="push"` — navigation stack

Pushes the chat screen onto your existing stack. The provider must be inside `NavigationContainer` (React Navigation) or at root level (Expo Router).

**Expo Router:**
```tsx
<KerAbieProvider widgetKey="wk_xxx" openMode="push" navigation="expo-router">
  <Stack />
</KerAbieProvider>
```

**React Navigation:**
```tsx
<KerAbieProvider
  widgetKey="wk_xxx"
  openMode="push"
  navigation="react-navigation"
  navigationRef={navigationRef}
>
  <MyNavigator />
</KerAbieProvider>
```

**Custom (any open mode) — control it yourself:**
```tsx
<KerAbieProvider
  widgetKey="wk_xxx"
  openMode="modal"
  hideFloatingButton
  onOpenChat={() => console.log('opened')}
  onCloseChat={() => console.log('closed')}
>
  <YourApp />
</KerAbieProvider>

// Then from any component:
const { open } = useKerAbieChat()
<Button onPress={open} title="Get Help" />
```

---

## Campaigns

Proactive messages you create in the dashboard (**Campaigns**) also appear in your app, above the launcher, with their button. The provider loads your live campaigns once per app launch; there is nothing to add to your code beyond the optional props below.

| Dashboard setting | In the app |
| ---- | ---- |
| Trigger **Page load** | Shown about 1.5 seconds after a screen appears (each time the `screen` prop changes). |
| Trigger **Time on page** | Shown after N seconds in the app. |
| Trigger **Scroll depth**, **Exit intent** | Website-only. These campaigns are not shown in apps. |
| **On pages** | Matched against the `screen` prop (for example Expo Router's `usePathname()`). Without the prop, only campaigns for every screen show. |
| **Audience** | New / returning means the first / a later app launch on this device; "hasn't chatted" checks this device's conversations; country is decided by the server from the device's IP. |
| **Frequency** | Remembered on the device: once per visitor, once per day, or once per app launch. |
| Button **Open chat** / **Open a link** | Opens the chat / the link in the browser. |
| Button **Open Knowledge Base** | Calls your `onOpenKnowledgeBase` (the chat has no built-in Knowledge Base screen); opens the chat if you don't pass it. |

```tsx
import { usePathname, router } from 'expo-router';

<KerAbieProvider
  widgetKey="wk_yourorg_xxx"
  screen={usePathname()}
  onOpenKnowledgeBase={() => router.push('/help')}
>
```

Campaign results (shown, opened, clicked, replied) are counted in the dashboard like they are for the website widget. Nothing pops up while the chat is open.

## Notification setup

Kerabie push notifications deep-link directly to the conversation that triggered them.

### Android — register channels first

> **Android 8+ (API 26+) requirement:** Without a registered notification channel, push notifications are **silently dropped**. You must call `NotificationService.setup()` before the provider renders.

```tsx
// app/_layout.tsx or App.tsx — BEFORE KerAbieProvider renders
import { NotificationService } from 'react-native-kerabie-helpdesk'

useEffect(() => {
  NotificationService.setup({
    projectId: 'your-expo-project-id',  // from app.json expo.extra.eas.projectId
  })
}, [])
```

This single call does everything:
1. Registers Android notification channels (`kerabie_messages`, `kerabie_visitor`, `kerabie_system`)
2. Requests OS permission from the user
3. Gets the Expo push token
4. Registers the token with the Kerabie API

### Custom Android channels

Override the default channels to match your app branding:

```tsx
import { NotificationService } from 'react-native-kerabie-helpdesk'
import type { KerAndroidChannel } from 'react-native-kerabie-helpdesk'

const MY_CHANNELS: KerAndroidChannel[] = [
  {
    channelId: 'support_chat',
    name: 'Support Messages',
    importance: 'high',
    sound: 'default',
    enableVibrate: true,
  },
]

NotificationService.setup({ channels: MY_CHANNELS })
```

### app.json — required config

```json
{
  "expo": {
    "android": {
      "permissions": ["NOTIFICATIONS"],
      "googleServicesFile": "./google-services.json"
    },
    "plugins": [
      ["expo-notifications", {
        "icon": "./assets/notification-icon.png",
        "color": "#4e7969",
        "defaultChannel": "kerabie_messages"
      }]
    ]
  }
}
```

### One-call setup

```tsx
import { NotificationService } from 'react-native-kerabie-helpdesk'

// In your root layout, before the provider:
useEffect(() => {
  NotificationService.setup({
    projectId: 'your-expo-project-id',
    onTokenReceived: (token) => console.log('Registered:', token),
  })
}, [])
```

### Manual setup (fine-grained control)

```tsx
import * as Notifications from 'expo-notifications'
import { useKerAbieNotifications } from 'react-native-kerabie-helpdesk'

// Set your global handler (module level, outside any component)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

// Inside a component that is inside KerAbieProvider:
function NotificationSetup() {
  const { requestPermission, registerToken } = useKerAbieNotifications()

  useEffect(() => {
    requestPermission().then(async (granted) => {
      if (!granted) return
      const { data: token } = await Notifications.getExpoPushTokenAsync()
      registerToken(token)
    })
  }, [])

  return null
}
```

---

## Contextual chat

Open the chat widget with a pre-loaded context so agents immediately see what the user needs help with — without the user having to explain it.

Use `openWithContext` from `useKerAbieContext()` (or `useKerAbieChat()`). The context is sent to the Kerabie backend and shown to the agent in the conversation.

### Product click

```tsx
import { useKerAbieContext } from 'react-native-kerabie-helpdesk'

function ProductCard({ product }) {
  const { openWithContext } = useKerAbieContext()

  return (
    <Pressable onPress={() => openWithContext({
      type: 'product',
      id: String(product.id),
      title: product.name,
      data: {
        price: `₦${product.price}`,
        category: product.category,
        sku: product.sku,
      },
    })}>
      <Text>Ask about this product</Text>
    </Pressable>
  )
}
```

Agent sees: **"Product — Blue Sneakers"** with price, category, SKU.

### Order inquiry

```tsx
const { openWithContext } = useKerAbieContext()

<Button onPress={() => openWithContext({
  type: 'order',
  id: order.reference,
  title: `Order ${order.reference}`,
  data: {
    status: order.status,
    total: `₦${order.total}`,
    placedAt: order.createdAt,
    items: order.itemCount,
  },
})}>
  Get help with this order
</Button>
```

### Fintech transaction

```tsx
openWithContext({
  type: 'transaction',
  id: txn.id,
  title: `₦${txn.amount} ${txn.type}`,
  data: {
    status: txn.status,          // "failed", "pending", "success"
    recipient: txn.recipientName,
    narration: txn.narration,
    reference: txn.reference,
  },
})
```

### Ride sharing

```tsx
openWithContext({
  type: 'ride',
  id: ride.id,
  title: `Trip to ${ride.destination}`,
  data: {
    driver: ride.driverName,
    fare: `₦${ride.fare}`,
    status: ride.status,
    startedAt: ride.startedAt,
  },
})
```

### Context types

| `type` | Best for |
|---|---|
| `product` | E-commerce — user asking about an item |
| `order` | Order status, returns, refunds |
| `transaction` | Fintech — failed or disputed payment |
| `ride` | Ride-sharing — trip issue or complaint |
| `errand` | Delivery or logistics issue |
| `booking` | Appointment or reservation |
| `custom` | Anything else — set a descriptive `title` |

### Open without showing the chat

Pass `openChat: false` if you only want to set context (e.g. pre-load on screen mount) without immediately opening the widget:

```tsx
openWithContext({
  type: 'order',
  id: order.id,
  title: `Order ${order.reference}`,
  openChat: false,  // context is stored; chat opens later when user taps the button
})
```

---

## User identity

When a user logs in, call `setUser` so agents see who they're talking to:

```tsx
const { setUser, clearUser, updateAttribute } = useKerAbieUser()

// On login
setUser({
  id: currentUser.id,      // your internal ID
  name: currentUser.name,
  email: currentUser.email,
  role: 'customer',
  customAttributes: {
    plan: currentUser.plan,
    signedUpAt: currentUser.createdAt,
  },
})

// Add live context at any point (shows in agent sidebar immediately)
updateAttribute('cart_value', '₦12,500')
updateAttribute('last_error', 'CheckoutScreen: undefined is not an object')

// On logout — starts a fresh anonymous session
clearUser()
```

---

## Deep links — notification tap navigation

When a user taps a push notification, the SDK opens the correct conversation automatically.
This works via the `kerabie://conversation/:id` URI scheme.

### app.json — required config

```json
{
  "expo": {
    "scheme": "kerabie",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [{ "scheme": "kerabie" }],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.yourapp",
      "associatedDomains": ["applinks:kerabie.com"]
    }
  }
}
```

### How it works

The SDK registers a `Linking` listener automatically inside `KerAbieProvider`.
When a notification is tapped:
1. OS opens your app with the URL `kerabie://conversation/123`
2. `KerAbieDeepLinkService` intercepts the URL
3. The chat widget opens and scrolls to conversation 123

No extra setup needed — just add the `app.json` config above.

### Custom scheme

If your app already uses a different scheme:

```tsx
// In the deep link handler init (you don't call this directly — 
// the provider handles it, but you can override via KerAbieDeepLinkService)
KerAbieDeepLinkService.init({
  scheme: 'myapp',  // uses myapp://conversation/123 instead
  onConversation: (id) => { /* custom handler */ },
})
```

### Send the deep link in Expo push notifications (backend)

When the Kerabie backend sends an Expo push notification, it includes:

```json
{
  "to": "ExponentPushToken[...]",
  "title": "New message",
  "body": "You have a new message",
  "data": {
    "url": "kerabie://conversation/123",
    "conversationId": 123
  }
}
```

The `expo-notifications` handler in your app should call `Linking.openURL(notification.request.content.data.url)` on tap.

---

## License

MIT

## Building with an AI assistant

The [`@kerabie/mcp`](https://kerabie.com/docs/sdks/mcp) server gives Claude, Cursor and other MCP clients this package's docs and types, so they use the provider, hooks and components correctly instead of guessing. It needs no API key:

```json
{ "mcpServers": { "kerabie": { "command": "npx", "args": ["-y", "@kerabie/mcp"] } } }
```

Ask the assistant to use the `integrate_react_native` prompt, or the `get_integration_guide` and `get_sdk_types` tools.
