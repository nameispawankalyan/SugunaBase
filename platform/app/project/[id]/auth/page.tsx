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

    return (
        <div className="space-y-6">

            {/* Auth Header */}
            <div className="flex items-center justify-between border-b pb-4">
                <div>
                    <h1 className="text-2xl font-normal text-gray-800">Authentication</h1>
                    <div className="text-sm text-gray-500 mt-1">Project ID: {id}</div>
                    <div className="flex gap-6 mt-4 text-sm font-medium text-gray-500">
                        <div className="border-b-2 border-blue-600 text-blue-600 pb-2 cursor-pointer">Users</div>
                        <div className="hover:text-gray-800 pb-2 cursor-pointer">Sign-in method</div>
                        <div className="hover:text-gray-800 pb-2 cursor-pointer">Templates</div>
                        <div className="hover:text-gray-800 pb-2 cursor-pointer">Usage</div>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center bg-white p-4 rounded-t border border-gray-200 shadow-sm mb-0">
                <div className="relative w-96">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by email address, phone number, or UID"
                        className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded shadow-sm transition-colors">
                        <Plus className="h-4 w-4" />
                        Add user
                    </button>
                    <button onClick={fetchUsers} className="p-2 text-gray-500 hover:bg-gray-100 rounded border border-gray-300">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Users Table */}
            <div className="border border-t-0 border-gray-200 bg-white rounded-b shadow-sm overflow-hidden mt-0 min-h-[300px]">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : users.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Identifier</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Providers</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signed In</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User UID</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 cursor-pointer">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center gap-2">
                                        {user.profile_pic ? (
                                            <img src={user.profile_pic} alt="" className="h-6 w-6 rounded-full" />
                                        ) : (
                                            <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center">
                                                <User className="h-3 w-3 text-gray-500" />
                                            </div>
                                        )}
                                        {user.email || user.name || "Unknown"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex gap-1 capitalize items-center">
                                            {user.provider === 'google' && <span className="bg-white border p-0.5 rounded shadow-sm"><img src="https://www.google.com/favicon.ico" className="h-3 w-3" /></span>}
                                            {user.provider === 'email' && <Mail className="h-4 w-4 text-gray-500" />}
                                            {user.provider}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(user.created_at)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(user.last_login)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-mono">
                                        {user.id}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                        <div className="bg-gray-50 p-4 rounded-full mb-4">
                            <UsersIconPlaceholder />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No users found</h3>
                        <p className="text-gray-500 max-w-sm mt-1 mb-6">There are no users in this project yet. Add users manually or integrate the SDK.</p>
                        <button className="text-blue-600 font-medium hover:underline">Learn how to add users</button>
                    </div>
                )}
            </div>
        </div>
    );
}

function UsersIconPlaceholder() {
    return (
        <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    )
}
