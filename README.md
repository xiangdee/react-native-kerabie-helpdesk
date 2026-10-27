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
  - [KerAbieWidget](#kerAbieWidget)
  - [KerAbieChatScreen](#kerAbieChatScreen)
- [The widget](#the-widget)
- [Types](#types)
- [Open modes in depth](#open-modes-in-depth)
- [Campaigns](#campaigns)
- [Calls (optional)](#calls-optional)
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
| `onNavigate` | `(route: KerNavigationRoute) => void` | — | Used when `openMode="push"`. The SDK calls it, and your app opens the chat in its own navigator. |
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
| `theme.bubbleIcon` | `ImageSourcePropType` | chat icon | Custom floating button icon. |
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
| `chatSettings.layout` | `"full" \| "single"` | `full` has the Home / Chat / Help tabs and a list of conversations; `single` opens straight on one continuous chat. Set in the dashboard. |
| `chatSettings.showNavigation` | `boolean` | Show the tab bar in the `single` layout too. |
| `chatSettings.chatHistoryEnabled` | `boolean` | Off hides past conversations: the Chat tab then only offers a new chat. |
| `chatSettings.logoUrl` | `string` | Logo in the Home header. |
| `chatSettings.showGreeting` / `greetingText` | `boolean` / `string` | The Home header greeting. `{{name}}` is replaced by the visitor's first name. |
| `chatSettings.showStatusChip` / `statusChipText` | `boolean` / `string` | The "We reply in minutes" chip in the Home header. |

### Notifications

Kerabie keeps one push token per visitor session, so the app uses **one push service**. Expo is built in. For Firebase or anything else, pass your own adapter.

| Field | Type | Description |
| ----- | ---- | ----------- |
| `notifications.adapter` | `KerNotificationAdapter` | The push service. Defaults to `expoNotificationAdapter()`. Create it once, outside your component. |
| `notifications.onTokenRegister` | `(token: string, provider: KerPushProvider) => void` | Called after the token is registered with Kerabie. |

An adapter has three methods:

```ts
interface KerNotificationAdapter {
  requestPermission: () => Promise<boolean>;
  getToken: () => Promise<{ token: string; provider: 'expo' | 'fcm' } | null>;
  onTap: (handler: (data: Record<string, unknown>) => void) => Promise<() => void> | (() => void);
}
```

`onTap` calls the handler with the notification's `data` when the user taps it, including the tap that launched the app. Kerabie notifications carry `conversationId` and `orgId` in `data`, and the SDK opens that conversation.

```tsx
import { expoNotificationAdapter } from 'react-native-kerabie-helpdesk';

const adapter = expoNotificationAdapter({ projectId: 'your-expo-project-id' });

<KerAbieProvider widgetKey="wk_xxx" notifications={{ adapter }}>
```

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
  conversations,    // KerConversationSummary[]  — visitor's conversation list (newest first)
  conversationsLoaded,  // boolean     — the list has been loaded at least once
  startNewConversation, // () => void  — switch to an empty draft chat
  openConversation,     // (id: number) => Promise<void>  — switch to a listed chat and load its messages
  refreshConversations, // () => Promise<void>  — reload the list
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

### KerAbieWidget

The whole widget: Home, Chat, Help and Tickets behind a bottom tab bar (see [The widget](#the-widget)). Used automatically by the provider for `openMode="modal"` and `"sheet"`. Use it directly when `openMode="push"` and you render it in your own navigator screen.

```tsx
import { KerAbieWidget } from 'react-native-kerabie-helpdesk'

<KerAbieWidget onClose={() => router.back()} theme={{ primaryColor: '#6d28d9' }} />
```

| Prop | Type | Required | Description |
| ---- | ---- | -------- | ----------- |
| `onClose` | `() => void` | Yes | Called when the user taps the close button. |
| `theme` | `KerTheme` | No | Theme override (merged with provider theme). |
| `chatSettings` | `KerChatSettings` | No | Override welcome/offline messages and the other chat settings. |

---

### KerAbieChatScreen

Just the chat screen, without the tabs. Use it when you want your own navigation around the chat. Used automatically by the provider for `openMode="modal"`. Use it directly when `openMode="push"` and you render it in your own navigator screen.

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

## The widget

Opening the chat (the floating button, `open()`, a campaign or a notification tap) shows the same widget as the Kerabie web chat, in the org's colours, logo and wording from the dashboard:

| Tab | What it has |
| --- | ----------- |
| **Home** | Header with logo, status chip and greeting, search, featured products (tap one for its sheet and a link to the store), suggested articles and an "Ask our AI / Chat with us" card. |
| **Chat** | The `full` layout lists the visitor's conversations with a **New chat** button; the `single` layout opens one continuous chat with the recent history. |
| **Help** | Download or email a transcript, download or delete the visitor's data, and the most useful articles as FAQs. |
| **Tickets** | Only when tickets are on for the widget. |

A tapped push notification or `<your-scheme>://conversation/:id` link opens the widget on that conversation. With `layout: "single"` the tab bar is hidden unless `showNavigation` is on.

The widget's icons are drawn by the package itself, so there is no icon or SVG dependency to install.

Articles open in a bottom sheet and are drawn by the package too (headings, bold, italic, underline, links, lists, quotes, code, images and tables, with entities such as `&nbsp;` decoded), so there is no HTML renderer to install. When an AI reply cites an article it shows as a tappable card with the article's picture and the start of its text.

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
  KerConversationSummary,
  KerNotification,
  OpenMode,          // "modal" | "sheet" | "push"
  BubblePosition,    // "bottom-right" | "bottom-left" | "top-right" | "top-left"
  KerNavigationRoute, // passed to onNavigate
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

#### `KerConversationSummary`

| Field | Type | Description |
| ----- | ---- | ----------- |
| `id` | `number` | Conversation ID. |
| `name` | `string` | Who the visitor talked to. |
| `avatar` | `string \| null` | Avatar URL. |
| `lastMessage` | `string` | Preview of the latest message. |
| `lastMessageTime` | `string` | ISO timestamp. |
| `unreadCount` | `number` | Unread messages. |
| `isOnline` | `boolean` | The agent is online now. |

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

The SDK does not touch your navigator. With `openMode="push"` it calls `onNavigate`, and your app opens the chat screen itself. One hook works with every navigator, including Expo Router, which from SDK 56 no longer allows importing `@react-navigation/*` in app code.

**Expo Router:**
```tsx
import { router } from 'expo-router';

<KerAbieProvider
  widgetKey="wk_xxx"
  openMode="push"
  onNavigate={(route) =>
    router.push(route.type === 'conversation' ? `/chat/${route.conversationId}` : '/chat')
  }
>
  <Stack />
</KerAbieProvider>
```

**React Navigation:**
```tsx
<KerAbieProvider
  widgetKey="wk_xxx"
  openMode="push"
  onNavigate={(route) => navigationRef.current?.navigate('KerAbieChat', route)}
>
  <MyNavigator />
</KerAbieProvider>
```

You define the `/chat` route or the `KerAbieChat` screen yourself and render `KerAbieWidget` in it (or `KerAbieChatScreen` for the bare chat). Without `onNavigate`, the chat opens inline.

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
| Button **Open Knowledge Base** | Calls your `onOpenKnowledgeBase`; without it the widget opens on Home, where the articles are. |

```tsx
import { usePathname, router } from 'expo-router';

<KerAbieProvider
  widgetKey="wk_yourorg_xxx"
  screen={usePathname()}
  onOpenKnowledgeBase={() => router.push('/help')}
>
```

The `screen` prop is also sent to Kerabie, so agents see the screen the customer is on and the last few they visited, next to the app name, version, build and whether it is iOS or Android.

Campaign results (shown, opened, clicked, replied) are counted in the dashboard like they are for the website widget. Nothing pops up while the chat is open.

## Calls (optional)

Customers can call your team from the app: voice, and video if you turn it on. Everything below is optional. **Chat, tickets and notifications work without any of it, including in Expo Go.**

### What you need

- Calls turned on in the dashboard (**Settings, Widget, Calls**) and call minutes on your plan.
- A **development build**. Calls use native WebRTC code, so they do not run in Expo Go. When the packages are missing, or you are in Expo Go, you simply do not import the calls entry point and the app is unchanged.

### Install

```bash
npx expo install livekit-client @livekit/react-native @livekit/react-native-expo-plugin @livekit/react-native-webrtc @config-plugins/react-native-webrtc
```

Add the two plugins to `app.json`, then make a new development build:

```json
{
  "expo": {
    "plugins": ["@livekit/react-native-expo-plugin", "@config-plugins/react-native-webrtc"]
  }
}
```

On bare React Native, follow the [LiveKit React Native setup](https://github.com/livekit/client-sdk-react-native) for the Android and iOS native files instead.

The app must be allowed to use the microphone, and the camera if you use video: `RECORD_AUDIO` and `CAMERA` on Android, and a reason for `NSMicrophoneUsageDescription` and `NSCameraUsageDescription` on iOS. The phone asks the customer the first time.

### Use it

Calls come from a separate entry point, so the main package never loads the call libraries:

```tsx
import { KerAbieCallButton } from 'react-native-kerabie-helpdesk/calls'

// Anywhere inside <KerAbieProvider>. It renders nothing when calls are off or the plan has no minutes left.
<KerAbieCallButton label="Call us" />
<KerAbieCallButton label="Video call" video />
```

The button opens a call screen that shows the queue position, ringing, the call itself (mute, camera, end) and how it ended.

For your own design, use the hook and the screen separately:

```tsx
import { useKerAbieCall, KerAbieCallModal } from 'react-native-kerabie-helpdesk/calls'

function Support() {
  const call = useKerAbieCall()
  return (
    <>
      {call.available && <Button title="Call support" onPress={() => call.start()} />}
      <KerAbieCallModal call={call} />
    </>
  )
}
```

| Member | Description |
| ---- | ---- |
| `available` | Calls are on in the dashboard and the plan has minutes. |
| `videoAvailable` | Video is on too. |
| `state.phase` | `idle`, `starting`, `waiting` (in the queue), `ringing`, `connected` or `ended`. |
| `state.queuePosition` | Your place in the queue while `waiting`. |
| `state.handler` | `HUMAN` or `AI`, once answered. |
| `state.endReason` | Why it ended: `hangup`, `cancelled`, `missed`, `limit` or `connection_lost`. |
| `start(video?)` | Starts a call. A customer who already has one is put back into it. |
| `hangUp()` | Ends the call, or cancels it before it is answered. |
| `dismiss()` | Closes the call screen after it ended. |

A call goes to every free agent at once; the first to answer wins. When nobody is free, the AI voice agent answers if you turned it on, and otherwise the customer waits in the queue and the call is marked missed after two minutes. A call you reopen the app into is picked up again.

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

## Notification taps — opening the right conversation

When a user taps a Kerabie push notification, the SDK opens the chat on that conversation. **No app.json deep link or URL scheme setup is needed**: the notification's data already carries the `conversationId` (and the `orgId`), and `KerAbieProvider` listens for the tap, including the tap that launches the app from a closed state.

```tsx
// Once, at your app entry: ask for permission, get the Expo push token and register it with Kerabie
await NotificationService.setup({ projectId: 'your-expo-project-id' });
```

That is all. Notifications tapped while the app is in the foreground, in the background or closed all land on the right conversation.

### Links with your own scheme (optional)

If you also want a link such as `myapp://conversation/123` to open a conversation (from an email or another screen), use **your own app's scheme**, never `kerabie`. Register it the way your app already registers its scheme (in Expo, `"scheme": "myapp"` in `app.json`), then build links with:

```ts
KerAbieDeepLinkService.conversationUrl(123, 'myapp') // "myapp://conversation/123"
```

The provider accepts a conversation link with any scheme by default. To accept only yours, initialise the service with it:

```ts
KerAbieDeepLinkService.init({ scheme: 'myapp', onConversation: (id) => { /* open the chat */ } })
```

### What the push contains

Kerabie sends Expo pushes like this. Read `conversationId` and `orgId` from `data`; ignore the `url` field, it is only used by Kerabie's own app.

```json
{
  "to": "ExponentPushToken[...]",
  "title": "New message",
  "body": "You have a new message",
  "data": { "conversationId": 123, "orgId": 45 }
}
```

---

## License

MIT

## Building with an AI assistant

The [`@kerabie/mcp`](https://kerabie.com/docs/sdks/mcp) server gives Claude, Cursor and other MCP clients this package's docs and types, so they use the provider, hooks and components correctly instead of guessing. It needs no API key:

```json
{ "mcpServers": { "kerabie": { "command": "npx", "args": ["-y", "@kerabie/mcp"] } } }
```

Ask the assistant to use the `integrate_react_native` prompt, or the `get_integration_guide` and `get_sdk_types` tools.
