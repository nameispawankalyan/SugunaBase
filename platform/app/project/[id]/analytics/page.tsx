'use client';

import { use, useState, useEffect } from 'react';
import { api } from '@/utils/api';
import {
    Users,
    Database,
    HardDrive,
    TrendingUp,
    Activity,
    MousePointer2
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
        datasets: [
            {
                label: 'Reads',
                data: stats?.firestore?.history?.map((h: any) => h.firestore_reads) || [],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4,
            },
            {
                label: 'Writes',
                data: stats?.firestore?.history?.map((h: any) => h.firestore_writes) || [],
                borderColor: '#ec4899',
                backgroundColor: 'rgba(236, 72, 153, 0.1)',
                fill: true,
                tension: 0.4,
            }
        ],
    };

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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            label="Total Users"
                            value={stats?.auth?.total_users || 0}
                            icon={Users}
                            color="blue"
                            trend={stats?.auth?.trend}
                        />
                        <StatCard
                            label="Firestore Usage"
                            value={((stats?.firestore?.history?.reduce((a: any, b: any) => a + b.firestore_reads + b.firestore_writes, 0)) || 0).toLocaleString()}
                            icon={Database}
                            color="indigo"
                            trend="Active operations"
                        />
                        <StatCard
                            label="Storage (Bytes)"
                            value={formatBytes(stats?.storage?.total_bytes || 0)}
                            icon={HardDrive}
                            color="pink"
                            trend={`${stats?.storage?.total_files || 0} total files`}
                        />
                        <StatCard
                            label="Avg. Latency"
                            value="42ms"
                            icon={Activity}
                            color="orange"
                            trend="Optimization: Good"
                        />
                    </div>

                    {/* Main Chart */}
                    <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-primary" />
                                Firestore Activity ({rangeLabels[range]})
                            </h2>
                            <div className="flex gap-2">
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                                    <span className="h-2 w-2 rounded-full bg-indigo-500"></span> Reads
                                </span>
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                                    <span className="h-2 w-2 rounded-full bg-pink-500"></span> Writes
                                </span>
                            </div>
                        </div>
                        <div className="h-[350px]">
                            <Line data={chartData} options={chartOptions} />
                        </div>
                    </div>

                    {/* Bottom Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <MousePointer2 className="h-4 w-4" />
                                Quick Insights
                            </h3>
                            <div className="space-y-4">
                                <InsightRow label="Peak Activity" value="Friday, 8:00 PM" />
                                <InsightRow label="Most Read Collection" value="users_profile" />
                                <InsightRow label="Storage Growth" value="+420 MB / week" />
                                <InsightRow label="Error Rate" value="0.02%" color="green" />
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                            <div className="relative z-10">
                                <h3 className="text-xl font-bold mb-2">Upgrade to Pro</h3>
                                <p className="text-indigo-100 text-sm mb-6 leading-relaxed">
                                    Unlock advanced analytics, real-time monitoring, and automatic backups for your project.
                                </p>
                                <button className="bg-white text-indigo-700 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-50 transition shadow-md">
                                    Get Started
                                </button>
                            </div>
                            {/* Decorative Circles */}
                            <div className="absolute -top-10 -right-10 h-40 w-40 bg-white/10 rounded-full blur-3xl"></div>
                            <div className="absolute -bottom-10 -left-10 h-40 w-40 bg-white/5 rounded-full blur-2xl"></div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color, trend }: any) {
    const colors: any = {
        blue: 'bg-blue-50 text-blue-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        pink: 'bg-pink-50 text-pink-600',
        orange: 'bg-orange-50 text-orange-600',
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 rounded-xl ${colors[color]}`}>
                    <Icon className="h-6 w-6" />
                </div>
                <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
            </div>
            <div className="text-3xl font-extrabold text-gray-900 mb-1">{value}</div>
            <div className="text-xs font-medium text-gray-400">{trend}</div>
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
