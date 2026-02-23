# Suguna Cast UI Kit

Premium React components for Suguna Cast.

## Installation

```bash
npm install @sugunabase/cast-ui-kit lucide-react clsx tailwind-merge
```

## Components

### `VideoCallScreen`
A full-screen video calling interface with local/remote video previews and controls.

**Properties:**
- `localStream: MediaStream | null`: Local user's media stream.
- `remoteStreams: Map<string, MediaStream>`: Map of peer IDs to their streams.
- `participantCount: number`: Total number of active participants.
- `onHangup: () => void`: Callback when the end call button is clicked.
- `onToggleMic: (enabled: boolean) => void`: Callback for mic toggle.
- `onToggleVideo: (enabled: boolean) => void`: Callback for video toggle.

### `AudioCallScreen`
A premium audio-only calling screen with animated waveforms.

**Properties:**
- `participants: AudioParticipant[]`: List of active users (id, name, avatar).
- `onHangup: () => void`: Callback when the end call button is clicked.
- `onToggleMic: (enabled: boolean) => void`: Callback for mic toggle.
- `onToggleSpeaker: (enabled: boolean) => void`: Callback for speaker toggle.

## Requirements
- React 18+
- Tailwind CSS (recommended for styling)
