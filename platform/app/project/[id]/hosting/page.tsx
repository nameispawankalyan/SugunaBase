'use client';

import { use, useEffect, useState } from 'react';
import { Globe, ExternalLink, Command, Copy, CheckCircle2, Trash2, Power, PowerOff, AlertTriangle, X } from 'lucide-react';

interface HostingSite {
    id: number;
    site_name: string;
    secure_id: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

interface DialogState {
    show: boolean;
    type: 'delete' | 'toggle';
    siteId: number | null;
    siteName: string;
    currentStatus?: boolean;
}

export default function HostingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [sites, setSites] = useState<HostingSite[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [processingId, setProcessingId] = useState<number | null>(null);

    // Dialog State
    const [dialog, setDialog] = useState<DialogState>({ show: false, type: 'toggle', siteId: null, siteName: '' });

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const fetchSites = async () => {
        if (!token) {
            setLoading(false);
            setError("Authentication token missing. Please log in again.");
            return;
        }
        try {
            const res = await fetch(`https://api.suguna.co/v1/console/projects/${id}/hosting/sites`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(`API Error: ${res.status} ${res.statusText}`);
            const data = await res.json();
            setSites(data.sites || []);
        } catch (err: any) {
            console.error("Failed to fetch hosting sites:", err);
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSites();
    }, [id, token]);

    const handleCopy = (text: string, siteId: number) => {
        navigator.clipboard.writeText(text);
        setCopiedId(siteId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const confirmToggle = async () => {
        if (!dialog.siteId) return;
        const { siteId, currentStatus } = dialog;
        setDialog({ ...dialog, show: false });
        setProcessingId(siteId);
        try {
            const res = await fetch(`https://api.suguna.co/v1/console/projects/${id}/hosting/sites/${siteId}/toggle`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ active: !currentStatus })
            });
            if (res.ok) await fetchSites();
        } catch (err) {
            alert("Action failed.");
        } finally {
            setProcessingId(null);
        }
    };

    const confirmDelete = async () => {
        if (!dialog.siteId) return;
        const { siteId } = dialog;
        setDialog({ ...dialog, show: false });
        setProcessingId(siteId);
        try {
            const res = await fetch(`https://api.suguna.co/v1/console/projects/${id}/hosting/sites/${siteId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) await fetchSites();
        } catch (err) {
            alert("Delete failed.");
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-600 mb-4 px-6 font-medium">
                    ⚠️ Error: {error}
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto relative">

            {/* Custom Premium Dialog */}
            {dialog.show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div className={`p-4 rounded-2xl ${dialog.type === 'delete' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
                                {dialog.type === 'delete' ? <Trash2 className="h-6 w-6" /> : <PowerOff className="h-6 w-6" />}
                            </div>
                            <button onClick={() => setDialog({ ...dialog, show: false })} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <h3 className="text-xl font-bold text-slate-900 mb-2">
                            {dialog.type === 'delete' ? 'Delete Deployment?' : `${dialog.currentStatus ? 'Deactivate' : 'Activate'} Site?`}
                        </h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-8">
                            {dialog.type === 'delete'
                                ? `Are you sure you want to permanently delete "${dialog.siteName}"? This action cannot be undone.`
                                : `This will immediately make "${dialog.siteName}" ${dialog.currentStatus ? 'offline' : 'online'} for all users.`}
                        </p>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setDialog({ ...dialog, show: false })}
                                className="flex-1 py-3 px-4 rounded-xl font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-all text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={dialog.type === 'delete' ? confirmDelete : confirmToggle}
                                className={`flex-1 py-3 px-4 rounded-xl font-semibold text-white transition-all text-sm shadow-lg shadow-${dialog.type === 'delete' ? 'red' : 'orange'}-200 ${dialog.type === 'delete' ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'}`}
                            >
                                {dialog.type === 'delete' ? 'Delete' : (dialog.currentStatus ? 'Deactivate' : 'Activate')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                        <Globe className="h-8 w-8 text-blue-600" /> Total Deployments
                    </h1>
                    <p className="text-gray-500 mt-2 text-lg">Manage your live SugunaBase Hosting sites.</p>
                </div>
                {sites.length > 0 && (
                    <div className="flex flex-col items-end gap-1">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Global Status</p>
                        <p className="text-sm font-semibold text-blue-600 bg-blue-50 px-4 py-2 rounded-full border border-blue-100 shadow-sm">
                            {sites.length} Active {sites.length === 1 ? 'Site' : 'Sites'}
                        </p>
                    </div>
                )}
            </div>

            {sites.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
                    <div className="bg-blue-50 p-6 rounded-full mb-6 relative">
                        <Globe className="h-14 w-14 text-blue-600" />
                        <div className="absolute top-0 right-0 h-4 w-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">Global Edge Hosting</h1>
                    <p className="text-gray-500 max-w-lg mb-8 text-lg">
                        Deploy your web apps instantly to Suguna CDN with zero-config SSL and lightning-fast speeds.
                    </p>

                    <div className="bg-white p-8 rounded-2xl border border-gray-200 w-full max-w-2xl shadow-sm text-left">
                        <h3 className="text-sm uppercase tracking-wider font-bold text-gray-400 mb-4">Deploy via Suguna CLI</h3>
                        <div className="space-y-4">
                            <div className="bg-gray-900 rounded-xl p-4 font-mono text-sm text-green-400 flex items-center justify-between group">
                                <div>
                                    <span className="text-gray-500 mr-2">$</span> sugunabase init hosting
                                </div>
                                <Command className="h-4 w-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="bg-gray-900 rounded-xl p-4 font-mono text-sm text-blue-400 flex items-center justify-between group">
                                <div>
                                    <span className="text-gray-500 mr-2">$</span> sugunabase deploy hosting
                                </div>
                                <Command className="h-4 w-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {sites.map(site => {
                        const siteUrl = `https://api.suguna.co/site/${id}/${site.site_name}/${site.secure_id}`;
                        const isProcessing = processingId === site.id;

                        return (
                            <div key={site.id} className={`bg-white p-6 rounded-2xl border ${site.is_active ? 'border-gray-200 shadow-sm' : 'border-red-100 bg-red-50/10'} hover:shadow-md transition-all group relative overflow-hidden`}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-transparent rounded-full -mr-16 -mt-16 pointer-events-none"></div>

                                <div className="flex items-center gap-4 mb-4 relative z-10">
                                    <div className={`h-12 w-12 ${site.is_active ? 'bg-gradient-to-br from-blue-100' : 'bg-gray-100'} to-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100/50 shadow-inner`}>
                                        <Globe className={`h-6 w-6 ${site.is_active ? 'text-blue-600' : 'text-gray-400'}`} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className={`font-bold ${site.is_active ? 'text-gray-900' : 'text-gray-500'} text-lg flex items-center gap-2`}>
                                            {site.site_name}
                                            <span className={`w-2 h-2 rounded-full ${site.is_active ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} title={site.is_active ? 'Live' : 'Inactive'}></span>
                                        </h3>
                                        <p className="text-xs text-gray-400">Synced: {new Date(site.updated_at).toLocaleString()}</p>
                                    </div>

                                    <div className="flex gap-1">
                                        <button
                                            disabled={isProcessing}
                                            onClick={() => setDialog({ show: true, type: 'toggle', siteId: site.id, siteName: site.site_name, currentStatus: site.is_active })}
                                            className={`p-2 rounded-lg transition-colors ${site.is_active ? 'text-orange-500 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'} ${isProcessing ? 'opacity-30' : ''}`}
                                            title={site.is_active ? 'Deactivate Site' : 'Activate Site'}
                                        >
                                            {site.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                                        </button>
                                        <button
                                            disabled={isProcessing}
                                            onClick={() => setDialog({ show: true, type: 'delete', siteId: site.id, siteName: site.site_name })}
                                            className={`p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors ${isProcessing ? 'opacity-30' : ''}`}
                                            title="Delete Site"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className={`bg-gray-50 rounded-xl p-3 border border-gray-100 mb-4 flex items-center justify-between relative z-10 ${site.is_active ? 'hover:border-blue-200' : 'opacity-60'} transition-colors`}>
                                    <span className={`font-mono text-xs ${site.is_active ? 'text-gray-600' : 'text-gray-400'} truncate mr-3 max-w-[80%]`}>
                                        {siteUrl}
                                    </span>
                                    <div className="flex gap-2 min-w-[56px] justify-end">
                                        <button
                                            disabled={!site.is_active}
                                            onClick={() => handleCopy(siteUrl, site.id)}
                                            className="text-gray-400 hover:text-blue-600 disabled:opacity-30 transition-colors p-1"
                                            title="Copy URL"
                                        >
                                            {copiedId === site.id ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </button>
                                        <a
                                            href={site.is_active ? siteUrl : '#'}
                                            target={site.is_active ? "_blank" : "_self"}
                                            rel="noopener noreferrer"
                                            className={`text-gray-400 hover:text-blue-600 transition-colors p-1 ${!site.is_active ? 'pointer-events-none opacity-30' : ''}`}
                                            title="Open in new tab"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    </div>
                                </div>

                                {!site.is_active && (
                                    <div className="mb-4 text-xs font-semibold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 inline-block relative z-10">
                                        Offline: Requests will be blocked
                                    </div>
                                )}

                                <div className="flex justify-between items-center text-xs relative z-10">
                                    <span className="text-gray-500 flex items-center gap-1">
                                        <span className="opacity-70">Security:</span>
                                        <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{site.secure_id.substring(0, 8)}...</span>
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
