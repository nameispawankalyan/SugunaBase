import { useState } from 'react';
import { SugunaCast } from './cast-lib/sdk';
import { VideoCallScreen } from './cast-lib/ui-kit/components/VideoCallScreen';
import './App.css';

function App() {
  const [inCall, setInCall] = useState(false);
  const [roomId, setRoomId] = useState('demo-room');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [cast, setCast] = useState<SugunaCast | null>(null);

  const startCall = async () => {
    console.log('Start call button clicked');
    try {
      console.log('Requesting camera/mic permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      console.log('Permissions granted');
      setLocalStream(stream);

      console.log('Connecting to server:', 'https://10.219.241.101:3000');

      // MOCK TOKEN (In real app, this comes from your backend)
      const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBJZCI6InN1Z3VuYS1wcm9qZWN0LTEiLCJyb29tSWQiOiJkZW1vLXJvb20iLCJ1aWQiOiJ1c2VyLTEyMyIsInJvbGUiOiJob3N0In0.your-signature-here";
      // Note: For now, I'll use a hardcoded token that matches the server's expected secret for testing.
      // In production, your backend generates this using SugunaBase Admin SDK.

      const castInstance = new SugunaCast({
        serverUrl: 'https://10.219.241.101:3000',
        roomId: roomId,
        token: mockToken,
        metrics: {
          name: "Guest User " + Math.floor(Math.random() * 100),
          uid: "user-" + Math.random().toString(36).substr(2, 9),
          network: (navigator as any).connection?.effectiveType || 'wifi',
          device: navigator.userAgent.split(') ')[0] + ')',
          location: "Hyderabad, TS"
        }
      });

      castInstance.socket.on('connect_error', (err) => {
        console.error('Socket Connection Error:', err);
        alert('Server Connection Failed! Did you accept the certificate at https://10.219.241.101:3000 ?\n\nError: ' + err.message);
      });

      castInstance.onTrack = (track, peerId) => {
        console.log('Received remote track:', track.kind, 'from peer:', peerId);
        setRemoteStreams(prev => {
          const next = new Map(prev);
          const stream = next.get(peerId) || new MediaStream();
          stream.addTrack(track);
          next.set(peerId, stream);
          return next;
        });
      };

      castInstance.onTrackEnded = (peerId) => {
        console.log('Track ended for peer:', peerId);
        setRemoteStreams(prev => {
          const next = new Map(prev);
          next.delete(peerId);
          return next;
        });
      };

      console.log('Joining room:', roomId);
      await castInstance.join();
      console.log('Joined room successfully');

      stream.getTracks().forEach(track => {
        castInstance.produce(track);
      });

      setCast(castInstance);
      setInCall(true);
    } catch (err) {
      console.error('Failed to start call:', err);
      alert('Error: ' + err);
    }
  };

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }
    if (cast) {
      cast.socket.disconnect();
    }
    setInCall(false);
    setLocalStream(null);
    setRemoteStreams(new Map());
  };

  return (
    <div className="app-container">
      {!inCall ? (
        <div className="setup-screen">
          <h1>Suguna Cast Demo</h1>
          <div className="input-group">
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter Room ID"
            />
            <button onClick={startCall} className="join-btn">Join Video Call</button>
          </div>
        </div>
      ) : (
        <div className="call-container">
          <VideoCallScreen
            localStream={localStream}
            remoteStreams={remoteStreams}
            onHangup={endCall}
            onToggleMic={(enabled) => {
              localStream?.getAudioTracks().forEach(t => t.enabled = enabled);
            }}
            onToggleVideo={(enabled) => {
              localStream?.getVideoTracks().forEach(t => t.enabled = enabled);
            }}
            participantCount={remoteStreams.size + 1}
          />
        </div>
      )}
    </div>
  );
}

export default App;
