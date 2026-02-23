# Suguna Cast JS SDK

The headless JavaScript SDK for integrating Suguna Cast into your web applications.

## Installation

```bash
npm install @sugunabase/cast-sdk
```

## API Reference

### `SugunaCast` Class
The main entry point for the SDK.

#### `constructor(options: SugunaCastOptions)`
- `serverUrl`: The URL of your Suguna Cast server.
- `roomId`: The unique ID of the room to join.

#### `join(): Promise<boolean>`
Joins the specified room and initializes the MediaSoup device.

#### `produce(track: MediaStreamTrack): Promise<any>`
Starts sending a media track (audio or video) to the SFU.

#### `on(event: string, callback: Function)`
Listens for SDK events:
- `newProducer`: Fired when someone else starts sharing media.
- `participantJoined`: Fired when a new user joins the room.
- `participantLeft`: Fired when a user leaves the room.

## Usage Example

```javascript
import { SugunaCast } from '@sugunabase/cast-sdk';

const cast = new SugunaCast({
  serverUrl: 'https://cast.sugunabase.io',
  roomId: 'super-cool-talk'
});

async function startCall() {
  await cast.join();
  
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioTrack = stream.getAudioTracks()[0];
  
  await cast.produce(audioTrack);
}
```
