'use client';

import { use, useEffect, useState } from 'react';
import { FileCode, Loader2, Play, ExternalLink, Terminal, Plus, Trash2, X, AlertTriangle, Clock } from 'lucide-react';

export default function FunctionsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [functions, setFunctions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleteModal, setDeleteModal] = useState<{ open: boolean, name: string }>({ open: false, name: '' });
    const [deleting, setDeleting] = useState(false);

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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
                <div className="relative">
                    <div className="h-12 w-12 rounded-full border-4 border-purple-100 border-t-purple-600 animate-spin"></div>
                </div>
                <p className="mt-4 text-gray-500 font-medium tracking-tight">Syncing your edge functions...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center bg-red-50 rounded-xl border border-red-100 m-8">
                <p className="text-red-600 font-semibold mb-2">Error Loading Functions</p>
                <p className="text-red-500 text-sm">{error}</p>
                <button onClick={() => { setLoading(true); fetchFunctions(); }} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-all">
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-700 fill-mode-both">
            {/* Custom Delete Modal */}
            {deleteModal.open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl scale-90 animate-in zoom-in-95 duration-300 border border-gray-100">
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="p-5 bg-red-50 rounded-full border border-red-100">
                                <AlertTriangle className="h-12 w-12 text-red-500" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Are you sure?</h3>
                                <p className="text-gray-500 font-medium leading-relaxed">
                                    This will permanently delete <span className="text-red-600 font-bold">"{deleteModal.name}"</span>.
                                    This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex flex-col w-full gap-3 pt-4">
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-lg hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center space-x-2 shadow-xl shadow-red-200"
                                >
                                    {deleting ? <Loader2 className="animate-spin h-6 w-6" /> : <span>YES, DELETE IT</span>}
                                </button>
                                <button
                                    onClick={() => setDeleteModal({ open: false, name: '' })}
                                    className="w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-black text-lg hover:bg-gray-200 transition-all active:scale-95"
                                >
                                    CANCEL
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-purple-600">
                        <Terminal className="h-5 w-5" />
                        <span className="text-sm font-bold uppercase tracking-widest">Edge Engine</span>
                    </div>
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Suguna Functions</h1>
                    <p className="text-lg text-gray-500 font-medium">Serverless backend logic for Project {id}.</p>
                </div>

                <div className="flex items-center space-x-3">
                    <button className="flex items-center space-x-2 px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-all shadow-lg hover:shadow-black/20 active:scale-95">
                        <Plus className="h-5 w-5" />
                        <span className="font-semibold text-sm">Create Function</span>
                    </button>
                </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent w-full" />

            {/* Content Section */}
            {functions.length === 0 ? (
                <div className="group relative flex flex-col items-center justify-center h-[400px] text-center border-2 border-dashed border-gray-200 rounded-3xl bg-white/50 backdrop-blur-sm p-12 hover:border-purple-300 transition-all cursor-default overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-100/30 rounded-full blur-3xl group-hover:bg-purple-200/40 transition-all duration-1000"></div>
                    <div className="relative z-10 space-y-6">
                        <div className="inline-flex p-5 bg-purple-50 rounded-2xl shadow-inner border border-purple-100/50">
                            <FileCode className="h-10 w-10 text-purple-500" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-gray-800">No functions deployed yet</h2>
                            <p className="text-gray-500 max-w-sm mx-auto font-medium">
                                Start by using the CLI to bundle and deploy your first serverless function.
                            </p>
                        </div>

                        <div className="bg-gray-900 rounded-xl p-4 text-left font-mono text-sm inline-block shadow-2xl shadow-black/10 border border-gray-800">
                            <div className="flex items-center space-x-2 mb-2">
                                <span className="h-3 w-3 rounded-full bg-red-400"></span>
                                <span className="h-3 w-3 rounded-full bg-yellow-400"></span>
                                <span className="h-3 w-3 rounded-full bg-green-400"></span>
                                <span className="text-gray-500 ml-4">Terminal — sugunabase-cli</span>
                            </div>
                            <p className="text-blue-400">$ <span className="text-white">sugunabase login</span></p>
                            <p className="text-blue-400">$ <span className="text-white">sugunabase deploy</span></p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {functions.map((fn, index) => (
                        <div
                            key={fn.id}
                            style={{ animationDelay: `${index * 100}ms` }}
                            className="group bg-white p-7 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-purple-200/30 hover:-translate-y-2 transition-all duration-500 relative overflow-hidden animate-in zoom-in-95 fill-mode-both"
                        >
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-purple-50 rounded-full blur-2xl group-hover:bg-purple-100 transition-colors"></div>

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="p-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg shadow-purple-200">
                                        <FileCode className="h-8 w-8 text-white" />
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${fn.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                                            ● {fn.status}
                                        </span>
                                        <span className="text-[10px] text-gray-400 mt-1 font-mono">{new Date(fn.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="space-y-1 mb-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-2xl font-black text-gray-900 group-hover:text-purple-600 transition-colors uppercase tracking-tight truncate mr-2">{fn.name}</h3>
                                        <button
                                            onClick={() => setDeleteModal({ open: true, name: fn.name })}
                                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="h-1.5 w-1.5 bg-gray-300 rounded-full"></div>
                                        <p className="text-sm text-gray-500 font-bold font-mono">Runtime: {fn.runtime}</p>
                                    </div>
                                </div>

                                <div className="mt-8 bg-gray-50 rounded-2xl p-4 border border-gray-100/50 space-y-3">
                                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-gray-400">
                                        <span>Auto-Schedule</span>
                                        <Clock className="h-3 w-3" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-600">Daily at 4 AM</span>
                                        <div className="h-5 w-10 bg-purple-600 rounded-full relative">
                                            <div className="absolute right-1 top-1 h-3 w-3 bg-white rounded-full"></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex items-center gap-3 pt-6 border-t border-gray-50">
                                    <button className="flex-1 inline-flex items-center justify-center space-x-3 py-3 px-4 bg-purple-600 text-white rounded-2xl text-sm font-black hover:bg-purple-700 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-purple-500/20 active:shadow-none uppercase tracking-wider">
                                        <Play className="h-4 w-4 fill-white" />
                                        <span>Execute</span>
                                    </button>
                                    <button className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-purple-50 hover:text-purple-600 transition-all border border-transparent hover:border-purple-100">
                                        <ExternalLink className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
