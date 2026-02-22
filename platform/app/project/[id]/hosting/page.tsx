'use client';

import { use, useEffect, useState } from 'react';
import { Globe, ExternalLink, Command, Copy, CheckCircle2 } from 'lucide-react';

interface HostingSite {
    id: number;
    site_name: string;
    secure_id: string;
    created_at: string;
    updated_at: string;
}

export default function HostingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [sites, setSites] = useState<HostingSite[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    useEffect(() => {
        if (!token) return;
        const fetchSites = async () => {
            try {
                const res = await fetch(`https://api.suguna.co/v1/console/projects/${id}/hosting/sites`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('API Request Failed');
                const data = await res.json();
                setSites(data.sites);
            } catch (err) {
                console.error("Failed to fetch hosting sites:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSites();
    }, [id, token]);

    const handleCopy = (text: string, siteId: number) => {
        navigator.clipboard.writeText(text);
        setCopiedId(siteId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (sites.length === 0) {
        return (
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
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                        <Globe className="h-8 w-8 text-blue-600" /> Total Deployments
                    </h1>
                    <p className="text-gray-500 mt-2 text-lg">Manage your live SugunaBase Hosting sites.</p>
                </div>
                <p className="text-sm font-semibold text-blue-600 bg-blue-50 px-4 py-2 rounded-full border border-blue-100 shadow-sm">
                    {sites.length} Active {sites.length === 1 ? 'Site' : 'Sites'}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {sites.map(site => {
                    const siteUrl = `https://api.suguna.co/site/${id}/${site.site_name}/${site.secure_id}`;

                    return (
                        <div key={site.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-transparent rounded-full -mr-16 -mt-16 pointer-events-none"></div>

                            <div className="flex items-center gap-4 mb-4 relative z-10">
                                <div className="h-12 w-12 bg-gradient-to-br from-blue-100 to-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100/50 shadow-inner">
                                    <Globe className="h-6 w-6 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                        {site.site_name}
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Live"></span>
                                    </h3>
                                    <p className="text-xs text-gray-400">Deployed: {new Date(site.updated_at).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 mb-4 flex items-center justify-between relative z-10 hover:border-blue-200 transition-colors">
                                <span className="font-mono text-xs text-gray-600 truncate mr-3 max-w-[80%]">
                                    {siteUrl}
                                </span>
                                <div className="flex gap-2 min-w-[56px] justify-end">
                                    <button
                                        onClick={() => handleCopy(siteUrl, site.id)}
                                        className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                                        title="Copy URL"
                                    >
                                        {copiedId === site.id ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                    </button>
                                    <a
                                        href={siteUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                                        title="Open in new tab"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-xs relative z-10">
                                <span className="text-gray-500 flex items-center gap-1">
                                    <span className="opacity-70">Secure Hash:</span>
                                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{site.secure_id.substring(0, 8)}...</span>
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
