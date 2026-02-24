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

export default function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: projectId } = use(params);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const data = await api.get(`/console/projects/${projectId}/analytics`);
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch analytics", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [projectId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const chartData = {
        labels: stats?.firestore?.history?.map((h: any) => new Date(h.date).toLocaleDateString('en-US', { weekday: 'short' })) || [],
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
        plugins: {
            legend: {
                position: 'top' as const,
                labels: { font: { family: 'inherit' } }
            },
        },
        scales: {
            y: { beginAtZero: true, grid: { display: false } },
            x: { grid: { display: false } }
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Project Dashboard</h1>
                    <p className="text-gray-500 mt-1">Real-time performance metrics for your application.</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-500" />
                    System Live
                </div>
            </header>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    label="Total Users"
                    value={stats?.auth?.total_users || 0}
                    icon={Users}
                    color="blue"
                    trend="+12% from last week"
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
                        Firestore Activity (Last 7 Days)
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
