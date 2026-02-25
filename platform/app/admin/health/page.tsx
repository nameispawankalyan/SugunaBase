'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/utils/api';
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

export default function GlobalHealthPage() {
    const [statuses, setStatuses] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    const checkHealth = async () => {
        setLoading(true);
        try {
            const results = await api.get('/cluster-health');
            setStatuses(results);
        } catch (e) {
            console.error("Health Check Failed:", e);
        }
        setLoading(false);
    };

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
                console.error("Auth check failed:", e);
                window.location.href = '/login';
            }
        };
        checkAuth();
    }, []);

    useEffect(() => {
        if (!authorized) return;
        checkHealth();
        const interval = setInterval(checkHealth, 30000); // Auto refresh every 30s
        return () => clearInterval(interval);
    }, [authorized]);

    if (!authorized) return (
        <div className="h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-orange-600/10 rounded-2xl border border-orange-600/20 shadow-lg shadow-orange-600/10">
                        <Activity className="h-8 w-8 text-orange-600" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">System Status</h1>
                        <p className="text-gray-500 font-medium">Global infrastructure health monitor</p>
                    </div>
                </div>
                <button
                    onClick={checkHealth}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-sm font-bold text-gray-700 shadow-sm transition-all disabled:opacity-50"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Status
                </button>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <StatCard
                    label="All Systems"
                    value={Object.values(statuses).every((s: any) => s.status === 'UP') ? 'Operational' : 'Degraded'}
                    status={Object.values(statuses).every((s: any) => s.status === 'UP') ? 'up' : 'down'}
                    icon={ShieldCheck}
                />
                <StatCard
                    label="Active Services"
                    value={`${Object.values(statuses).filter((s: any) => s.status === 'UP').length} / ${SERVICES.length}`}
                    status="neutral"
                    icon={Cpu}
                />
                <StatCard
                    label="Region"
                    value="Asia South 1"
                    status="neutral"
                    icon={Globe}
                />
            </div>

            {/* Service Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {SERVICES.map((service) => {
                    const status = statuses[service.id] || { status: 'LOADING' };
                    const isUp = status.status === 'UP';
                    const isDown = status.status === 'DOWN';

                    return (
                        <div key={service.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`p-3 rounded-xl bg-gray-50 text-${service.color}-600 group-hover:scale-110 transition-transform`}>
                                        <service.icon className="h-6 w-6" />
                                    </div>
                                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isUp ? 'bg-emerald-50 text-emerald-600' :
                                        isDown ? 'bg-rose-50 text-rose-600' : 'bg-gray-50 text-gray-400'
                                        }`}>
                                        {isUp ? <CheckCircle2 className="h-3 w-3" /> : isDown ? <XCircle className="h-3 w-3" /> : <RefreshCw className="h-3 w-3 animate-spin" />}
                                        {status.status}
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-gray-900 mb-1">{service.name}</h3>
                                <div className="flex items-center gap-2 text-xs font-mono text-gray-400 mb-6">
                                    <code className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">Port {service.port}</code>
                                    <span>•</span>
                                    <span>PID: {status.pid || '---'}</span>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-gray-50">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Response Latency</span>
                                        <span className={status.latency < 50 ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}>
                                            {status.latency ? `${status.latency}ms` : '---'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Memory Usage</span>
                                        <span className="text-gray-700 font-medium">{status.memory || '---'} MB</span>
                                    </div>
                                </div>
                            </div>

                            <div className={`h-1.5 w-full ${isUp ? 'bg-emerald-500' : isDown ? 'bg-rose-500' : 'bg-gray-100'}`}></div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function StatCard({ label, value, status, icon: Icon }: any) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${status === 'up' ? 'bg-emerald-50 text-emerald-600' :
                    status === 'down' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                    <Icon className="h-6 w-6" />
                </div>
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
                    <p className="text-xl font-black text-gray-900">{value}</p>
                </div>
            </div>
        </div>
    );
}
