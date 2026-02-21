'use client';

import { use, useEffect, useState } from 'react';
import {
    FileCode, Loader2, Play, ExternalLink, Terminal, Plus, Trash2,
    X, AlertTriangle, Clock, Globe, Database, MoreVertical,
    ChevronRight, Hash, Activity, RefreshCw, Layers, Copy, Check, Timer, Zap, Send
} from 'lucide-react';

export default function FunctionsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [functions, setFunctions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleteModal, setDeleteModal] = useState<{ open: boolean, name: string }>({ open: false, name: '' });
    const [logModal, setLogModal] = useState<{ open: boolean, name: string, data: any[] }>({ open: false, name: '', data: [] });
    const [testModal, setTestModal] = useState<{ open: boolean, name: string, input: string, output: string, loading: boolean }>({ open: false, name: '', input: '{}', output: '', loading: false });
    const [deleting, setDeleting] = useState(false);
    const [fetchingLogs, setFetchingLogs] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

    const fetchFunctions = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`https://api.suguna.co/v1/console/projects/${id}/functions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.functions) {
                setFunctions(data.functions);
            } else if (data.error) {
                setError(data.error);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async (funcName: string) => {
        setFetchingLogs(true);
        setLogModal({ open: true, name: funcName, data: [] });
        setActiveMenu(null);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`https://api.suguna.co/v1/console/projects/${id}/functions/${funcName}/logs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setLogModal(prev => ({ ...prev, data: data.logs || [] }));
        } catch (err) {
            console.error("Failed to fetch logs", err);
        } finally {
            setFetchingLogs(false);
        }
    };

    const handleTestRun = async () => {
        setTestModal(prev => ({ ...prev, loading: true, output: '' }));
        const token = localStorage.getItem('token');
        try {
            let payload = {};
            try { payload = JSON.parse(testModal.input); } catch (e) { }

            const res = await fetch(`https://api.suguna.co/functions/run/${id}/${testModal.name}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            setTestModal(prev => ({ ...prev, output: JSON.stringify(data, null, 2), loading: false }));
            // Refresh counts
            fetchFunctions();
        } catch (err: any) {
            setTestModal(prev => ({ ...prev, output: "Error: " + err.message, loading: false }));
        }
    };

    const handleDelete = async () => {
        const token = localStorage.getItem('token');
        setDeleting(true);
        try {
            const res = await fetch(`https://api.suguna.co/v1/console/projects/${id}/functions/${deleteModal.name}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setFunctions(prev => prev.filter(f => f.name !== deleteModal.name));
                setDeleteModal({ open: false, name: '' });
            }
        } catch (err: any) {
            alert("Delete failed: " + err.message);
        } finally {
            setDeleting(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedUrl(text);
        setTimeout(() => setCopiedUrl(null), 2000);
    };

    useEffect(() => {
        fetchFunctions();
    }, [id]);

    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest('.menu-container')) {
                setActiveMenu(null);
            }
        };
        window.addEventListener('click', handleOutsideClick);
        return () => window.removeEventListener('click', handleOutsideClick);
    }, []);

    const getTriggerIcon = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'http': return <Globe className="h-4 w-4 text-blue-500" />;
            case 'schedule': return <Clock className="h-4 w-4 text-orange-500" />;
            case 'firestore': return <Database className="h-4 w-4 text-amber-500" />;
            default: return <Globe className="h-4 w-4 text-gray-400" />;
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <RefreshCw className="h-10 w-10 text-purple-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium tracking-tight">Loading Suguna Cloud Engine...</p>
            </div>
        );
    }

    return (
        <div className="p-0 animate-in fade-in duration-500">
            {/* Test Run Modal */}
            {testModal.open && (
                <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] p-8 max-w-2xl w-full shadow-2xl border border-gray-100 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-emerald-50 rounded-2xl">
                                    <Zap className="h-6 w-6 text-emerald-500" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Test Run</h3>
                                    <p className="text-xs text-gray-400 font-bold font-mono">Function: {testModal.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setTestModal({ open: false, name: '', input: '{}', output: '', loading: false })} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                <X className="h-6 w-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-hidden">
                            <div className="flex flex-col space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Request Body (JSON)</label>
                                <textarea
                                    value={testModal.input}
                                    onChange={(e) => setTestModal(prev => ({ ...prev, input: e.target.value }))}
                                    className="flex-1 p-4 bg-gray-50 border border-gray-200 rounded-2xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                                />
                            </div>
                            <div className="flex flex-col space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Response Output</label>
                                <div className="flex-1 p-4 bg-gray-900 border border-gray-800 rounded-2xl font-mono text-sm text-emerald-400 overflow-auto whitespace-pre">
                                    {testModal.loading ? (
                                        <div className="flex items-center gap-3 animate-pulse">
                                            <div className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce"></div>
                                            Executing...
                                        </div>
                                    ) : testModal.output || "// Result will appear here"}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3">
                            <button
                                onClick={handleTestRun}
                                disabled={testModal.loading}
                                className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl"
                            >
                                {testModal.loading ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-4 w-4" />}
                                RUN TEST NOW
                            </button>
                            <button
                                onClick={() => setTestModal({ open: false, name: '', input: '{}', output: '', loading: false })}
                                className="px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all"
                            >
                                CLOSE
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteModal.open && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-300">
                        <div className="text-center space-y-6">
                            <div className="inline-flex p-5 bg-red-50 rounded-full border border-red-100">
                                <AlertTriangle className="h-10 w-10 text-red-500" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-gray-900 uppercase">Delete Function?</h3>
                                <p className="text-gray-500 text-sm font-medium leading-relaxed">
                                    Deleting <span className="font-bold text-red-600">"{deleteModal.name}"</span> is permanent.
                                    This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex flex-col gap-2 pt-2">
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="py-4 bg-red-600 text-white rounded-2xl font-black text-sm hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center shadow-lg shadow-red-200"
                                >
                                    {deleting ? <Loader2 className="animate-spin h-5 w-5" /> : "YES, DELETE PERMANENTLY"}
                                </button>
                                <button
                                    onClick={() => setDeleteModal({ open: false, name: '' })}
                                    className="py-4 bg-gray-100 text-gray-700 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all"
                                >
                                    CANCEL
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Logs Modal (Side Panel) */}
            {logModal.open && (
                <div className="fixed inset-y-0 right-0 z-[210] w-full max-w-2xl bg-gray-950 shadow-[-20px_0_100px_rgba(0,0,0,0.8)] border-l border-gray-800 animate-in slide-in-from-right duration-500">
                    <div className="flex flex-col h-full">
                        <div className="p-8 border-b border-gray-800 flex items-center justify-between bg-gray-900/50 backdrop-blur-md">
                            <div>
                                <h3 className="text-gray-100 font-black text-2xl flex items-center gap-3 tracking-tighter">
                                    <Terminal className="h-6 w-6 text-purple-400" />
                                    {logModal.name} <span className="text-gray-600 text-sm font-medium ml-2 font-sans">Logs</span>
                                </h3>
                                <p className="text-[10px] text-gray-500 font-mono mt-2 uppercase tracking-widest font-black">Showing last 50 execution streams</p>
                            </div>
                            <button onClick={() => setLogModal({ open: false, name: '', data: [] })} className="p-3 text-gray-400 hover:text-white rounded-2xl bg-gray-800/50 transition-all hover:rotate-90">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-[13px] scrollbar-thin scrollbar-thumb-gray-800">
                            {fetchingLogs ? (
                                <div className="flex flex-col items-center justify-center h-60 space-y-4">
                                    <div className="h-8 w-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"></div>
                                    <p className="text-gray-500 font-black uppercase tracking-[4px] text-[10px]">Syncing logs...</p>
                                </div>
                            ) : logModal.data.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-60 border border-dashed border-gray-800 rounded-2xl">
                                    <Activity className="h-10 w-10 text-gray-800 mb-4" />
                                    <p className="text-gray-600 italic">No execution logs captured yet.</p>
                                </div>
                            ) : (
                                logModal.data.map((log) => (
                                    <div key={log.id} className="p-5 rounded-2xl bg-gray-900/40 border border-gray-800 group hover:border-purple-900/50 transition-all duration-300">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                                    {log.status}
                                                </span>
                                                <span className="text-gray-500 text-[10px] font-bold">{new Date(log.created_at).toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-gray-400">
                                                <Timer className="h-3 w-3" />
                                                <span className="text-[10px] font-black">{log.execution_time_ms}ms</span>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-black/50 rounded-xl border border-gray-800/50">
                                            <pre className="whitespace-pre-wrap text-emerald-100/80 leading-relaxed overflow-x-auto selection:bg-purple-500/40">
                                                {log.logs || "EMPTY OUTPUT"}
                                            </pre>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="p-8 pb-4">
                <div className="flex justify-between items-end mb-8">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3 text-purple-600 mb-3">
                            <Layers className="h-5 w-5" />
                            <span className="text-[11px] font-black uppercase tracking-[4px]">Cloud Engine Dashboard</span>
                        </div>
                        <h1 className="text-5xl font-black text-gray-900 tracking-tighter">Functions</h1>
                        <p className="text-lg text-gray-500 font-medium tracking-tight">Deploy and manage your mission-critical edge functions.</p>
                    </div>
                    <button className="px-8 py-4 bg-gray-900 text-white rounded-[1.25rem] font-black text-sm hover:scale-[1.05] active:scale-95 transition-all shadow-2xl shadow-black/20 flex items-center gap-3 hover:bg-black uppercase tracking-wider">
                        <Plus className="h-5 w-5" />
                        Create Function
                    </button>
                </div>

                {/* Sub-nav */}
                <div className="flex border-b border-gray-100 gap-10">
                    <button className="pb-4 border-b-4 border-purple-600 text-purple-600 font-black text-xs uppercase tracking-widest">Dashboard</button>
                    <button className="pb-4 text-gray-400 font-black text-xs uppercase tracking-widest hover:text-gray-800 transition-colors">Usage Stats</button>
                    <button className="pb-4 text-gray-400 font-black text-xs uppercase tracking-widest hover:text-gray-800 transition-colors">Health & Logs</button>
                </div>
            </div>

            {/* Table Section (Firebase Style) */}
            <div className="px-8 pb-12">
                {functions.length === 0 ? (
                    <div className="mt-12 border-2 border-dashed border-gray-100 rounded-[3rem] p-24 text-center bg-gray-50/20 group hover:border-purple-200 transition-all cursor-default">
                        <div className="inline-flex p-8 bg-white rounded-[2rem] shadow-xl shadow-purple-100/50 border border-gray-100 mb-8 group-hover:scale-110 transition-transform">
                            <FileCode className="h-12 w-12 text-purple-500" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">No functions available</h2>
                        <p className="text-gray-500 text-sm max-w-sm mx-auto mt-3 font-medium leading-relaxed">Your cloud functions list is empty. Use the SugunaBase CLI to deploy your code in seconds.</p>
                    </div>
                ) : (
                    <div className="mt-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-visible">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/30 border-b border-gray-100">
                                    <th className="px-10 py-6 text-[11px] font-black uppercase tracking-[2px] text-gray-400">Function Name</th>
                                    <th className="px-10 py-6 text-[11px] font-black uppercase tracking-[2px] text-gray-400">Trigger & Endpoint</th>
                                    <th className="px-10 py-6 text-[11px] font-black uppercase tracking-[2px] text-gray-400">Region & Timeout</th>
                                    <th className="px-10 py-6 text-[11px] font-black uppercase tracking-[2px] text-gray-400">Stats</th>
                                    <th className="px-10 py-6 text-[11px] font-black uppercase tracking-[2px] text-gray-400">Runtime</th>
                                    <th className="px-10 py-6 text-[11px] font-black uppercase tracking-[2px] text-gray-400 text-right">Settings</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {functions.map((fn) => {
                                    const triggerUrl = `https://api.suguna.co/functions/run/${id}/${fn.name}`;
                                    return (
                                        <tr key={fn.id} className="group hover:bg-gray-50/50 transition-all duration-300">
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-5">
                                                    <div className="p-4 bg-purple-50 rounded-2xl group-hover:bg-purple-100 transition-colors shadow-inner">
                                                        <FileCode className="h-6 w-6 text-purple-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-gray-900 text-lg group-hover:text-purple-600 transition-colors uppercase tracking-tight">{fn.name}</p>
                                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">v1.0.0 • Deploy Success</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl">
                                                        {getTriggerIcon(fn.trigger_type)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <p className="text-xs font-black text-gray-800 uppercase tracking-wider">{fn.trigger_type || 'HTTP'}</p>
                                                        {fn.trigger_type === 'http' && (
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <p className="text-[11px] text-gray-400 font-mono truncate max-w-[140px] font-bold">
                                                                    {triggerUrl}
                                                                </p>
                                                                <button
                                                                    onClick={() => copyToClipboard(triggerUrl)}
                                                                    className="p-1 px-2 hover:bg-purple-50 hover:text-purple-600 text-gray-300 rounded-md transition-all flex items-center gap-2"
                                                                >
                                                                    {copiedUrl === triggerUrl ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                                                    <span className="text-[9px] font-black uppercase">Copy</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <Globe className="h-3 w-3 text-gray-300" />
                                                        <span className="text-xs font-bold text-gray-600">{fn.region || 'asia-south1'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Timer className="h-3 w-3 text-gray-300" />
                                                        <span className="text-xs font-bold text-gray-600">{fn.timeout_seconds || 60}s timeout</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="inline-flex items-center gap-3 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
                                                    <Activity className="h-4 w-4" />
                                                    <span className="text-xs font-black">{fn.request_count || 0}</span>
                                                    <span className="text-[9px] font-bold uppercase opacity-60">Reqs</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <span className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-tighter border border-gray-200/50">
                                                    {fn.runtime}
                                                </span>
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                <div className="relative menu-container inline-block">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveMenu(activeMenu === fn.name ? null : fn.name);
                                                        }}
                                                        className={`p-3 rounded-2xl transition-all border shadow-sm ${activeMenu === fn.name ? 'bg-purple-600 text-white border-purple-600 shadow-purple-200' : 'bg-white text-gray-300 hover:text-gray-800 border-gray-100'}`}
                                                    >
                                                        <MoreVertical className="h-5 w-5" />
                                                    </button>

                                                    {activeMenu === fn.name && (
                                                        <div className="absolute right-0 top-full mt-3 w-56 bg-white rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 py-3 z-[150] animate-in zoom-in-95 origin-top-right overflow-hidden">
                                                            <div className="px-4 py-2 mb-2 border-b border-gray-50">
                                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Function Settings</p>
                                                            </div>
                                                            <button onClick={() => fetchLogs(fn.name)} className="w-full px-5 py-3 text-left text-[13px] font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-4 transition-all hover:translate-x-1">
                                                                <div className="p-1.5 bg-purple-50 rounded-lg"><Terminal className="h-4 w-4 text-purple-600" /></div>
                                                                View Logs
                                                            </button>
                                                            <button onClick={() => { setTestModal({ open: true, name: fn.name, input: '{}', output: '', loading: false }); setActiveMenu(null); }} className="w-full px-5 py-3 text-left text-[13px] font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-4 transition-all hover:translate-x-1">
                                                                <div className="p-1.5 bg-emerald-50 rounded-lg"><Zap className="h-4 w-4 text-emerald-600" /></div>
                                                                Test Run
                                                            </button>
                                                            <button className="w-full px-5 py-3 text-left text-[13px] font-bold text-gray-400 hover:bg-gray-50 flex items-center gap-4 transition-all opacity-50 cursor-not-allowed">
                                                                <div className="p-1.5 bg-gray-50 rounded-lg"><Clock className="h-4 w-4 text-gray-400" /></div>
                                                                Schedule Task
                                                            </button>
                                                            <div className="h-px bg-gray-50 my-2 mx-3"></div>
                                                            <button
                                                                onClick={() => {
                                                                    setDeleteModal({ open: true, name: fn.name });
                                                                    setActiveMenu(null);
                                                                }}
                                                                className="w-full px-5 py-3 text-left text-[13px] font-black text-red-600 hover:bg-red-50 flex items-center gap-4 transition-all"
                                                            >
                                                                <div className="p-1.5 bg-red-50 rounded-lg"><Trash2 className="h-4 w-4 text-red-600" /></div>
                                                                Delete Function
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
