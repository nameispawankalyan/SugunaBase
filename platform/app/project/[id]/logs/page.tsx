'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { api } from '@/utils/api';
import {
    FileText,
    Terminal,
    Trash2,
    Download,
    Pause,
    Play,
    Clock,
    Filter,
    Search,
    ChevronRight
} from 'lucide-react';

interface Log {
    id: number;
    service_name: string;
    level: string;
    message: string;
    created_at: string;
}

export default function LogsPage() {
    const { id: projectId } = useParams();
    const [logs, setLogs] = useState<Log[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const socketRef = useRef<Socket | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // 1. Fetch initial history via Gateway
        api.get(`/logs/history/${projectId}`)
            .then(data => setLogs(data.reverse()))
            .catch(err => console.error("History fetch failed:", err));

        // 2. Setup Real-time connection via Gateway Proxy
        // Note: The Gateway proxies /v1/logs to the log service on port 3700
        const socket = io('https://api.suguna.co', {
            path: '/v1/logs/socket.io',
            transports: ['websocket']
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to logs stream');
            socket.emit('subscribe', projectId);
        });

        socket.on('new_log', (log: Log) => {
            if (!isPaused) {
                setLogs(prev => [...prev, log].slice(-500)); // Keep only last 500
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [projectId, isPaused]);

    useEffect(() => {
        if (!isPaused && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, isPaused]);

    const filteredLogs = logs.filter(log => {
        const matchesFilter = filter === 'all' || log.service_name.toLowerCase().includes(filter.toLowerCase());
        const matchesSearch = log.message.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getLevelColor = (level: string) => {
        switch (level.toLowerCase()) {
            case 'error': return 'text-rose-400';
            case 'warn': return 'text-amber-400';
            case 'debug': return 'text-sky-400';
            default: return 'text-emerald-400';
        }
    };

    return (
        <div className="h-screen flex flex-col p-6 bg-[#030708]">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 bg-gray-900/50 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <Terminal className="h-6 w-6 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white">System Logs</h1>
                        <p className="text-gray-500 text-sm">Real-time stream from all microservices</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-[#0d161e] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 w-64"
                        />
                    </div>
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border border-white/5 transition-all ${isPaused ? 'bg-amber-500/10 text-amber-500' : 'bg-gray-800/50 text-gray-400'}`}
                    >
                        {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                        {isPaused ? 'Resume' : 'Pause'}
                    </button>
                    <button
                        onClick={() => setLogs([])}
                        className="p-2 text-gray-500 hover:text-rose-400 transition-colors"
                    >
                        <Trash2 className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Main Terminal Area */}
            <div className="flex-1 flex flex-col min-h-0 bg-black rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                {/* Terminal Header */}
                <div className="bg-gray-900/80 px-6 py-3 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-rose-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-amber-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-emerald-500/50"></div>
                        </div>
                        <span className="ml-4 text-xs font-mono text-gray-500 uppercase tracking-widest">sugunabase@cloud:~/logs</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="bg-transparent text-xs text-indigo-400 font-bold focus:outline-none cursor-pointer"
                        >
                            <option value="all">ALL SERVICES</option>
                            <option value="gateway">GATEWAY</option>
                            <option value="auth">AUTH</option>
                            <option value="firestore">FIRESTORE</option>
                            <option value="messaging">MESSAGING</option>
                            <option value="hosting">HOSTING</option>
                        </select>
                        <div className="h-4 w-[1px] bg-white/10"></div>
                        <span className="text-xs text-gray-600 font-mono">{filteredLogs.length} entries</span>
                    </div>
                </div>

                {/* Console Content */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-6 font-mono text-[13px] leading-relaxed scrollbar-thin scrollbar-thumb-white/10"
                >
                    {filteredLogs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-20">
                            <Terminal className="h-16 w-16 mb-4" />
                            <p>Waiting for logs to arrive...</p>
                        </div>
                    ) : (
                        filteredLogs.map((log) => (
                            <div key={log.id} className="flex gap-4 py-1 hover:bg-white/[0.02] transition-colors group">
                                <span className="text-gray-700 whitespace-nowrap min-w-[160px]">
                                    [{new Date(log.created_at).toLocaleTimeString()}]
                                </span>
                                <span className={`font-black uppercase min-w-[100px] text-center px-2 py-0.5 rounded text-[10px] bg-white/5 ${getLevelColor(log.level)}`}>
                                    {log.level}
                                </span>
                                <span className="text-indigo-400/80 font-bold min-w-[120px]">
                                    {log.service_name}
                                </span>
                                <span className="text-gray-300 group-hover:text-white transition-colors">
                                    {log.message}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
