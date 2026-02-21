'use client';

import { use, useEffect, useState } from 'react';
import {
    FileCode, Loader2, Play, ExternalLink, Terminal, Plus, Trash2,
    X, AlertTriangle, Clock, Globe, Database, MoreVertical,
    ChevronRight, Hash, Activity, RefreshCw, Layers
} from 'lucide-react';

export default function FunctionsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [functions, setFunctions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleteModal, setDeleteModal] = useState<{ open: boolean, name: string }>({ open: false, name: '' });
    const [logModal, setLogModal] = useState<{ open: boolean, name: string, data: any[] }>({ open: false, name: '', data: [] });
    const [deleting, setDeleting] = useState(false);
    const [fetchingLogs, setFetchingLogs] = useState(false);

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

    useEffect(() => {
        fetchFunctions();
    }, [id]);

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
                <p className="text-gray-500 font-medium">Loading Suguna Engine...</p>
            </div>
        );
    }

    return (
        <div className="p-0 animate-in fade-in duration-500">
            {/* Delete Modal */}
            {deleteModal.open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-100 animate-in zoom-in-95">
                        <div className="text-center space-y-4">
                            <div className="inline-flex p-4 bg-red-50 rounded-full">
                                <AlertTriangle className="h-8 w-8 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Delete Function?</h3>
                            <p className="text-gray-500 text-sm">Deleting <span className="font-bold text-red-600">"{deleteModal.name}"</span> is permanent and cannot be undone.</p>
                            <div className="flex flex-col gap-2 pt-4">
                                <button onClick={handleDelete} disabled={deleting} className="py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all flex items-center justify-center">
                                    {deleting ? <Loader2 className="animate-spin h-4 w-4" /> : "DELETE PERMANENTLY"}
                                </button>
                                <button onClick={() => setDeleteModal({ open: false, name: '' })} className="py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200">CANCEL</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Logs Modal (Side Panel) */}
            {logModal.open && (
                <div className="fixed inset-y-0 right-0 z-[110] w-full max-w-2xl bg-gray-950 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] border-l border-gray-800 animate-in slide-in-from-right duration-300">
                    <div className="flex flex-col h-full">
                        <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
                            <div>
                                <h3 className="text-gray-100 font-bold text-lg flex items-center gap-2">
                                    <Terminal className="h-4 w-4 text-purple-400" />
                                    Execution Logs: {logModal.name}
                                </h3>
                                <p className="text-xs text-gray-500 font-mono mt-1">Showing last 50 entries</p>
                            </div>
                            <button onClick={() => setLogModal({ open: false, name: '', data: [] })} className="p-2 text-gray-400 hover:text-white rounded-full bg-gray-800 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[13px] scrollbar-thin scrollbar-thumb-gray-700">
                            {fetchingLogs ? (
                                <div className="flex items-center justify-center h-40">
                                    <Loader2 className="animate-spin text-purple-500 h-6 w-6" />
                                </div>
                            ) : logModal.data.length === 0 ? (
                                <p className="text-gray-600 text-center mt-10 italic">No execution logs found for this function.</p>
                            ) : (
                                logModal.data.map((log) => (
                                    <div key={log.id} className="p-4 rounded-xl bg-gray-900/30 border border-gray-800 group hover:border-gray-700 transition-all">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                    {log.status}
                                                </span>
                                                <span className="text-gray-500 text-[11px]">{new Date(log.created_at).toLocaleString()}</span>
                                            </div>
                                            <span className="text-gray-400 text-xs font-bold">{log.execution_time_ms}ms</span>
                                        </div>
                                        <pre className="whitespace-pre-wrap text-gray-200 leading-relaxed overflow-x-auto selection:bg-purple-500/30">
                                            {log.logs || "EMPTY OUTPUT"}
                                        </pre>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="p-8 pb-4">
                <div className="flex justify-between items-end mb-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-purple-600 mb-2">
                            <Layers className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-[3px]">Infrastructure Console</span>
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Functions</h1>
                        <p className="text-gray-500 font-medium">Deploy and manage your serverless backend triggers.</p>
                    </div>
                    <button className="px-6 py-3 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/10 flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Create Function
                    </button>
                </div>

                {/* Sub-nav */}
                <div className="flex border-b border-gray-100 gap-8">
                    <button className="pb-3 border-b-2 border-purple-600 text-purple-600 font-bold text-sm">Dashboard</button>
                    <button className="pb-3 text-gray-400 font-bold text-sm hover:text-gray-600 transition-colors">Usage Stats</button>
                    <button className="pb-3 text-gray-400 font-bold text-sm hover:text-gray-600 transition-colors">Health</button>
                </div>
            </div>

            {/* Table Section (Firebase Style) */}
            <div className="px-8 pb-12">
                {functions.length === 0 ? (
                    <div className="mt-8 border-2 border-dashed border-gray-100 rounded-[2.5rem] p-20 text-center bg-gray-50/30">
                        <div className="inline-flex p-6 bg-white rounded-3xl shadow-sm border border-gray-100 mb-6">
                            <FileCode className="h-10 w-10 text-purple-500" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">No functions available</h2>
                        <p className="text-gray-500 text-sm max-w-sm mx-auto mt-2">Deploy your first function using the CLI to see it listed here.</p>
                    </div>
                ) : (
                    <div className="mt-6 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Function</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Trigger</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Version</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Requests (Total)</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Runtime</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {functions.map((fn) => (
                                    <tr key={fn.id} className="group hover:bg-gray-50/30 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition-colors">
                                                    <FileCode className="h-5 w-5 text-purple-600" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{fn.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-mono tracking-tighter">asia-south1 (Mumbai)</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gray-50 rounded-lg">
                                                    {getTriggerIcon(fn.trigger_type)}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-700 capitalize">{fn.trigger_type || 'HTTP'}</p>
                                                    <p className="text-[10px] text-gray-400 font-mono truncate max-w-[150px]">
                                                        {fn.trigger_value || (fn.trigger_type === 'http' ? `https://api.suguna.co/functions/run/${id}/${fn.name}` : 'No details')}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-xs font-mono text-gray-500">v1</td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <Activity className="h-3 w-3 text-emerald-500" />
                                                <span className="text-xs font-black text-gray-700">{fn.request_count || 0}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-[10px] font-black uppercase">{fn.runtime}</span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="relative group/menu inline-block">
                                                <button className="p-2 text-gray-300 hover:text-gray-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-gray-100 shadow-sm">
                                                    <MoreVertical className="h-5 w-5" />
                                                </button>

                                                {/* Desktop Dropdown Tooltip */}
                                                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 hidden group-focus-within/menu:block hover:block z-20 animate-in zoom-in-95 origin-top-right">
                                                    <button onClick={() => fetchLogs(fn.name)} className="w-full px-4 py-2.5 text-left text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                                                        <Terminal className="h-4 w-4 text-gray-400" /> View Logs
                                                    </button>
                                                    <button className="w-full px-4 py-2.5 text-left text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                                                        <Play className="h-4 w-4 text-emerald-500" /> Execute Call
                                                    </button>
                                                    <div className="h-px bg-gray-50 my-2 mx-2"></div>
                                                    <button onClick={() => setDeleteModal({ open: true, name: fn.name })} className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors">
                                                        <Trash2 className="h-4 w-4" /> Delete Function
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
