'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/utils/api';
import { ArrowLeft, Box, Download, Settings, Smartphone, Trash2, RefreshCw } from 'lucide-react';
import Link from 'next/link';

// Config Object Generator
const generateConfig = (projectId: string, packageName: string, googleClientId?: string) => {
    return {
        "project_info": {
            "project_name": "SugunaBase Project",
            "project_id": projectId,
            "project_number": "1",
            "endpoint": "https://api.suguna.co/v1"
        },
        "client": [
            {
                "client_info": {
                    "android_client_info": {
                        "package_name": packageName
                    }
                },
                "oauth_client": [
                    {
                        "client_id": googleClientId || "YOUR_WEB_CLIENT_ID",
                        "client_type": 3
                    }
                ],
                "services": {
                    "sugunabase": {
                        "base_url": "https://api.suguna.co/"
                    }
                }
            }
        ]
    }
};

export default function ProjectDetails() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [project, setProject] = useState<any>(null);
    const [apps, setApps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddingApp, setIsAddingApp] = useState(false);
    const [newAppName, setNewAppName] = useState('');
    const [newPackageName, setNewPackageName] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Fingerprint Modal/State
    const [addingKeyTo, setAddingKeyTo] = useState<number | null>(null);
    const [newKeyLabel, setNewKeyLabel] = useState('Debug');
    const [newSha1, setNewSha1] = useState('');
    const [newSha256, setNewSha256] = useState('');
    const [savingKey, setSavingKey] = useState(false);

    const fetchProjectAndApps = async () => {
        try {
            const [projData, appsData] = await Promise.all([
                api.get(`/projects/${projectId}`),
                api.get(`/projects/${projectId}/apps`)
            ]);
            setProject(projData);
            setApps(appsData);
        } catch (error: any) {
            console.error("Failed to fetch project details", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (projectId) fetchProjectAndApps();
    }, [projectId]);

    const handleAddApp = async () => {
        if (!newPackageName) return;
        try {
            await api.post(`/projects/${projectId}/apps`, {
                package_name: newPackageName,
                app_name: newAppName || 'My App'
            });
            setNewAppName('');
            setNewPackageName('');
            setIsAddingApp(false);
            fetchProjectAndApps();
            alert('App registered successfully!');
        } catch (error: any) {
            alert('Failed to add app: ' + error.message);
        }
    };

    const handleDeleteApp = async (appId: number) => {
        if (!confirm('Delete this app and all its fingerprints?')) return;
        try {
            await api.delete(`/projects/${projectId}/apps/${appId}`);
            fetchProjectAndApps();
        } catch (e: any) { alert(e.message); }
    };

    const handleAddFingerprint = async () => {
        if (!addingKeyTo) return;
        setSavingKey(true);
        try {
            await api.post(`/projects/${projectId}/apps/${addingKeyTo}/fingerprints`, {
                sha1: newSha1,
                sha256: newSha256,
                label: newKeyLabel
            });
            setNewSha1('');
            setNewSha256('');
            setNewKeyLabel('Debug');
            setAddingKeyTo(null);
            fetchProjectAndApps();
        } catch (error: any) {
            alert('Failed to save key: ' + error.message);
        } finally {
            setSavingKey(false);
        }
    };

    const handleDeleteFingerprint = async (appId: number, fId: number) => {
        if (!confirm('Remove this fingerprint?')) return;
        try {
            await api.delete(`/projects/${projectId}/apps/${appId}/fingerprints/${fId}`);
            fetchProjectAndApps();
        } catch (e: any) { alert(e.message); }
    };

    const downloadConfig = (app: any) => {
        const config = generateConfig(projectId, app.package_name, project?.google_client_id);
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "suguna-services.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleDeleteProject = async () => {
        if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
        try {
            await api.delete(`/projects/${projectId}`);
            router.push('/console');
        } catch (error: any) {
            alert('Failed to delete project: ' + error.message);
        }
    };

    if (loading) {
        return <div className="p-8 text-center flex items-center justify-center h-screen bg-[#020609]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
        </div>;
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto py-10 px-6">
            {error ? (
                <div className="bg-red-50/10 border border-red-500/20 text-red-400 p-12 rounded-[40px] text-center shadow-2xl backdrop-blur-xl">
                    <Trash2 className="h-20 w-20 text-red-500/50 mx-auto mb-6" />
                    <h2 className="text-3xl font-black tracking-tight">Access Denied</h2>
                    <p className="mt-3 text-red-400/70 font-medium">{error}</p>
                    <button onClick={() => router.push('/console')} className="mt-8 px-10 py-3 bg-red-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-600/20">
                        Return to Dashboard
                    </button>
                </div>
            ) : !project ? (
                <div className="flex items-center justify-center py-40">
                    <RefreshCw className="h-10 w-10 text-orange-600 animate-spin" />
                </div>
            ) : (
                <>
                    {/* Modern Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white/5 p-10 rounded-[40px] border border-white/5 backdrop-blur-md">
                        <div className="flex items-center gap-6">
                            <Link href="/console" className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all text-gray-400">
                                <ArrowLeft className="h-6 w-6" />
                            </Link>
                            <div>
                                <h1 className="text-4xl font-black text-white tracking-tighter leading-none">{project.name}</h1>
                                <div className="flex items-center gap-4 mt-3">
                                    <span className="bg-orange-600/10 text-orange-500 border border-orange-600/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{project.platform}</span>
                                    <span className="font-mono text-[10px] text-gray-500 bg-black/40 px-3 py-1 rounded-full border border-white/5 uppercase tracking-tighter shadow-inner">PROJ_ID: {project.project_id || projectId}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => router.push(`/project/${projectId}/settings`)}
                                className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 text-xs font-black text-white uppercase tracking-widest transition-all"
                            >
                                <Settings className="h-4 w-4" />
                                Project Settings
                            </button>
                            <button
                                onClick={handleDeleteProject}
                                className="flex items-center gap-2 px-6 py-3 bg-red-600/10 border border-red-600/20 text-red-500 rounded-2xl hover:bg-red-600/20 text-xs font-black uppercase tracking-widest transition-all"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </button>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="grid gap-8 lg:grid-cols-3">

                        {/* Apps Management */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className="bg-[#0c1015] rounded-[48px] border border-white/5 shadow-2xl overflow-hidden">
                                <div className="p-10 border-b border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                                <Smartphone className="h-7 w-7 text-blue-500" />
                                                My Applications
                                            </h2>
                                            <p className="text-gray-500 mt-2 font-medium">Link multiple Android/iOS apps to this project.</p>
                                        </div>
                                        {!isAddingApp && (
                                            <button
                                                onClick={() => setIsAddingApp(true)}
                                                className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                                            >
                                                Add App
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="p-10 space-y-10">
                                    {isAddingApp && (
                                        <div className="bg-white/[0.02] p-8 rounded-[32px] border border-white/5 animate-in slide-in-from-top-4 duration-300">
                                            <h3 className="text-white font-black text-sm uppercase tracking-widest mb-6">Register New App</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">App Display Name</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. FriendZone Pro"
                                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-700 font-bold"
                                                        value={newAppName}
                                                        onChange={(e) => setNewAppName(e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Package Name</label>
                                                    <input
                                                        type="text"
                                                        placeholder="com.suguna.friendzone"
                                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-700 font-bold"
                                                        value={newPackageName}
                                                        onChange={(e) => setNewPackageName(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={handleAddApp}
                                                    className="flex-1 px-8 py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all"
                                                >
                                                    Register App
                                                </button>
                                                <button
                                                    onClick={() => setIsAddingApp(false)}
                                                    className="px-8 py-4 bg-white/5 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {apps.length === 0 && !isAddingApp ? (
                                        <div className="text-center py-20 bg-black/20 rounded-[40px] border-2 border-dashed border-white/5">
                                            <Smartphone className="h-16 w-16 text-gray-800 mx-auto mb-6" />
                                            <h3 className="text-xl font-black text-gray-500">No Apps Linked</h3>
                                            <p className="text-gray-700 text-sm mt-2 font-bold uppercase tracking-tight">Add your first platform to get started</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {apps.map((app) => (
                                                <div key={app.id} className="bg-white/[0.02] border border-white/5 rounded-[32px] overflow-hidden group">
                                                    <div className="p-8 flex items-center justify-between border-b border-white/[0.02] bg-white/[0.01]">
                                                        <div className="flex items-center gap-5">
                                                            <div className="h-14 w-14 bg-blue-600/10 border border-blue-600/20 rounded-2xl flex items-center justify-center text-blue-500 shadow-lg shadow-blue-500/5 transition-transform group-hover:scale-110">
                                                                <Smartphone className="h-7 w-7" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-lg font-black text-white tracking-tight">{app.app_name}</h3>
                                                                <code className="text-[11px] text-gray-500 font-bold uppercase tracking-tight">{app.package_name}</code>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                onClick={() => downloadConfig(app)}
                                                                className="p-3 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                                                                title="Download Config"
                                                            >
                                                                <Download className="h-5 w-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteApp(app.id)}
                                                                className="p-3 bg-rose-500/5 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                                            >
                                                                <Trash2 className="h-5 w-5" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="p-8">
                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-center mb-4">
                                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Certificate Fingerprints ({app.fingerprints?.length || 0})</span>
                                                                <button
                                                                    onClick={() => setAddingKeyTo(app.id)}
                                                                    className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline"
                                                                >
                                                                    + Add Signature
                                                                </button>
                                                            </div>

                                                            {app.fingerprints?.map((f: any) => (
                                                                <div key={f.id} className="p-5 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between group/key transition-all hover:bg-black/60">
                                                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                        <div className="min-w-[120px]">
                                                                            <span className="px-2.5 py-1 bg-white/5 rounded-lg text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">{f.label}</span>
                                                                        </div>
                                                                        <div className="md:col-span-2 space-y-2">
                                                                            {f.sha1 && <div className="flex items-center gap-3">
                                                                                <span className="text-[9px] font-black text-gray-600 uppercase">SHA-1:</span>
                                                                                <code className="text-[11px] text-gray-400 font-mono truncate">{f.sha1}</code>
                                                                            </div>}
                                                                            {f.sha256 && <div className="flex items-center gap-3">
                                                                                <span className="text-[9px] font-black text-gray-600 uppercase">SHA-256:</span>
                                                                                <code className="text-[11px] text-gray-400 font-mono truncate">{f.sha256}</code>
                                                                            </div>}
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleDeleteFingerprint(app.id, f.id)}
                                                                        className="p-2.5 text-gray-600 hover:text-rose-500 transition-colors opacity-0 group-hover/key:opacity-100"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            ))}

                                                            {addingKeyTo === app.id && (
                                                                <div className="mt-6 p-8 bg-blue-600/[0.03] border border-blue-600/10 rounded-[32px] animate-in zoom-in duration-200">
                                                                    <div className="flex justify-between items-center mb-6">
                                                                        <h4 className="text-xs font-black text-white uppercase tracking-widest">New SHA Signature</h4>
                                                                        <button onClick={() => setAddingKeyTo(null)} className="text-gray-500 hover:text-white transition-colors">✕</button>
                                                                    </div>
                                                                    <div className="space-y-5">
                                                                        <div className="grid grid-cols-2 gap-4">
                                                                            <div className="space-y-2">
                                                                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Environment</label>
                                                                                <input
                                                                                    type="text"
                                                                                    placeholder="Debug / Production"
                                                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-blue-500/50"
                                                                                    value={newKeyLabel}
                                                                                    onChange={(e) => setNewKeyLabel(e.target.value)}
                                                                                />
                                                                            </div>
                                                                            <div className="space-y-2">
                                                                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">SHA-1 Fingerprint</label>
                                                                                <input
                                                                                    type="text"
                                                                                    placeholder="XX:XX:XX:..."
                                                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-[10px] font-mono outline-none focus:border-blue-500/50"
                                                                                    value={newSha1}
                                                                                    onChange={(e) => setNewSha1(e.target.value)}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">SHA-256 (Recommended)</label>
                                                                            <input
                                                                                type="text"
                                                                                placeholder="XX:XX:XX:..."
                                                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-[10px] font-mono outline-none focus:border-blue-500/50"
                                                                                value={newSha256}
                                                                                onChange={(e) => setNewSha256(e.target.value)}
                                                                            />
                                                                        </div>
                                                                        <button
                                                                            onClick={handleAddFingerprint}
                                                                            disabled={savingKey}
                                                                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
                                                                        >
                                                                            {savingKey ? 'Verifying...' : 'Authenticate & Save Key'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Service Quick Links */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-[#12161c] rounded-[40px] border border-white/5 p-8 flex items-center justify-between group cursor-pointer hover:bg-[#161b22] transition-all">
                                    <div className="flex items-center gap-5">
                                        <div className="h-14 w-14 bg-purple-600/10 border border-purple-600/20 rounded-2xl flex items-center justify-center text-purple-500 shadow-xl shadow-purple-500/5">
                                            <Box className="h-7 w-7" />
                                        </div>
                                        <div>
                                            <h2 className="font-black text-white tracking-tight">Suguna Firestore</h2>
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-tighter mt-1">Real-time Document Store</p>
                                        </div>
                                    </div>
                                    <ArrowLeft className="h-5 w-5 text-gray-700 rotate-180 group-hover:translate-x-1 transition-transform" />
                                </div>
                                <div
                                    onClick={() => router.push(`/project/${projectId}/cast`)}
                                    className="bg-[#12161c] rounded-[40px] border border-white/5 p-8 flex items-center justify-between group cursor-pointer hover:bg-[#161b22] transition-all"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="h-14 w-14 bg-emerald-600/10 border border-emerald-600/20 rounded-2xl flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/5">
                                            <RefreshCw className="h-7 w-7" />
                                        </div>
                                        <div>
                                            <h2 className="font-black text-white tracking-tight">Suguna Cast</h2>
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-tighter mt-1">Media & Analytics</p>
                                        </div>
                                    </div>
                                    <ArrowLeft className="h-5 w-5 text-gray-700 rotate-180 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </div>

                        {/* Modern Sidebar */}
                        <div className="space-y-8">
                            <div className="bg-[#0c1015] rounded-[48px] border border-white/5 shadow-2xl p-10">
                                <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] mb-8">Performance</h3>
                                <div className="space-y-8">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Active Developers</span>
                                            <span className="text-sm font-bold text-white">Live Monitoring</span>
                                        </div>
                                        <span className="text-4xl font-black text-white tracking-tighter">{project.usersCount || 0}</span>
                                    </div>
                                    <div className="h-px bg-white/[0.03]"></div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">API Requests</span>
                                            <span className="text-sm font-bold text-white">Last 24 Hours</span>
                                        </div>
                                        <span className="text-2xl font-black text-emerald-500 tracking-tighter">Healthy</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-[#1a3449] to-[#0f1f2d] rounded-[48px] p-10 text-white shadow-2xl relative overflow-hidden group">
                                <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                    <Box className="h-60 w-60" />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-black tracking-tight mb-4">Architectural Ready</h3>
                                    <p className="text-sm text-gray-300 font-medium mb-10 leading-relaxed">
                                        Your multi-app configuration is now live. Each app validated by unique SHA signatures.
                                    </p>
                                    <a href="/docs/android" className="block w-full text-center bg-white text-black rounded-[24px] py-4 text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-black/20">
                                        SDK Implementation
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
