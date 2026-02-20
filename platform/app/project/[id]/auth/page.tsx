'use client';

import { use, useState, useEffect } from 'react';
import { Search, Plus, RefreshCw, Phone, Mail, Shield, User } from 'lucide-react';
import { api } from '@/utils/api';

export default function AuthPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await api.get(`/projects/${id}/users`);
            if (data.users) {
                setUsers(data.users);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchUsers();
        }
    }, [id]);

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    };

    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="space-y-6">

            {/* Auth Header */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Authentication</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-500">Project ID:</span>
                            <code className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-700 font-mono">{id}</code>
                        </div>
                    </div>
                </div>

                <div className="flex gap-8 mt-8 border-b border-gray-100">
                    <div className="border-b-2 border-blue-600 text-blue-600 pb-3 text-sm font-medium cursor-pointer">Users</div>
                    <div className="text-gray-500 hover:text-gray-800 pb-3 text-sm font-medium cursor-pointer transition-colors">Sign-in method</div>
                    <div className="text-gray-500 hover:text-gray-800 pb-3 text-sm font-medium cursor-pointer transition-colors">Templates</div>
                    <div className="text-gray-500 hover:text-gray-800 pb-3 text-sm font-medium cursor-pointer transition-colors">Usage</div>
                    <div className="text-gray-500 hover:text-gray-800 pb-3 text-sm font-medium cursor-pointer transition-colors">Settings</div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center bg-white p-4 rounded-t-lg border border-gray-200 border-b-0 shadow-sm mt-6">
                <div className="relative w-96 group">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by email, phone, or UID"
                        className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                </div>
                <div className="flex gap-3">
                    <button onClick={fetchUsers} className="p-2 text-gray-600 hover:bg-gray-50 hover:text-blue-600 rounded-md border border-gray-300 transition-all" title="Refresh Users">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors">
                        <Plus className="h-4 w-4" />
                        Add user
                    </button>
                </div>
            </div>

            {/* Users Table */}
            <div className="border border-gray-200 bg-white rounded-b-lg shadow-sm overflow-hidden min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                        <span className="text-sm">Loading users...</span>
                    </div>
                ) : users.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/3">Identifier</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Providers</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Signed In</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">User UID</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {user.profile_pic ? (
                                                <img src={user.profile_pic} alt="" className="h-8 w-8 rounded-full border border-gray-200" />
                                            ) : (
                                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs border border-blue-200">
                                                    {user.email ? user.email[0].toUpperCase() : <User className="h-4 w-4" />}
                                                </div>
                                            )}
                                            <div className="ml-4 max-w-[200px]">
                                                <div className="text-sm font-medium text-gray-900 truncate" title={user.name || "Unknown"}>
                                                    {user.name || "Unknown User"}
                                                </div>
                                                <div className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-500 hover:text-blue-600 transition-colors" onClick={() => handleCopy(user.email, `email-${user.id}`)}>
                                                    <span className="truncate max-w-[180px]" title={user.email}>{user.email}</span>
                                                    {copiedId === `email-${user.id}` ? (
                                                        <span className="text-[10px] text-green-600 bg-green-50 px-1 rounded">Copied!</span>
                                                    ) : (
                                                        <svg className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {user.provider === 'google' ? (
                                                <div className="flex items-center gap-1.5 bg-white border border-gray-200 px-2 py-1 rounded shadow-sm text-xs font-medium text-gray-700">
                                                    <img src="https://www.google.com/favicon.ico" className="h-3 w-3" alt="Google" />
                                                    Google
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 bg-white border border-gray-200 px-2 py-1 rounded shadow-sm text-xs font-medium text-gray-700">
                                                    <Mail className="h-3 w-3 text-gray-500" />
                                                    Email
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(user.created_at)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(user.last_login)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div
                                            className="group/uid flex items-center justify-between text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1.5 rounded border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all max-w-[200px]"
                                            onClick={() => handleCopy(user.id, `uid-${user.id}`)}
                                            title="Click to copy UID"
                                        >
                                            <span className="truncate">{user.id}</span>
                                            {copiedId === `uid-${user.id}` ? (
                                                <span className="ml-2 text-green-600 font-bold">✓</span>
                                            ) : (
                                                <svg className="h-3 w-3 ml-2 text-gray-400 group-hover/uid:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 01-2-2V6a2 2 0 012-2h8" />
                                                </svg>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                        <div className="bg-gray-50 p-6 rounded-full mb-4">
                            <UsersIconPlaceholder />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">No users yet</h3>
                        <p className="text-gray-500 max-w-sm mt-2 mb-8 text-sm">Users will appear here once they sign up in your app.</p>
                        <button className="text-blue-600 font-medium hover:text-blue-700 hover:underline flex items-center gap-1 text-sm">
                            Learn how to add users <span aria-hidden="true">&rarr;</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function UsersIconPlaceholder() {
    return (
        <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    )
}
