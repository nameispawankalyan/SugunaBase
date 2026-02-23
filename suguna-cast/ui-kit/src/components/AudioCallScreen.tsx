import React, { useState } from 'react';
import {
    Mic,
    MicOff,
    PhoneOff,
    Settings,
    Users,
    Volume2
} from 'lucide-react';

export interface AudioParticipant {
    id: string;
    name: string;
    avatar?: string;
    isSpeaking?: boolean;
}

interface AudioCallScreenProps {
    participants: AudioParticipant[];
    onHangup: () => void;
    onToggleMic: (enabled: boolean) => void;
    onToggleSpeaker: (enabled: boolean) => void;
}

export const AudioCallScreen: React.FC<AudioCallScreenProps> = ({
    participants,
    onHangup,
    onToggleMic,
    onToggleSpeaker
}) => {
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);

    const handleToggleMic = () => {
        const newState = !isMuted;
        setIsMuted(newState);
        onToggleMic(newState);
    };

    const handleToggleSpeaker = () => {
        const newState = !isSpeakerOn;
        setIsSpeakerOn(newState);
        onToggleSpeaker(newState);
    };

    return (
        <div className="relative w-full h-full min-h-[600px] bg-[#0b0e14] rounded-2xl overflow-hidden font-sans text-white border border-white/10 shadow-2xl flex flex-col items-center justify-between p-12">
            {/* Background Animated Gradients */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Top Header */}
            <div className="relative z-10 w-full flex justify-between items-center bg-white/5 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-bold tracking-widest uppercase opacity-70">Secure Connection</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium">
                    <Users className="h-4 w-4 text-blue-400" />
                    {participants.length} Active
                </div>
            </div>

            {/* Main Avatar Section */}
            <div className="relative z-10 flex flex-col items-center gap-8">
                <div className="relative">
                    {/* Animated Circles for Speaking Effect */}
                    <div className={`absolute inset-0 bg-blue-500/20 rounded-full blur-xl transition-all duration-500 scale-150 animate-ping`} />

                    <div className="relative h-48 w-48 rounded-full border-4 border-white/10 p-2 bg-[#1a1f2e] shadow-2xl overflow-hidden">
                        {participants[0]?.avatar ? (
                            <img src={participants[0].avatar} alt="User" className="w-full h-full object-cover rounded-full" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 rounded-full text-5xl font-bold">
                                {participants[0]?.name.charAt(0) || 'U'}
                            </div>
                        )}
                    </div>

                    {/* Audio Waveform Animation (Simulated) */}
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-1 h-8">
                        {[1, 2, 3, 4, 5, 4, 3].map((h, i) => (
                            <div
                                key={i}
                                className="w-1 bg-blue-400 rounded-full animate-bounce"
                                style={{ height: `${h * 4}px`, animationDelay: `${i * 0.1}s` }}
                            />
                        ))}
                    </div>
                </div>

                <div className="text-center">
                    <h2 className="text-3xl font-bold mb-2 tracking-tight">{participants[0]?.name || 'Unknown User'}</h2>
                    <p className="text-blue-400 font-medium animate-pulse tracking-wide uppercase text-xs">Calling...</p>
                </div>
            </div>

            {/* Secondary Participants Avatars */}
            {participants.length > 1 && (
                <div className="relative z-10 flex gap-4 mt-4">
                    {participants.slice(1, 4).map((p, i) => (
                        <div key={i} className="h-12 w-12 rounded-full border-2 border-white/20 bg-gray-800 flex items-center justify-center text-xs font-bold overflow-hidden">
                            {p.avatar ? <img src={p.avatar} className="w-full h-full object-cover" /> : p.name.charAt(0)}
                        </div>
                    ))}
                    {participants.length > 4 && (
                        <div className="h-12 w-12 rounded-full border-2 border-white/20 bg-blue-600 flex items-center justify-center text-xs font-bold">
                            +{participants.length - 4}
                        </div>
                    )}
                </div>
            )}

            {/* Control Bar */}
            <div className="relative z-10 w-full max-w-md flex items-center justify-center gap-6 px-8 py-6 bg-white/5 backdrop-blur-2xl rounded-[40px] border border-white/10 shadow-2xl">
                <AudioControlBtn
                    icon={isMuted ? MicOff : Mic}
                    active={!isMuted}
                    onClick={handleToggleMic}
                    danger={isMuted}
                />
                <AudioControlBtn
                    icon={Volume2}
                    active={isSpeakerOn}
                    onClick={handleToggleSpeaker}
                />
                <div className="w-[1px] h-10 bg-white/10 mx-2" />
                <button
                    onClick={onHangup}
                    className="h-16 w-16 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center shadow-lg shadow-red-600/30 transition-all transform hover:scale-110 active:scale-95"
                >
                    <PhoneOff className="h-8 w-8 text-white" />
                </button>
                <div className="w-[1px] h-10 bg-white/10 mx-2" />
                <AudioControlBtn icon={Settings} onClick={() => { }} />
            </div>
        </div>
    );
};

interface AudioControlBtnProps {
    icon: any;
    onClick: () => void;
    active?: boolean;
    danger?: boolean;
}

const AudioControlBtn: React.FC<AudioControlBtnProps> = ({
    icon: Icon,
    onClick,
    active = false,
    danger = false
}) => (
    <button
        onClick={onClick}
        className={`
        p-4 rounded-3xl transition-all duration-300 flex items-center justify-center group
        ${active ? 'bg-white/10 hover:bg-white/20' : 'bg-transparent hover:bg-white/5'}
        ${danger ? 'text-red-500' : 'text-white'}
    `}
    >
        <Icon className={`h-7 w-7 transition-transform group-active:scale-90`} />
    </button>
);
