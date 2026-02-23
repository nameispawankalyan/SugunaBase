import React, { useState, useEffect, useRef } from 'react';
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    PhoneOff,
    Settings,
    Users,
    Grid
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
    onToggleVideo,
    participantCount
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
        onToggleMic(newState);
    };

    const handleToggleVideo = () => {
        const newState = !isVideoOff;
        setIsVideoOff(newState);
        onToggleVideo(newState);
    };

    return (
        <div className="relative w-full h-full min-h-[600px] bg-[#0b0e14] rounded-2xl overflow-hidden font-sans text-white border border-white/10 shadow-2xl">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a1f2e] to-[#0b0e14] opacity-50 z-0" />

            {/* Main Video Grid */}
            <div className="relative z-10 w-full h-full p-4 flex flex-wrap gap-4 items-center justify-center">
                {/* Placeholder for Remote Streams */}
                {remoteStreams.size === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center p-8 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 w-full max-w-2xl h-[400px]">
                        <div className="relative mb-6">
                            <div className="h-24 w-24 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
                                <Users className="h-10 w-10 text-blue-400" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-green-500 border-4 border-[#0b0e14]" />
                        </div>
                        <h2 className="text-xl font-semibold mb-2">Waiting for participants...</h2>
                        <p className="text-gray-400 text-sm">Share your room link to start the conversation</p>
                    </div>
                ) : (
                    Array.from(remoteStreams.entries()).map(([peerId, stream]) => (
                        <RemoteVideo key={peerId} stream={stream} peerId={peerId} />
                    ))
                )}
            </div>

            {/* Local Video Picture-in-Picture */}
            <div className="absolute top-6 right-6 z-20 w-48 h-32 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl bg-gray-900 group">
                <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-cover transform transition-transform duration-300 ${isVideoOff ? 'hidden' : 'block'}`}
                />
                {isVideoOff && (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                        <VideoOff className="h-8 w-8 text-gray-600" />
                    </div>
                )}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-md rounded text-[10px] font-medium uppercase tracking-wider">
                    You
                </div>
            </div>

            {/* Top Meta Info */}
            <div className="absolute top-6 left-6 z-20 flex items-center gap-3">
                <div className="px-4 py-2 bg-black/40 backdrop-blur-lg rounded-full border border-white/10 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-bold tracking-widest uppercase">Live</span>
                </div>
                <div className="px-4 py-2 bg-black/40 backdrop-blur-lg rounded-full border border-white/10 text-xs font-medium">
                    Room: SUG-CAST-001
                </div>
            </div>

            {/* Control Bar */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 px-6 py-4 bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all transform hover:scale-[1.02]">
                <ControlButton
                    icon={isMuted ? MicOff : Mic}
                    active={!isMuted}
                    onClick={handleToggleMic}
                    danger={isMuted}
                />
                <ControlButton
                    icon={isVideoOff ? VideoOff : Video}
                    active={!isVideoOff}
                    onClick={handleToggleVideo}
                    danger={isVideoOff}
                />
                <div className="w-[1px] h-8 bg-white/10 mx-2" />
                <ControlButton
                    icon={PhoneOff}
                    onClick={onHangup}
                    danger={true}
                    primary={true}
                />
                <div className="w-[1px] h-8 bg-white/10 mx-2" />
                <ControlButton icon={Grid} onClick={() => { }} />
                <ControlButton icon={Settings} onClick={() => { }} />
            </div>

            {/* Participants Counter */}
            <div className="absolute bottom-8 right-8 z-20 px-4 py-2 bg-black/40 backdrop-blur-lg rounded-xl border border-white/10 flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium">{participantCount} Participants</span>
            </div>
        </div>
    );
};

interface ControlButtonProps {
    icon: any;
    onClick: () => void;
    active?: boolean;
    danger?: boolean;
    primary?: boolean;
}

const ControlButton: React.FC<ControlButtonProps> = ({
    icon: Icon,
    onClick,
    active = false,
    danger = false,
    primary = false
}) => (
    <button
        onClick={onClick}
        className={`
        p-4 rounded-2xl transition-all duration-300 flex items-center justify-center group
        ${primary ? 'bg-red-600 hover:bg-red-700 hover:scale-110 shadow-lg shadow-red-600/20' : ''}
        ${!primary && !danger && active ? 'bg-white/10 hover:bg-white/20' : ''}
        ${danger && !primary ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500' : 'text-white'}
    `}
    >
        <Icon className={`h-6 w-6 transition-transform group-active:scale-90`} />
    </button>
);

const RemoteVideo: React.FC<{ stream: MediaStream; peerId: string }> = ({ stream, peerId }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
    }, [stream]);

    return (
        <div className="relative h-[400px] flex-1 min-w-[300px] bg-gray-900 rounded-2xl overflow-hidden border border-white/10 group shadow-lg">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 z-10 px-3 py-1 bg-black/50 backdrop-blur-md rounded-lg text-xs font-medium border border-white/10">
                User: {peerId.substring(0, 6)}...
            </div>
            {/* Overlay Gradient on Hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </div>
    );
};
