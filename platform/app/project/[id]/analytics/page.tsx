'use client';

import { use, useState, useEffect } from 'react';
import { api } from '@/utils/api';
import {
    Users,
    Database,
    HardDrive,
    TrendingUp,
    Activity,
    MousePointer2,
    Video,
    Zap,
    FileCode
} from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const rangeLabels: any = {
    'today': 'Today',
    'yesterday': 'Yesterday',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    'current_month': 'Current Month',
    'last_month': 'Last Month',
    'custom': 'Custom Range'
};

export default function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: projectId } = use(params);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState('7d');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [selectedMetric, setSelectedMetric] = useState('firestore'); // 'firestore', 'auth', 'storage', 'cast', 'functions'

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            let url = `/console/projects/${projectId}/analytics?range=${range}`;
            if (range === 'custom') {
                url += `&startDate=${customStart}&endDate=${customEnd}`;
            }
            const data = await api.get(url);
            setStats(data);
        } catch (error) {
            console.error("Failed to fetch analytics", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (range !== 'custom') {
            fetchAnalytics();
        }
    }, [projectId, range]);

    const chartData = {
        labels: stats?.firestore?.history?.map((h: any) => {
            const date = new Date(h.date);
            return (range === 'today' || range === 'yesterday')
                ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }) || [],
        datasets: getDatasets(),
    };

    function getDatasets() {
        if (!stats?.firestore?.history) return [];

        const history = stats.firestore.history;

        switch (selectedMetric) {
            case 'firestore':
                return [
                    {
                        label: 'Reads',
                        data: history.map((h: any) => h.firestore_reads),
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        fill: true,
                        tension: 0.4,
                    },
                    {
                        label: 'Writes',
                        data: history.map((h: any) => h.firestore_writes),
                        borderColor: '#ec4899',
                        backgroundColor: 'rgba(236, 72, 153, 0.1)',
                        fill: true,
                        tension: 0.4,
                    }
                ];
            case 'auth':
                return [{
                    label: 'New Users',
                    data: history.map((h: any) => h.new_users || 0), // Future enhancement
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4,
                }];
            case 'storage':
                return [{
                    label: 'Files Uploaded',
                    data: history.map((h: any) => h.files_count || 0), // Future enhancement
                    borderColor: '#f472b6',
                    backgroundColor: 'rgba(244, 114, 182, 0.1)',
                    fill: true,
                    tension: 0.4,
                }];
            case 'cast':
                return [
                    {
                        label: 'Audio Call',
                        data: history.map((h: any) => h.cast_audio_call_mins || 0),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4,
                    },
                    {
                        label: 'Video Call',
                        data: history.map((h: any) => h.cast_video_call_mins || 0),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.4,
                    },
                    {
                        label: 'Audio Live',
                        data: history.map((h: any) => h.cast_audio_live_mins || 0),
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        fill: true,
                        tension: 0.4,
                    },
                    {
                        label: 'Video Live',
                        data: history.map((h: any) => h.cast_video_live_mins || 0),
                        borderColor: '#f43f5e',
                        backgroundColor: 'rgba(244, 63, 94, 0.1)',
                        fill: true,
                        tension: 0.4,
                    }
                ];
            case 'functions':
                return [{
                    label: 'Executions',
                    data: history.map((h: any) => h.function_executions || 0),
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    fill: true,
                    tension: 0.4,
                }];
            default:
                return [];
        }
    }

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: { font: { family: 'inherit', size: 12 }, color: '#64748b' }
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                padding: 12,
                titleFont: { size: 14, weight: 'bold' as const },
                bodyFont: { size: 13 },
                displayColors: true
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(0,0,0,0.05)' },
                ticks: { color: '#94a3b8' }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#94a3b8' }
            }
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Project Dashboard</h1>
                    <p className="text-gray-500 mt-1">Real-time performance metrics for your application.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <select
                            value={range}
                            onChange={(e) => setRange(e.target.value)}
                            className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-semibold text-gray-700 shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                        >
                            <option value="today">Today</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                            <option value="90d">Last 90 Days</option>
                            <option value="current_month">Current Month</option>
                            <option value="last_month">Last Month</option>
                            <option value="custom">Custom Range</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                    </div>

                    {range === 'custom' && (
                        <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-300">
                            <input
                                type="date"
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
                            />
                            <span className="text-gray-400">to</span>
                            <input
                                type="date"
                                value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
                            />
                            <button
                                onClick={fetchAnalytics}
                                className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition shadow-sm"
                            >
                                Apply
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[500px] bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                    <p className="text-gray-400 animate-pulse">Calculating metrics...</p>
                </div>
            ) : (
                <>
                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        <StatCard
                            label="Auth Users"
                            value={stats?.auth?.total_users || 0}
                            icon={Users}
                            color="blue"
                            trend={stats?.auth?.trend}
                            active={selectedMetric === 'auth'}
                            onClick={() => setSelectedMetric('auth')}
                        />
                        <StatCard
                            label="Firestore"
                            value={stats?.firestore?.total || 0}
                            icon={Database}
                            color="indigo"
                            trend="Total Ops"
                            active={selectedMetric === 'firestore'}
                            onClick={() => setSelectedMetric('firestore')}
                        />
                        <StatCard
                            label="Storage"
                            value={formatBytes(stats?.storage?.total_bytes || 0)}
                            icon={HardDrive}
                            color="pink"
                            trend={`${stats?.storage?.total_files || 0} files`}
                            active={selectedMetric === 'storage'}
                            onClick={() => setSelectedMetric('storage')}
                        />
                        <StatCard
                            label="Suguna Cast"
                            value={`${stats?.cast?.total || 0} min`}
                            icon={Video}
                            color="emerald"
                            trend="Usage Time"
                            active={selectedMetric === 'cast'}
                            onClick={() => setSelectedMetric('cast')}
                        />
                        <StatCard
                            label="Functions"
                            value={stats?.functions?.total || 0}
                            icon={Zap}
                            color="amber"
                            trend="Executions"
                            active={selectedMetric === 'functions'}
                            onClick={() => setSelectedMetric('functions')}
                        />
                    </div>

                    {/* Main Chart */}
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 capitalize">
                                <Activity className="h-5 w-5 text-primary" />
                                {selectedMetric} Usage ({rangeLabels[range]})
                            </h2>
                        </div>
                        <div className="h-[350px]">
                            <Line data={chartData} options={chartOptions} />
                        </div>
                    </div>

                    {/* Quick Insight & Actions */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <MousePointer2 className="h-4 w-4" />
                                Usage Insights
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Peak Time</p>
                                    <p className="text-lg font-bold text-gray-800">8:00 PM - 10:00 PM</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Top Region</p>
                                    <p className="text-lg font-bold text-gray-800">Asia South (Mumbai)</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-center">
                            <div className="relative z-10">
                                <h3 className="text-xl font-bold mb-2">Billing Beta</h3>
                                <p className="text-indigo-100 text-xs mb-4 leading-relaxed">
                                    Track your costs in real-time. Upgrade to enable automatic billing.
                                </p>
                                <button className="w-full bg-white text-indigo-700 py-2 rounded-xl font-bold text-sm hover:bg-indigo-50 transition shadow-md">
                                    View Billing
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color, trend, active, onClick }: any) {
    const colors: any = {
        blue: 'bg-blue-50 text-blue-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        pink: 'bg-pink-50 text-pink-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
    };

    const activeBorders: any = {
        blue: 'border-blue-200 bg-blue-50/30',
        indigo: 'border-indigo-200 bg-indigo-50/30',
        pink: 'border-pink-200 bg-pink-50/30',
        emerald: 'border-emerald-200 bg-emerald-50/30',
        amber: 'border-amber-200 bg-amber-50/30',
    };

    return (
        <div
            onClick={onClick}
            className={`p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${active ? activeBorders[color] + ' shadow-sm scale-[1.02]' : 'bg-white border-gray-100'}`}
        >
            <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${colors[color]}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider truncate">{label}</div>
            </div>
            <div className="text-2xl font-black text-gray-900 mb-1 truncate">{value}</div>
            <div className="text-[10px] font-bold text-gray-500">{trend}</div>
        </div>
    );
}

function InsightRow({ label, value, color = 'gray' }: any) {
    const valColor = color === 'green' ? 'text-green-600' : 'text-gray-900';
    return (
        <div className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
            <span className="text-sm text-gray-500">{label}</span>
            <span className={`text-sm font-bold ${valColor}`}>{value}</span>
        </div>
    );
}

function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
