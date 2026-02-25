'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import {
    Users,
    Search,
    MoreVertical,
    Shield,
    User,
    Ban,
    CheckCircle,
    Mail,
    Briefcase,
    Calendar,
    ChevronRight,
    ExternalLink
} from 'lucide-react';

interface AdminUser {
    id: string;
    email: string;
    name: string;
    role: string;
    is_active: boolean;
    created_at: string;
    developer_id: string;
    project_count: number;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [authorized, setAuthorized] = useState(false);
    const [mounted, setMounted] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await api.get('/admin/users');
            setUsers(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Failed to fetch admin users:", e);
        }
        setLoading(false);
    };

    const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
        try {
            await api.put(`/admin/users/${userId}/status`, { is_active: !currentStatus });
            setUsers(users.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
        } catch (e) {
            alert("Failed to update user status");
        }
    };

    useEffect(() => {
        setMounted(true);
        const checkAuth = async () => {
            try {
                const user = await api.get('/me');
                if (user.role !== 'admin') {
                    window.location.href = '/console';
                    return;
                }
                setAuthorized(true);
                fetchUsers();
            } catch (e) {
                console.error("Auth check failed:", e);
                window.location.href = '/login';
            }
        };
        checkAuth();
    }, []);

    if (!mounted || !authorized) return (
        <div className="h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.developer_id.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header Area */}
            <div className="flex justify-between items-end bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm shadow-gray-200/50">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20">
                            <Shield className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-[0.3em] text-blue-600/60">System Administration</span>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">User Management</h1>
                    <p className="text-gray-500 mt-2 font-medium">Monitoring and controlling {users.length} registered developers</p>
                </div>

                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search developers..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-gray-50 border-none ring-1 ring-gray-200 rounded-2xl pl-12 pr-6 py-4 text-sm focus:ring-2 focus:ring-blue-600 w-[400px] transition-all"
                    />
                </div>
            </div>

            {/* Users Table / Grid */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Developer</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Identity</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Deployment</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Joined</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={5} className="px-8 py-10 h-24 bg-gray-50/30"></td>
                                </tr>
                            ))
                        ) : filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-blue-50/30 transition-colors group">
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-lg transition-transform group-hover:scale-110 shadow-sm ${user.is_active ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                            {user.name?.[0] || 'U'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-gray-900">{user.name || 'Anonymous Developer'}</p>
                                                {!user.is_active && <Ban className="h-3 w-3 text-rose-500" />}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                                                <Mail className="h-3.3 w-3.3" />
                                                {user.email}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-tighter shadow-sm border border-blue-200">
                                                {user.role || 'Developer'}
                                            </span>
                                            {user.is_active ? (
                                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-tighter border border-emerald-200">Active</span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-tighter border border-rose-200">Banned</span>
                                            )}
                                        </div>
                                        <code className="text-[10px] font-mono text-gray-400">{user.developer_id}</code>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-2 text-gray-700">
                                        <Briefcase className="h-4 w-4 text-gray-400" />
                                        <span className="font-bold">{user.project_count}</span>
                                        <span className="text-xs text-gray-500 font-medium">Projects</span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </div>
                                        <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-black">Registration Date</span>
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => toggleUserStatus(user.id, user.is_active)}
                                            className={`p-3 rounded-2xl transition-all border ${user.is_active ? 'hover:bg-rose-50 border-gray-100 hover:border-rose-200 text-gray-400 hover:text-rose-500' : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100'}`}
                                            title={user.is_active ? "Suspend User" : "Activate User"}
                                        >
                                            {user.is_active ? <Ban className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                                        </button>
                                        <button className="p-3 bg-gray-50 border border-gray-200 rounded-2xl text-gray-400 hover:bg-white hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all">
                                            <ExternalLink className="h-5 w-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {!loading && filteredUsers.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50">
                        <Users className="h-16 w-16 text-gray-200 mb-4" />
                        <h3 className="font-bold text-gray-900 text-lg">No Results Found</h3>
                        <p className="text-gray-500 text-sm">No developers match your current search query.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
