'use client';

import { useState, use, useEffect } from 'react';
import { api, castApi } from '@/utils/api';
import {
    PhoneCall, Key, ShieldCheck, Eye, EyeOff, RefreshCw, Copy, Check,
    Video, Mic, Activity, Users, Clock, Globe, Signal, Zap, History,
    Monitor, Layout, Info
} from 'lucide-react';

type TabType = 'dashboard' | 'credentials';

export default function SugunaCastPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [activeTab, setActiveTab] = useState<TabType>('dashboard');
    const [isEnabled, setIsEnabled] = useState(true); // Default to true for demo
    const [loading, setLoading] = useState(true);

    // Auth State
    const [showSecret, setShowSecret] = useState(false);
    const [copiedKey, setCopiedKey] = useState(false);
    const [copiedSecret, setCopiedSecret] = useState(false);

    // Real Data State
    const [stats, setStats] = useState({
        totalCalls: 0,
        totalMinutes: 0,
        activeParticipants: 0,
        successRate: '100%'
    });

    const [liveRooms, setLiveRooms] = useState<any[]>([]);
    const [callHistory, setCallHistory] = useState<any[]>([]);
    const [projectDetails, setProjectDetails] = useState<any>(null);

    const fetchData = async () => {
        try {
            const [statsRes, roomsRes, historyRes, projectRes] = await Promise.all([
                castApi.get(`/api/stats/${id}`),
                castApi.get(`/api/rooms/${id}`),
                castApi.get(`/api/history/${id}`),
                api.get(`/projects/${id}`)
            ]);

            setStats({
                totalCalls: statsRes?.totalCalls || 0,
                totalMinutes: (statsRes?.totalCalls || 0) * 12,
                activeParticipants: statsRes?.activeParticipants || 0,
                successRate: statsRes?.successRate || '100%'
            });
            setLiveRooms(roomsRes || []);
            setCallHistory(historyRes || []);
            setProjectDetails(projectRes);
        } catch (error) {
            console.error('Failed to fetch cast data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRotateKeys = async () => {
        if (!confirm('Are you sure? This will break existing apps using the old keys.')) return;
        try {
            const res = await api.post(`/projects/${id}/keys/rotate`, {});
            if (res.success) {
                setProjectDetails({ ...projectDetails, app_id: res.app_id, api_secret: res.api_secret });
                alert('Keys rotated successfully!');
            }
        } catch (error) {
            console.error('Failed to rotate keys:', error);
            alert('Failed to rotate keys');
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Pulse every 5s
        return () => clearInterval(interval);
    }, [id]);

    const apiKey = projectDetails?.app_id || id;
    const apiSecret = projectDetails?.api_secret || 'Loading...';

    const copyToClipboard = (text: string, isSecret: boolean) => {
        navigator.clipboard.writeText(text);
        if (isSecret) {
            setCopiedSecret(true);
            setTimeout(() => setCopiedSecret(false), 2000);
        } else {
            setCopiedKey(true);
            setTimeout(() => setCopiedKey(false), 2000);
        }
    };

    if (!isEnabled) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="bg-blue-50 p-6 rounded-full mb-6 ring-8 ring-blue-50/50">
                    <PhoneCall className="h-16 w-16 text-blue-600 animate-bounce" />
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Enable Suguna Cast</h1>
                <p className="text-gray-500 max-w-md mb-8 leading-relaxed">
                    Power your application with high-quality, ultra-low latency voice and video calls.
                    Built on top of Suguna's Global Infrastructure.
                </p>
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsEnabled(true)}
                        className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-2"
                    >
                        <Zap className="h-5 w-5 fill-white" />
                        Enable Service
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header section with Tabs */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
                            <PhoneCall className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Suguna Cast</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                                <span className="text-xs font-bold text-green-600 uppercase tracking-widest">Service Active</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            <Layout className="h-4 w-4" />
                            Dashboard
                        </button>
                        <button
                            onClick={() => setActiveTab('credentials')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'credentials' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            <Key className="h-4 w-4" />
                            API Keys
                        </button>
                    </div>
                </div>
            </div>

            {activeTab === 'dashboard' ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Calls', value: stats.totalCalls, icon: PhoneCall, color: 'blue' },
                            { label: 'Call Minutes', value: stats.totalMinutes, icon: Clock, color: 'purple' },
                            { label: 'Live Participants', value: stats.activeParticipants, icon: Users, color: 'green' },
                            { label: 'Success Rate', value: stats.successRate, icon: Activity, color: 'orange' },
                        ].map((item, i) => (
                            <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className={`h-10 w-10 bg-${item.color}-50 rounded-xl flex items-center justify-center text-${item.color}-600 mb-4`}>
                                    <item.icon className="h-5 w-5" />
                                </div>
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">{item.label}</p>
                                <h3 className="text-3xl font-black text-gray-900 mt-1">{item.value}</h3>
                            </div>
                        ))}
                    </div>

                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Live Rooms Table */}
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                                <h3 className="font-black text-gray-900 flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-green-500" />
                                    Active Live Rooms
                                </h3>
                                <div className="text-xs font-bold text-gray-400 px-2 py-1 bg-gray-50 rounded-lg">Real-time update</div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Room ID</th>
                                            <th className="px-6 py-4">Type</th>
                                            <th className="px-6 py-4">Participants</th>
                                            <th className="px-6 py-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 text-sm">
                                        {liveRooms.map((room) => (
                                            <tr key={room.roomId} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-4 font-mono text-blue-600 font-bold">{room.roomId}</td>
                                                <td className="px-6 py-4">
                                                    <span className="flex items-center gap-2 font-semibold text-gray-700">
                                                        {room.type?.includes('video') ? <Video className="h-4 w-4 text-gray-400" /> : <Mic className="h-4 w-4 text-gray-400" />}
                                                        {room.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-gray-900">{room.participantCount}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-100 ring-4 ring-green-50/50">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                                        {room.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Recent History Sidebar */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                                <h3 className="font-black text-gray-900 flex items-center gap-2">
                                    <History className="h-5 w-5 text-gray-400" />
                                    Recent Calls
                                </h3>
                                <button className="text-xs font-bold text-blue-600 hover:underline">View all</button>
                            </div>
                            <div className="p-2 space-y-1">
                                {callHistory.map((call) => (
                                    <div key={call.id} className="p-4 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100 cursor-pointer group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="text-sm font-black text-gray-900 group-hover:text-blue-600 transition-colors">{call.user}</p>
                                                <p className="text-xs font-bold text-gray-400">{call.time} • {call.type}</p>
                                            </div>
                                            <span className="text-xs font-black text-gray-900 px-2 py-1 bg-gray-100 rounded-lg">{call.duration}</span>
                                        </div>
                                        <div className="flex items-center gap-4 mt-3">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                                                <Signal className="h-3 w-3" /> {call.network}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                                                <Globe className="h-3 w-3" /> {call.location}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-8 py-6 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                                    Production Credentials
                                </h3>
                                <p className="text-sm text-gray-500 font-bold mt-1 uppercase tracking-tight">Project ID: {id}</p>
                            </div>
                            <button
                                onClick={handleRotateKeys}
                                className="px-4 py-2 bg-white border border-gray-200 text-xs font-bold text-gray-600 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all flex items-center gap-2 shadow-sm"
                            >
                                <RefreshCw className="h-3.5 w-3.5" /> Rotate Keys
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* App ID / API Key */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-black text-gray-700 uppercase tracking-widest">
                                    <Layout className="h-4 w-4 text-blue-500" />
                                    Application ID (Public API Key)
                                </label>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl px-5 py-3.5 font-mono text-sm text-gray-600 flex items-center justify-between">
                                        <span>{apiKey}</span>
                                        <div className="flex items-center gap-2 px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-black rounded-lg uppercase tracking-tighter">Client Side</div>
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(apiKey, false)}
                                        className="px-5 py-3.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200"
                                        title="Copy App ID"
                                    >
                                        {copiedKey ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                                    </button>
                                </div>
                                <p className="text-xs font-bold text-gray-400">This key is safe to be embedded in your Android/Web source code.</p>
                            </div>

                            {/* API Secret */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-black text-gray-700 uppercase tracking-widest">
                                    <ShieldCheck className="h-4 w-4 text-red-500" />
                                    Project Secret Key
                                </label>
                                <div className="flex gap-2">
                                    <div className="flex-1 relative group">
                                        <div className={`absolute inset-0 bg-gray-900 rounded-xl flex items-center justify-center transition-all duration-300 ${showSecret ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                                            <p className="text-white text-xs font-bold flex items-center gap-2 opacity-50"><ShieldCheck className="h-4 w-4" /> HIDDEN FOR SECURITY</p>
                                        </div>
                                        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl px-5 py-3.5 font-mono text-sm text-gray-600 flex items-center justify-between">
                                            <span className="truncate">{apiSecret}</span>
                                            <div className="flex items-center gap-2 px-2 py-1 bg-red-100 text-red-700 text-[10px] font-black rounded-lg uppercase tracking-tighter">Server Side Only</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowSecret(!showSecret)}
                                        className="px-5 py-3.5 bg-white border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all active:scale-95"
                                        title={showSecret ? "Hide Secret" : "Show Secret"}
                                    >
                                        {showSecret ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                    <button
                                        onClick={() => copyToClipboard(apiSecret, true)}
                                        className="px-5 py-3.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200"
                                        title="Copy Secret"
                                    >
                                        {copiedSecret ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                                    </button>
                                </div>
                                <div className="p-3 bg-red-50 rounded-lg border border-red-100 text-[11px] font-bold text-red-600 flex items-center gap-2">
                                    <Info className="h-4 w-4 shrink-0" />
                                    WARNING: This secret grants full project access. Never expose it in client-side code or GitHub.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Help Card */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 text-white shadow-xl shadow-blue-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Monitor className="h-48 w-48" />
                        </div>
                        <div className="relative z-10 max-w-lg">
                            <h3 className="text-2xl font-black mb-2">Integration Guide</h3>
                            <p className="text-blue-100 font-bold text-sm mb-6 leading-relaxed">
                                Ready to build? Follow our step-by-step guides to integrate Suguna Cast SDK into your Android, iOS, or Web application.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <a href="/docs/android" className="px-5 py-2.5 bg-white text-blue-700 rounded-xl text-xs font-black shadow-lg hover:bg-blue-50 transition-colors">Android SDK Docs</a>
                                <a href="/docs/web" className="px-5 py-2.5 bg-white/10 text-white border border-white/20 rounded-xl text-xs font-black hover:bg-white/20 transition-colors">Web SDK Docs</a>
                                <a href="/docs/rest" className="px-5 py-2.5 bg-white/10 text-white border border-white/20 rounded-xl text-xs font-black hover:bg-white/20 transition-colors">REST API</a>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
