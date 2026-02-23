import React, { useState, useEffect, useRef } from 'react';
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    PhoneOff,
    MoreVertical,
    SwitchCamera
} from 'lucide-react';

interface CallScreenProps {
    localStream: MediaStream | null;
    remoteStreams: Map<string, MediaStream>;
    onHangup: () => void;
    onToggleMic: (enabled: boolean) => void;
    onToggleVideo: (enabled: boolean) => void;
    participantCount: number;
}

export const VideoCallScreen: React.FC<CallScreenProps> = ({
    localStream,
    remoteStreams,
    onHangup,
    onToggleMic,
    onToggleVideo
}) => {
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const localVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    const handleToggleMic = () => {
        const newState = !isMuted;
        setIsMuted(newState);
        onToggleMic(!newState); // SDK expects enabled state
    };

    const handleToggleVideo = () => {
        const newState = !isVideoOff;
        setIsVideoOff(newState);
        onToggleVideo(!newState);
    };

    const remotePeers = Array.from(remoteStreams.entries());

    return (
        <div className="whatsapp-call-container relative w-full h-screen bg-[#121b22] overflow-hidden font-sans text-white">
            {/* Background / Remote Videos */}
            <div className="absolute inset-0 z-0">
                {remotePeers.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#1a252f] to-[#121b22]">
                        <div className="w-24 h-24 rounded-full bg-[#2a3942] flex items-center justify-center mb-4">
                            <span className="text-3xl font-bold text-gray-400">?</span>
                        </div>
                        <p className="text-lg text-gray-400">Waiting for participants...</p>
                    </div>
                ) : remotePeers.length === 1 ? (
                    <div className="w-full h-full">
                        <RemoteVideo stream={remotePeers[0][1]} peerId={remotePeers[0][0]} fullScreen={true} />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-1 w-full h-full p-1">
                        {remotePeers.map(([id, stream]) => (
                            <RemoteVideo key={id} stream={stream} peerId={id} fullScreen={false} />
                        ))}
                    </div>
                )}
            </div>

            {/* Local Video - Floating like WhatsApp */}
            <div className={`absolute z-20 transition-all duration-500 rounded-xl overflow-hidden shadow-2xl border border-white/10
                ${remotePeers.length > 0 ? 'top-6 right-6 w-32 h-44 sm:w-40 sm:h-56' : 'inset-0 w-full h-full'}
            `}>
                <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-cover transition-opacity duration-300 ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}
                />
                {isVideoOff && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#2a3942]">
                        <div className="w-16 h-16 rounded-full bg-gray-600/30 flex items-center justify-center">
                            <VideoOff className="h-8 w-8 text-white/50" />
                        </div>
                    </div>
                )}
                {remotePeers.length > 0 && <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/40 rounded text-[10px] backdrop-blur-sm">You</div>}
            </div>

            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 z-30 p-4 flex items-center justify-between bg-gradient-to-b from-black/40 to-transparent">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">WhatsApp Call</span>
                </div>
                <div className="flex gap-4">
                    <SwitchCamera className="h-6 w-6 text-white/80 cursor-pointer" />
                    <MoreVertical className="h-6 w-6 text-white/80 cursor-pointer" />
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 z-40 p-8 flex flex-col items-center">
                <div className="flex items-center gap-6 px-8 py-4 bg-[#2a3942]/90 backdrop-blur-xl rounded-[40px] shadow-2xl border border-white/5">
                    <ControlButton
                        icon={isMuted ? MicOff : Mic}
                        status={isMuted ? 'off' : 'on'}
                        onClick={handleToggleMic}
                    />
                    <ControlButton
                        icon={isVideoOff ? VideoOff : Video}
                        status={isVideoOff ? 'off' : 'on'}
                        onClick={handleToggleVideo}
                    />
                    <button
                        onClick={onHangup}
                        className="w-14 h-14 rounded-full bg-[#ea4335] flex items-center justify-center hover:bg-red-600 transition-all active:scale-95 shadow-lg"
                    >
                        <PhoneOff className="h-7 w-7 text-white" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const ControlButton: React.FC<{ icon: any, status: 'on' | 'off', onClick: () => void }> = ({ icon: Icon, status, onClick }) => (
    <button
        onClick={onClick}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90
            ${status === 'on' ? 'bg-white/10 hover:bg-white/20' : 'bg-white text-black'}
        `}
    >
        <Icon className="h-6 w-6" />
    </button>
);

const RemoteVideo: React.FC<{ stream: MediaStream; peerId: string; fullScreen: boolean }> = ({ stream, peerId, fullScreen }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
    }, [stream]);

    return (
        <div className={`relative h-full w-full bg-[#121b22] overflow-hidden ${!fullScreen ? 'rounded-lg' : ''}`}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
            />
            <div className="absolute bottom-20 left-6 z-10">
                <p className="text-lg font-medium drop-shadow-lg">User {peerId.substring(0, 4)}</p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-xs text-white/70">Encrypted</span>
                </div>
            </div>
        </div>
    );
};
