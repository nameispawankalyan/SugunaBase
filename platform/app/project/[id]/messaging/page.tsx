'use client';

import { use, useState, useEffect } from 'react';
import {
    Bell,
    Send,
    History,
    Settings,
    Smartphone,
    Upload,
    AlertCircle,
    CheckCircle2,
    Users,
    Info,
    ChevronRight,
    ExternalLink
} from 'lucide-react';
import { api } from '@/utils/api';

export default function MessagingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [activeTab, setActiveTab] = useState<'composer' | 'history' | 'setup'>('composer');
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ total_devices: 0 });
    const [history, setHistory] = useState<any[]>([]);
    const [configUploaded, setConfigUploaded] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [targetType, setTargetType] = useState<'all' | 'user'>('all');
    const [targetUserId, setTargetUserId] = useState('');
    const [serviceAccountJson, setServiceAccountJson] = useState('');

    const fetchStatsAndHistory = async () => {
        try {
            const data = await api.get(`/console/projects/${id}/messaging/history`);
            if (data) {
                setHistory(data.history || []);
                setStats({ total_devices: data.total_devices || 0 });
            }

            // Check if config exists
            const project = await api.get(`/projects/${id}`);
            if (project.fcm_service_account) {
                setConfigUploaded(true);
            }
        } catch (error) {
            console.error("Failed to fetch messaging data", error);
        }
    };

    useEffect(() => {
        if (id) fetchStatsAndHistory();
    }, [id]);

    const handleSendNotification = async () => {
        if (!title || !body) {
            alert("Please fill in Title and Body");
            return;
        }

        setLoading(true);
        try {
            await api.post(`/console/projects/${id}/messaging/send`, {
                target: { type: targetType, id: targetUserId },
                title,
                body,
                image_url: imageUrl,
                data: { sent_via: 'SugunaBase Console' }
            });
            alert("Notification sent successfully!");
            setTitle('');
            setBody('');
            setImageUrl('');
            fetchStatsAndHistory();
        } catch (error: any) {
            alert("Failed to send: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateConfig = async () => {
        try {
            const json = JSON.parse(serviceAccountJson);
            await api.put(`/console/projects/${id}/messaging/config`, {
                serviceAccount: json
            });
            alert("Firebase configuration updated!");
            setConfigUploaded(true);
            setServiceAccountJson('');
            setActiveTab('composer');
        } catch (error: any) {
            alert("Invalid JSON: " + error.message);
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            {/* Header Section */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
                    <Bell size={120} strokeWidth={1} />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Bell className="h-6 w-6" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cloud Messaging</h1>
                    </div>
                    <p className="text-gray-500 text-sm max-w-2xl leading-relaxed">
                        Send real-time push notifications to your users. SCM uses an invisible trigger system to wake up your app and deliver data instantly.
                    </p>

                    <div className="flex gap-8 mt-8 border-b border-gray-100">
                        {[
                            { id: 'composer', label: 'Composer', icon: Send },
                            { id: 'history', label: 'Recent Messages', icon: History },
                            { id: 'setup', label: 'Configuration', icon: Settings },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 pb-4 text-sm font-medium transition-all ${activeTab === tab.id
                                    ? 'border-b-2 border-blue-600 text-blue-600'
                                    : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Form/Content */}
                <div className="lg:col-span-2 space-y-6">

                    {activeTab === 'composer' && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {!configUploaded && (
                                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-amber-800">
                                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                    <div className="text-sm">
                                        <p className="font-semibold">Setup Required</p>
                                        <p className="mt-1 opacity-80">You need to upload your Firebase Service Account JSON to start sending notifications.</p>
                                        <button
                                            onClick={() => setActiveTab('setup')}
                                            className="mt-2 font-bold hover:underline"
                                        >
                                            Go to Setup &rarr;
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notification Title</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. New Offer Just for You!"
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 text-sm"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Image URL (Optional)</label>
                                        <input
                                            type="text"
                                            placeholder="https://example.com/banner.jpg"
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 text-sm"
                                            value={imageUrl}
                                            onChange={(e) => setImageUrl(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Message Content</label>
                                    <textarea
                                        rows={4}
                                        placeholder="Enter the main message body here..."
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 text-sm resize-none"
                                        value={body}
                                        onChange={(e) => setBody(e.target.value)}
                                    />
                                </div>

                                <div className="pt-4 border-t border-gray-100">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                        <Users className="h-4 w-4 text-blue-500" />
                                        Targeting
                                    </h3>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setTargetType('all')}
                                            className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all text-sm font-medium ${targetType === 'all'
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100'
                                                : 'bg-white border-gray-200 text-gray-600 hover:border-blue-200'
                                                }`}
                                        >
                                            <Smartphone className="h-4 w-4" />
                                            All Registered Devices
                                        </button>
                                        <button
                                            onClick={() => setTargetType('user')}
                                            className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all text-sm font-medium ${targetType === 'user'
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100'
                                                : 'bg-white border-gray-200 text-gray-600 hover:border-blue-200'
                                                }`}
                                        >
                                            <Users className="h-4 w-4" />
                                            Specific User UID
                                        </button>
                                    </div>

                                    {targetType === 'user' && (
                                        <div className="mt-4 animate-in slide-in-from-top-2 duration-200">
                                            <input
                                                type="text"
                                                placeholder="Paste user UID here..."
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                                                value={targetUserId}
                                                onChange={(e) => setTargetUserId(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="pt-6 flex justify-end">
                                    <button
                                        onClick={handleSendNotification}
                                        disabled={loading || !configUploaded}
                                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-100 transition-all disabled:opacity-50 disabled:grayscale"
                                    >
                                        {loading ? (
                                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Send className="h-4 w-4" />
                                        )}
                                        Send Notification
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                            <div className="p-4 bg-gray-50 border-b border-gray-100">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <History className="h-4 w-4 text-gray-400" />
                                    Recent Campaign History
                                </h3>
                            </div>

                            <div className="divide-y divide-gray-100">
                                {history.length > 0 ? (
                                    history.map((msg) => (
                                        <div key={msg.id} className="p-4 hover:bg-gray-50 flex items-start gap-4 transition-colors">
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                <Bell className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-semibold text-gray-900">{msg.title}</h4>
                                                    <span className="text-xs text-gray-400">{new Date(msg.created_at).toLocaleString()}</span>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{msg.body}</p>
                                                <div className="flex gap-4 mt-3">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Delivered</span>
                                                    {msg.image_url && <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">With Image</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-12 text-center">
                                        <History className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                                        <p className="text-gray-400 text-sm italic">No notifications sent yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'setup' && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Connect Firebase Admin</h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    To send notifications through SCM, SugunaBase needs to authenticate with your Firebase project.
                                </p>

                                <div className="space-y-4">
                                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-4 items-start">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            <Info className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div className="text-sm leading-relaxed text-blue-900">
                                            <p className="font-bold">How to get your Service Account JSON?</p>
                                            <ol className="mt-2 space-y-1 list-decimal list-inside opacity-80">
                                                <li>Go to <strong>Firebase Console</strong> &gt; Project Settings.</li>
                                                <li>Select <strong>Service Accounts</strong> tab.</li>
                                                <li>Click <strong>Generate New Private Key</strong>.</li>
                                                <li>Paste the content of the downloaded file below.</li>
                                            </ol>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Service Account JSON Content</label>
                                        <textarea
                                            rows={10}
                                            placeholder="{ 'type': 'service_account', ... }"
                                            className="w-full p-4 rounded-xl font-mono text-xs bg-gray-900 text-green-400 focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all"
                                            value={serviceAccountJson}
                                            onChange={(e) => setServiceAccountJson(e.target.value)}
                                        />
                                    </div>

                                    <button
                                        onClick={handleUpdateConfig}
                                        className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg"
                                    >
                                        <Upload className="h-4 w-4" />
                                        Upload Configuration
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar: Quick Stats & Help */}
                <div className="space-y-6">

                    {/* Stats Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Smartphone size={60} />
                        </div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Device Reach</h3>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-black text-gray-900">{stats.total_devices}</span>
                            <span className="text-sm font-semibold text-blue-600 mb-1">Registered Tokens</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-4 leading-relaxed">
                            These are the unique devices using your SDK that have registered for push notifications.
                        </p>
                    </div>

                    {/* Integration Status Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-1 overflow-hidden">
                        <div className={`p-5 rounded-[14px] ${configUploaded ? 'bg-green-50' : 'bg-red-50'}`}>
                            <div className="flex items-center gap-3">
                                {configUploaded ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                ) : (
                                    <AlertCircle className="h-5 w-5 text-red-600" />
                                )}
                                <span className={`text-sm font-bold ${configUploaded ? 'text-green-800' : 'text-red-800'}`}>
                                    {configUploaded ? 'SCM is Ready' : 'SCM Inactive'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Documentation Link Card */}
                    <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-2xl p-6 text-white shadow-xl relative group cursor-pointer overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 text-white opacity-20 group-hover:rotate-12 transition-transform">
                            <ExternalLink size={24} />
                        </div>
                        <h3 className="font-bold text-lg mb-2">SDK Integration</h3>
                        <p className="text-sm text-gray-400 mb-6 font-medium">
                            Don't forget to add the SugunaMessagingService to your AndroidManifest.xml.
                        </p>
                        <button className="flex items-center justify-between w-full bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border border-white/10">
                            View Guide
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
