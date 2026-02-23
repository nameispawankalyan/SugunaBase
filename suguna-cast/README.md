# Suguna Cast

Suguna Cast is a powerful, enterprise-grade real-time communication engine for Audio and Video calls, built on top of MediaSoup. It provides a scalable SFU (Selective Forwarding Unit) architecture with a headless JS SDK and a premium UI Kit.

## 🏗 Project Structure

- `server/`: MediaSoup-based SFU backend with Socket.IO signaling.
- `js-sdk/`: Headless JavaScript SDK to interact with the Suguna Cast server.
- `ui-kit/`: Pre-built, premium React components for building call interfaces in seconds.

## 🚀 Getting Started

### 1. Server Setup
```bash
cd server
npm install
npm run dev
```

### 2. Implementation with JS SDK
```typescript
import { SugunaCast } from '@sugunabase/cast-sdk';

const cast = new SugunaCast({
  serverUrl: 'http://localhost:3000',
  roomId: 'test-room'
});

await cast.join();
const localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
localStream.getTracks().forEach(track => cast.produce(track));
```

### 3. Using UI Kit
```tsx
import { VideoCallScreen } from '@sugunabase/cast-ui-kit';

function App() {
  return (
    <VideoCallScreen 
      localStream={localStream}
      remoteStreams={remoteStreams}
      onHangup={() => console.log('Call Ended')}
    />
  );
}
```

## 🛡 Features
- **Scalable SFU:** Thousands of participants with low latency.
- **Adaptive Bitrate:** Optimized for poor network conditions.
- **Cross-Platform:** Works seamlessly on Web, Android, and iOS.
- **Ready-to-use UI:** Premium dark-themed call screens.

---
Part of the **SugunaBase** Ecosystem.
