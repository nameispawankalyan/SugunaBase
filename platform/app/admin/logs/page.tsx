'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '@/utils/api';
import {
    FileText,
    Terminal,
    Trash2,
    Pause,
    Play,
    Search,
    Shield
} from 'lucide-react';

interface Log {
    id: number;
    project_id: string;
    service_name: string;
    level: string;
    message: string;
    created_at: string;
}

export default function GlobalLogsPage() {
    const [logs, setLogs] = useState<Log[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [authorized, setAuthorized] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const user = await api.get('/me');
                if (user.role !== 'admin') {
                    window.location.href = '/console';
                    return;
                }
                setAuthorized(true);
            } catch (e) {
                window.location.href = '/login';
            }
        };
        checkAuth();

        // 1. Fetch global history
        api.get('/logs/history/all/stream')
            .then(data => setLogs(data.reverse()))
            .catch(err => console.error("Global history fetch failed:", err));

        // 2. Setup Real-time connection
        const socket = io('https://api.suguna.co', {
            path: '/v1/logs/socket.io',
            transports: ['websocket']
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to global logs stream');
            socket.emit('subscribe', 'admin_global');
        });

        socket.on('new_log', (log: Log) => {
            setLogs(prev => {
                if (isPaused) return prev;
                return [...prev, log].slice(-1000); // Keep last 1000 for admins
            });
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    if (!authorized) return null;

    useEffect(() => {
        if (!isPaused && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, isPaused]);

    const filteredLogs = logs.filter(log => {
        const matchesFilter = filter === 'all' || log.service_name.toLowerCase().includes(filter.toLowerCase());
        const matchesSearch =
            log.message.toLowerCase().includes(search.toLowerCase()) ||
            log.project_id.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getLevelColor = (level: string) => {
        switch (level.toLowerCase()) {
            case 'error': return 'text-rose-400 font-bold';
            case 'warn': return 'text-amber-400 font-bold';
            default: return 'text-emerald-400';
        }
    };

    return (
        <div className="h-screen flex flex-col p-6 bg-[#030708]">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 bg-gray-900/40 p-5 rounded-3xl border border-white/5 backdrop-blur-md">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-orange-600/10 rounded-2xl border border-orange-600/20 shadow-lg shadow-orange-600/5">
                        <Shield className="h-7 w-7 text-orange-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                            Cluster Control Logs
                            <span className="px-2 py-0.5 rounded bg-orange-600/20 text-orange-500 text-[10px] uppercase font-black border border-orange-600/30">Super Admin</span>
                        </h1>
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-widest mt-1">Global monitoring across all projects</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-orange-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by message or project ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-2xl pl-12 pr-5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 w-80 transition-all font-medium"
                        />
                    </div>
                    <div className="h-8 w-[1px] bg-white/10 mx-2"></div>
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border transition-all font-bold text-xs uppercase tracking-widest ${isPaused ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                    >
                        {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                        {isPaused ? 'Resume' : 'Pause'}
                    </button>
                    <button
                        onClick={() => setLogs([])}
                        className="p-3 bg-white/5 border border-white/5 rounded-2xl text-gray-500 hover:text-rose-400 hover:bg-rose-500/5 transition-all"
                    >
                        <Trash2 className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Terminal Layout */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0b] rounded-[40px] border border-white/5 overflow-hidden shadow-2xl relative">
                <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-10"></div>

                {/* Terminal Header */}
                <div className="bg-white/[0.02] px-8 py-4 border-b border-white/5 flex items-center justify-between backdrop-blur-sm">
                    <div className="flex items-center gap-6">
                        <div className="flex gap-2">
                            <div className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-lg shadow-rose-500/20"></div>
                            <div className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-lg shadow-amber-500/20"></div>
                            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/20"></div>
                        </div>
                        <div className="h-4 w-px bg-white/10"></div>
                        <span className="text-[11px] font-mono font-bold text-orange-500/70 uppercase tracking-[0.2em]">root@sugunabase-cluster:~</span>
                    </div>
                    <div className="flex items-center gap-6 font-mono">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] text-gray-600 font-black uppercase">Service</span>
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="bg-transparent text-xs text-white font-bold focus:outline-none cursor-pointer hover:text-orange-400 transition-colors"
                            >
                                <option value="all">ALL_SERVICES</option>
                                <option value="gateway">GATEWAY</option>
                                <option value="auth">AUTH</option>
                                <option value="firestore">FIRESTORE</option>
                                <option value="messaging">MESSAGING</option>
                                <option value="storage">STORAGE</option>
                            </select>
                        </div>
                        <div className="h-4 w-px bg-white/10"></div>
                        <span className="text-[11px] text-gray-500 font-bold">{filteredLogs.length} LOGS FETCHED</span>
                    </div>
                </div>

                {/* Log Stream Area */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-10 font-mono text-[13px] leading-relaxed scrollbar-thin scrollbar-thumb-white/10"
                >
                    {filteredLogs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-10 animate-pulse">
                            <Terminal className="h-24 w-24 mb-6" />
                            <p className="text-xl font-black uppercase tracking-widest text-white">Initializing Stream...</p>
                        </div>
                    ) : (
                        <div className="space-y-1.5 pb-20">
                            {filteredLogs.map((log) => (
                                <div key={log.id} className="flex gap-6 py-2 border-b border-white/[0.02] hover:bg-white/[0.03] transition-all group">
                                    <span className="text-gray-600 whitespace-nowrap min-w-[120px] font-bold">
                                        {new Date(log.created_at).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                    <span className="text-orange-900/60 font-black min-w-[140px] truncate uppercase text-[11px] tracking-tighter">
                                        ID: {log.project_id}
                                    </span>
                                    <span className={`min-w-[80px] text-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter bg-white/5 ${getLevelColor(log.level)}`}>
                                        {log.level}
                                    </span>
                                    <span className="text-white/40 font-bold min-w-[110px] uppercase text-[11px]">
                                        {log.service_name}
                                    </span>
                                    <div className="h-4 w-[1px] bg-white/5"></div>
                                    <span className="text-gray-400 group-hover:text-white transition-all flex-1">
                                        {log.message}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
