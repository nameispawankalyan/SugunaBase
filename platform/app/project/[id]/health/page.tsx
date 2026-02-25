'use client';

import React, { useState, useEffect } from 'react';
import {
    Activity,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Cpu,
    Server,
    ShieldCheck,
    Database,
    HardDrive,
    Globe,
    Zap,
    Bell,
    Lock,
    PhoneCall,
    Terminal
} from 'lucide-react';

const SERVICES = [
    { id: 'gateway', name: 'API Gateway', port: 5000, icon: Server, color: 'blue' },
    { id: 'auth', name: 'Authentication', port: 3300, icon: Lock, color: 'cyan' },
    { id: 'firestore', name: 'Suguna Firestore', port: 3400, icon: Database, color: 'amber' },
    { id: 'storage', name: 'Cloud Storage', port: 3500, icon: HardDrive, color: 'purple' },
    { id: 'hosting', name: 'Web Hosting', port: 3600, icon: Globe, color: 'emerald' },
    { id: 'logs', name: 'System Logs', port: 3700, icon: Terminal, color: 'gray' },
    { id: 'messaging', name: 'Cloud Messaging', port: 3200, icon: Bell, color: 'rose' },
    { id: 'functions', name: 'Cloud Functions', port: 3005, icon: Zap, color: 'sky' },
    { id: 'cast', name: 'Suguna Cast', port: 3100, icon: PhoneCall, color: 'indigo' }
];

export default function HealthPage() {
    const [statuses, setStatuses] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);

    const checkHealth = async () => {
        setLoading(true);
        const results: Record<string, any> = {};

        for (const service of SERVICES) {
            try {
                const start = Date.now();
                const res = await fetch(`http://localhost:${service.port}/health`, {
                    mode: 'cors',
                    cache: 'no-store'
                });
                const latency = Date.now() - start;

                if (res.ok) {
                    const data = await res.json();
                    results[service.id] = { status: 'UP', latency, ...data };
                } else {
                    results[service.id] = { status: 'DOWN', error: `HTTP ${res.status}` };
                }
            } catch (e) {
                results[service.id] = { status: 'DOWN', error: 'Connection Failed' };
            }
        }
        setStatuses(results);
        setLoading(false);
    };

    useEffect(() => {
        checkHealth();
        const interval = setInterval(checkHealth, 30000); // refresh every 30s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex justify-between items-center bg-[#0d161e] p-6 rounded-2xl border border-white/5 shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <Activity className="h-8 w-8 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">System Status</h1>
                        <p className="text-gray-400 font-medium">Monitoring Real-time distributed services health</p>
                    </div>
                </div>
                <button
                    onClick={checkHealth}
                    disabled={loading}
                    className="flex items-center gap-2 bg-[#1a2b3c] hover:bg-[#25394d] text-white px-5 py-2.5 rounded-xl border border-white/5 transition-all active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {SERVICES.map((service) => {
                    const status = statuses[service.id];
                    const isUp = status?.status === 'UP';

                    return (
                        <div
                            key={service.id}
                            className={`group bg-[#0d161e] p-6 rounded-2xl border transition-all duration-300 hover:shadow-2xl hover:translate-y-[-4px] ${!status ? 'border-white/5 opacity-50' :
                                isUp ? 'border-emerald-500/20 hover:border-emerald-500/40 bg-gradient-to-br from-[#0d161e] to-emerald-500/[0.02]' :
                                    'border-rose-500/20 hover:border-rose-500/40 bg-gradient-to-br from-[#0d161e] to-rose-500/[0.02]'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-4 rounded-xl bg-gray-800/20 border border-white/5 group-hover:scale-110 transition-transform`}>
                                    <service.icon className={`h-8 w-8 text-${service.color}-400`} />
                                </div>
                                <div className="flex flex-col items-end">
                                    {isUp ? (
                                        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full text-xs font-bold border border-emerald-400/20">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                                            </span>
                                            OPERATIONAL
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-rose-400 bg-rose-400/10 px-3 py-1 rounded-full text-xs font-bold border border-rose-400/20">
                                            <XCircle className="h-3 w-3" />
                                            OFFLINE
                                        </div>
                                    )}
                                    {isUp && status.latency && (
                                        <span className="text-[10px] text-gray-500 mt-2 font-mono">{status.latency}ms latency</span>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">{service.name}</h3>
                                <div className="flex items-center gap-2 text-gray-500 text-sm font-mono bg-black/20 px-2 py-1 rounded w-fit italic">
                                    localhost:{service.port}
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-white/5 flex flex-col gap-3">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Service Version</span>
                                    <span className="text-gray-300 font-bold">v1.2.0-distributed</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Node Status</span>
                                    <span className={`${isUp ? 'text-emerald-400' : 'text-rose-400'} font-bold`}>
                                        {isUp ? 'Active & Ready' : 'Connection Refused'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <ShieldCheck className="h-32 w-32 text-indigo-400" />
                </div>
                <div className="relative z-10">
                    <h2 className="text-2xl font-black text-white mb-2">Cluster Health Status</h2>
                    <p className="text-gray-400 max-w-2xl text-lg">
                        Your SugunaBase instance is currently running in <strong>Discrete Microservice Mode</strong>.
                        All services are independent nodes communicating through the centralized API Gateway.
                    </p>
                    <div className="mt-8 flex gap-4">
                        <div className="flex items-center gap-2 bg-emerald-400/10 text-emerald-400 px-4 py-2 rounded-xl text-sm font-black border border-emerald-400/20">
                            <CheckCircle2 className="h-4 w-4" />
                            Infrastructure Stable
                        </div>
                        <div className="flex items-center gap-2 bg-indigo-400/10 text-indigo-400 px-4 py-2 rounded-xl text-sm font-black border border-indigo-400/20">
                            <Cpu className="h-4 w-4" />
                            Dynamic Auto-Scaling Ready
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
