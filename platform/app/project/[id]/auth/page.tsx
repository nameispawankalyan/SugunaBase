'use client';

import { use, useState, useEffect } from 'react';
import { Search, Plus, RefreshCw, Phone, Mail, Shield, User, Settings, Check, X, ChevronRight } from 'lucide-react';
import { api } from '@/utils/api';

export default function AuthPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [activeTab, setActiveTab] = useState<'users' | 'methods'>('users');
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Project Config State
    const [project, setProject] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showGoogleSettings, setShowGoogleSettings] = useState(false);
    const [googleClientId, setGoogleClientId] = useState('');

    const fetchProject = async () => {
        try {
            const data = await api.get(`/projects/${id}`);
            setProject(data);
            setGoogleClientId(data.google_client_id || '');
        } catch (error) {
            console.error("Failed to fetch project", error);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.get(`/projects/${id}/users`);
            if (data.users) {
                setUsers(data.users);
            }
        } catch (error: any) {
            console.error("Failed to fetch users", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchUsers();
            fetchProject();
        }
    }, [id]);

    const handleToggleMethod = async (field: string) => {
        if (!project) return;
        setIsSaving(true);
        try {
            const newValue = !project[field];
            const updatedProject = await api.put(`/projects/${id}/auth-methods`, {
                [field]: newValue
            });
            setProject(updatedProject);
        } catch (err) {
            alert("Failed to update auth method");
        } finally {
            setIsSaving(false);
        }
    };

    const saveGoogleSettings = async () => {
        setIsSaving(true);
        try {
            const updatedProject = await api.put(`/projects/${id}/auth-methods`, {
                google_client_id: googleClientId,
                google_sign_in_enabled: true
            });
            setProject(updatedProject);
            setShowGoogleSettings(false);
        } catch (err) {
            alert("Failed to save Google settings");
        } finally {
            setIsSaving(false);
        }
    };

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

    const filteredUsers = users.filter(user => {
        const query = searchQuery.toLowerCase();
        return (
            (user.email && user.email.toLowerCase().includes(query)) ||
            (user.name && user.name.toLowerCase().includes(query)) ||
            (user.id && user.id.toLowerCase().includes(query))
        );
    });

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
                    <div
                        onClick={() => setActiveTab('users')}
                        className={`pb-3 text-sm font-medium cursor-pointer transition-all ${activeTab === 'users' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        Users
                    </div>
                    <div
                        onClick={() => setActiveTab('methods')}
                        className={`pb-3 text-sm font-medium cursor-pointer transition-all ${activeTab === 'methods' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        Sign-in method
                    </div>
                    <div className="text-gray-500 hover:text-gray-800 pb-3 text-sm font-medium cursor-pointer transition-colors">Templates</div>
                    <div className="text-gray-500 hover:text-gray-800 pb-3 text-sm font-medium cursor-pointer transition-colors">Usage</div>
                    <div className="text-gray-500 hover:text-gray-800 pb-3 text-sm font-medium cursor-pointer transition-colors">Settings</div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg text-center shadow-sm">
                    <Shield className="h-12 w-12 text-red-500 mx-auto mb-3" />
                    <h2 className="text-lg font-bold">Access Denied</h2>
                    <p className="mt-1">{error}</p>
                    <button onClick={() => window.location.href = '/console'} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700">
                        Go back to Console
                    </button>
                </div>
            )}

            {!error && activeTab === 'users' && (
                <>
                    <div className="flex justify-between items-center bg-white p-4 rounded-t-lg border border-gray-200 border-b-0 shadow-sm mt-6">
                        <div className="relative w-96 group">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search by email, phone, or UID"
                                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
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

                    <div className="border border-gray-200 bg-white rounded-b-lg shadow-sm overflow-hidden min-h-[400px]">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                                <span className="text-sm">Loading users...</span>
                            </div>
                        ) : filteredUsers.length > 0 ? (
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
                                    {filteredUsers.map((user) => (
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
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {users.length === 0 ? "No users yet" : "No matching users found"}
                                </h3>
                                <p className="text-gray-500 max-w-sm mt-2 mb-8 text-sm">
                                    {users.length === 0 ? "Users will appear here once they sign up in your app." : "Try adjusting your search query."}
                                </p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {!error && activeTab === 'methods' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900">Sign-in providers</h2>
                            <p className="text-sm text-gray-500">Enable and configure authentication methods for your project.</p>
                        </div>

                        <div className="divide-y divide-gray-100">
                            <ProviderRow
                                icon={<Mail className="h-5 w-5 text-gray-600" />}
                                name="Email/Password"
                                description="Allow users to sign up using their email address and password."
                                enabled={project?.email_auth_enabled}
                                onToggle={() => handleToggleMethod('email_auth_enabled')}
                            />

                            <ProviderRow
                                icon={<img src="https://www.google.com/favicon.ico" className="h-5 w-5" alt="Google" />}
                                name="Google"
                                description="Authenticate users using their Google Accounts."
                                enabled={project?.google_sign_in_enabled}
                                onToggle={() => handleToggleMethod('google_sign_in_enabled')}
                                hasSettings
                                onSettings={() => setShowGoogleSettings(true)}
                            />

                            <ProviderRow
                                icon={<Phone className="h-5 w-5 text-gray-600" />}
                                name="Phone"
                                description="Authenticate users using SMS verification."
                                enabled={project?.phone_auth_enabled}
                                onToggle={() => handleToggleMethod('phone_auth_enabled')}
                            />

                            <ProviderRow
                                icon={<User className="h-5 w-5 text-gray-600" />}
                                name="Anonymous"
                                description="Allow users to use your app without creating an account."
                                enabled={project?.anonymous_auth_enabled}
                                onToggle={() => handleToggleMethod('anonymous_auth_enabled')}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Google Settings Modal */}
            {showGoogleSettings && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                                    <img src="https://www.google.com/favicon.ico" className="h-5 w-5" alt="Google" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">Google Settings</h2>
                            </div>
                            <button onClick={() => setShowGoogleSettings(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Web Client ID</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                                    placeholder="Enter your Google Web Client ID"
                                    value={googleClientId}
                                    onChange={(e) => setGoogleClientId(e.target.value)}
                                />
                                <p className="text-[11px] text-gray-500 mt-3 flex items-start gap-2 leading-relaxed">
                                    <Shield className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                                    <span>Copy the <b>Web Client ID</b> from your Google Cloud Console. This is required for ID token verification on the server.</span>
                                </p>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
                            <button
                                onClick={() => setShowGoogleSettings(false)}
                                className="px-5 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveGoogleSettings}
                                disabled={isSaving}
                                className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all"
                            >
                                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ProviderRow({ icon, name, description, enabled, onToggle, hasSettings, onSettings }: any) {
    return (
        <div className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm group-hover:border-blue-200 transition-colors">
                    {icon}
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        {name}
                        {enabled && <span className="flex items-center gap-0.5 text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full border border-green-100">Enabled</span>}
                    </h3>
                    <p className="text-xs text-gray-500 max-w-md mt-0.5">{description}</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                {hasSettings && enabled && (
                    <button
                        onClick={onSettings}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Configuration">
                        <Settings className="h-4 w-4" />
                    </button>
                )}
                <div
                    onClick={onToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors duration-200 focus:outline-none ${enabled ? 'bg-blue-600' : 'bg-gray-200'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
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
