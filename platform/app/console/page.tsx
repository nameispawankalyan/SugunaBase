'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/utils/api';
import {
    Plus, Trash2, Box, Settings, Smartphone, Globe, Monitor,
    Users, Search, ShieldCheck, ShieldAlert, ChevronRight,
    LayoutDashboard, Activity, Database, CheckCircle2, XCircle, AlertCircle, X
} from 'lucide-react';
import Link from 'next/link';
import { io } from 'socket.io-client';

// Premium Modal Component
const Modal = ({ isOpen, title, message, onConfirm, onCancel, confirmText, type = 'confirm' }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60 animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100">
                <div className="p-10 text-center">
                    {type === 'danger' ? (
                        <div className="h-20 w-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trash2 className="h-10 w-10 text-red-500" />
                        </div>
                    ) : (
                        <div className="h-20 w-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="h-10 w-10 text-orange-500" />
                        </div>
                    )}
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-3">{title}</h3>
                    <p className="text-gray-500 font-medium leading-relaxed">{message}</p>
                </div>
                <div className="flex border-t border-gray-50">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-8 py-6 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all font-sans"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 px-8 py-6 text-xs font-black uppercase tracking-widest transition-all ${type === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
                    >
                        {confirmText || 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Toast Component
const Toast = ({ message, type, onClose }: any) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[210] animate-in slide-in-from-bottom-5 duration-300">
            <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl ${type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-red-500/10 border-red-500/20 text-red-600'}`}>
                {type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                <span className="text-sm font-black tracking-tight">{message}</span>
                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-all ml-2">
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // Developer State
    const [projects, setProjects] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [customProjectId, setCustomProjectId] = useState('');
    const [idError, setIdError] = useState('');

    // Modal & Toast State
    const [modal, setModal] = useState<any>({ isOpen: false });
    const [toast, setToast] = useState<any>(null);

    // Admin State
    const [developers, setDevelopers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDev, setSelectedDev] = useState<any>(null);
    const [devProjects, setDevProjects] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        let userData = {};
        try {
            userData = JSON.parse(localStorage.getItem('user') || '{}');
        } catch (e) {
            console.error("Local storage parse error", e);
        }

        const token = localStorage.getItem('token');

        if (!token || !userData || !(userData as any).id) {
            router.push('/login');
            return;
        }

        setUser(userData);
        setIsAdmin((userData as any).role === 'admin');
    }, [router]);

    const fetchData = async () => {
        setLoading(true);
        try {
            let userData: any = {};
            try {
                userData = JSON.parse(localStorage.getItem('user') || '{}');
            } catch (e) { }

            if (userData.role === 'admin') {
                const devs = await api.get('/admin/users');
                setDevelopers(devs);
            } else {
                const data = await api.get('/projects');
                setProjects(data.projects || []);
            }
        } catch (error) {
            console.error("Fetch Data Failed:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isMounted) fetchData();
    }, [isMounted]);

    // Admin Actions
    const toggleUserStatus = async (dev: any) => {
        try {
            await api.put(`/admin/users/${dev.id}/status`, { is_active: !dev.is_active });
            setDevelopers(prev => prev.map(d => d.id === dev.id ? { ...d, is_active: !d.is_active } : d));
            if (selectedDev?.id === dev.id) setSelectedDev({ ...selectedDev, is_active: !dev.is_active });
        } catch (e) { alert('Failed to update status'); }
    };

    const toggleProjectStatus = async (project: any) => {
        try {
            await api.put(`/admin/projects/${project.id}/status`, { is_active: !project.is_active });
            setDevProjects(prev => prev.map(p => p.id === project.id ? { ...p, is_active: !p.is_active } : p));
        } catch (e) { alert('Failed to update status'); }
    };

    const viewDeveloper = async (dev: any) => {
        setSelectedDev(dev);
        try {
            const projects = await api.get(`/admin/users/${dev.id}/projects`);
            setDevProjects(projects);
        } catch (e) { console.error(e); }
    };

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
    };

    const handleDeleteProject = (p: any) => {
        setModal({
            isOpen: true,
            title: 'Delete Project',
            message: `Are you sure you want to delete "${p.name}"? This action cannot be undone.`,
            type: 'danger',
            confirmText: 'Delete Project',
            onConfirm: async () => {
                setModal({ isOpen: false });
                try {
                    await api.delete(`/projects/${p.project_id || p.id}`);
                    fetchData();
                    showToast('Project deleted successfully');
                } catch (e: any) {
                    showToast(e.message, 'error');
                }
            }
        });
    };

    const logout = () => {
        localStorage.clear();
        router.push('/login');
    };

    if (!isMounted) return null;
    if (loading) return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-600 border-r-2 border-transparent"></div>
        </div>
    );

    // --- ADMIN VIEW ---
    if (isAdmin) {
        const filteredDevs = developers.filter(d =>
            (d.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (d.name?.toLowerCase() || "").includes(searchTerm.toLowerCase())
        );

        return (
            <div className="p-8 max-w-7xl mx-auto space-y-8">
                {/* Admin Header */}
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">System Administration</h1>
                        <p className="text-gray-500 mt-2 font-medium">Monitoring {developers?.length || 0} Developers across the platform</p>
                    </div>
                    <button onClick={logout} className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-bold shadow-sm transition-all flex items-center gap-2">
                        Admin Logout <ChevronRight className="h-4 w-4" />
                    </button>
                </div>

                {/* Search & Stats */}
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search developers by name or email..."
                            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-orange-500 transition-all outline-none text-lg"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-white p-4 px-8 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-orange-50 rounded-xl"><Users className="h-6 w-6 text-orange-600" /></div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Developers</p>
                                <p className="text-2xl font-black text-gray-900">{developers?.length || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Dev List */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">Developer</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">Projects</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">Status</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredDevs.length > 0 ? filteredDevs.map(dev => (
                                        <tr
                                            key={dev.id}
                                            className={`hover:bg-orange-50/30 transition-colors cursor-pointer ${selectedDev?.id === dev.id ? 'bg-orange-50/50' : ''}`}
                                            onClick={() => viewDeveloper(dev)}
                                        >
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-orange-400 to-rose-400 flex items-center justify-center text-white font-bold">
                                                        {dev.name?.[0] || 'U'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{dev.name}</p>
                                                        <p className="text-sm text-gray-400">{dev.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600">{dev.project_count} Apps</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                {dev.is_active ? (
                                                    <span className="flex items-center gap-1.5 text-green-600 font-bold text-xs"><CheckCircle2 className="h-4 w-4" /> Active</span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 text-red-500 font-bold text-xs"><XCircle className="h-4 w-4" /> Deactivated</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <ChevronRight className="h-5 w-5 text-gray-300 inline" />
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Users className="h-8 w-8 text-gray-200" />
                                                    <p className="text-gray-400 font-medium">No developers found in the system</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Quick Inspector */}
                    <div className="space-y-6">
                        {selectedDev ? (
                            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-right-4">
                                <div className="p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-white relative">
                                    <div className="relative z-10">
                                        <h3 className="text-2xl font-black">{selectedDev.name}</h3>
                                        <p className="text-gray-400 text-sm mt-1">{selectedDev.email}</p>

                                        <div className="mt-8 flex gap-4">
                                            <button
                                                onClick={() => toggleUserStatus(selectedDev)}
                                                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${selectedDev.is_active ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                                            >
                                                {selectedDev.is_active ? 'Deactivate Account' : 'Activate Account'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="absolute top-0 right-0 p-8 opacity-10"><Users className="h-24 w-24" /></div>
                                </div>

                                <div className="p-6 space-y-4">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Managed Projects</h4>
                                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {devProjects.length > 0 ? devProjects.map(p => (
                                            <div
                                                key={p.id}
                                                className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group hover:bg-white border border-transparent hover:border-gray-100 transition-all cursor-pointer"
                                                onClick={() => router.push(`/project/${p.project_id || p.id}`)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Box className="h-4 w-4 text-orange-600" />
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-800">{p.name || 'Untitled'}</p>
                                                        <p className="text-[10px] text-gray-400 font-medium">{p.platform}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => toggleProjectStatus(p)}
                                                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                                >
                                                    {p.is_active ? 'Active' : 'Paused'}
                                                </button>
                                            </div>
                                        )) : <p className="text-center py-8 text-gray-400 text-sm font-medium">No projects found</p>}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-12 text-center h-[500px]">
                                <div className="p-5 bg-white rounded-full shadow-sm mb-4"><Database className="h-10 w-10 text-gray-300" /></div>
                                <h3 className="font-bold text-gray-900">Developer Inspector</h3>
                                <p className="text-sm text-gray-400 mt-2">Select a developer from the list to manage their account and projects.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- DEVELOPER VIEW (Normal Dashboard) ---
    return (
        <div className="p-8 max-w-7xl mx-auto relative min-h-screen">
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
            <Modal {...modal} onCancel={() => setModal({ isOpen: false })} />

            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 leading-tight">My Projects</h1>
                    <p className="text-gray-500 mt-1 font-medium">Manage your application infrastructure</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={logout} className="px-6 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm">
                        Log Out
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-orange-600 text-white px-6 py-2.5 rounded-xl hover:bg-orange-700 transition-all shadow-xl shadow-orange-100 font-bold">
                        <Plus className="h-5 w-5" />
                        Create Project
                    </button>
                </div>
            </div>

            {projects.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
                    <div className="p-5 bg-orange-50 rounded-full w-fit mx-auto mb-6"><Box className="h-12 w-12 text-orange-600" /></div>
                    <h2 className="text-2xl font-bold text-gray-900">Start your journey</h2>
                    <p className="text-gray-500 mt-2 max-w-sm mx-auto">Build something amazing today by creating your first SugunaBase project.</p>
                    <button onClick={() => setIsModalOpen(true)} className="mt-8 bg-orange-600 text-white px-8 py-3 rounded-2xl font-bold hover:scale-105 transition-transform">Get Started</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {projects.map((project: any) => (
                        <div key={project.id} className={`group bg-white rounded-[2rem] border-2 ${project.is_active ? 'border-transparent' : 'border-red-100 opacity-75'} p-8 hover:shadow-2xl transition-all duration-500 relative overflow-hidden ring-1 ring-gray-100`}>
                            {!project.is_active && (
                                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-30 flex flex-col items-center justify-center p-6 text-center">
                                    <ShieldAlert className="h-12 w-12 text-red-500 mb-2" />
                                    <h3 className="font-black text-red-900">Project Deactivated</h3>
                                    <p className="text-xs text-red-700 font-medium">Contact admin to reactivate this service.</p>
                                </div>
                            )}

                            <div className="flex items-center gap-5 mb-8">
                                <div className={`p-4 rounded-2xl ${project.platform === 'Android' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {project.platform === 'Android' ? <Smartphone className="h-6 w-6" /> : <Globe className="h-6 w-6" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-xl text-gray-900 truncate">{project.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{project.project_id}</p>
                                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{project.platform}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDeleteProject(project);
                                    }}
                                    className="p-3 bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-2xl transition-all z-20 opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-50">
                                <div className="bg-gray-50 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">Users</p>
                                    <p className="text-lg font-black text-gray-900">{project.users_count || 0}</p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">Status</p>
                                    <p className={`text-sm font-black uppercase ${project.is_active ? 'text-green-600' : 'text-red-500'}`}>{project.is_active ? 'Active' : 'Paused'}</p>
                                </div>
                            </div>

                            <Link href={`/project/${project.project_id || project.id}`} className={`absolute inset-0 z-10 ${!project.is_active ? 'pointer-events-none' : ''}`} />
                        </div>
                    ))}

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex flex-col items-center justify-center p-10 rounded-[2rem] border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-orange-50 hover:border-orange-200 transition-all group min-h-[250px]"
                    >
                        <div className="h-14 w-14 rounded-full bg-white flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform">
                            <Plus className="h-7 w-7 text-gray-400 group-hover:text-orange-600" />
                        </div>
                        <span className="font-bold text-gray-500 group-hover:text-gray-700">Add New Project</span>
                    </button>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
                    <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="mb-8">
                            <h2 className="text-3xl font-black text-gray-900">New Project</h2>
                            <p className="text-gray-500 font-medium">Define your application workspace</p>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Project Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g., FriendZone"
                                    className="w-full bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-orange-500 p-4 font-medium"
                                    value={newProjectName}
                                    onChange={(e) => {
                                        setNewProjectName(e.target.value);
                                        // Auto-generate ID if not manually edited or if empty
                                        const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                                        setCustomProjectId(slug);
                                    }}
                                />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2 ml-1">
                                    <label className="text-xs font-black text-gray-400 uppercase">Project ID</label>
                                    <span className={`text-[10px] font-bold ${idError ? 'text-red-500' : 'text-gray-400'}`}>
                                        {idError || 'Unique identifier'}
                                    </span>
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="project-id-123"
                                        className={`w-full bg-gray-50 border-2 rounded-2xl p-4 font-mono text-sm outline-none transition-all ${idError ? 'border-red-500 bg-red-50/10' : 'border-transparent focus:border-orange-500 bg-gray-50'}`}
                                        value={customProjectId}
                                        onChange={(e) => {
                                            const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                            setCustomProjectId(val);
                                            if (val.length < 4) setIdError('Too short (min 4 chars)');
                                            else setIdError('');
                                        }}
                                    />
                                    <p className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300 uppercase tracking-widest">Editable</p>
                                </div>
                                <p className="mt-2 text-[10px] text-gray-400 font-medium px-1">
                                    Project ID is a permanent, unique identifier used in SugunaBase APIs.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4 mt-10">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold transition-all">Cancel</button>
                            <button onClick={async () => {
                                if (!newProjectName) return;
                                try {
                                    const res = await api.post('/projects', {
                                        name: newProjectName,
                                        project_id: customProjectId
                                    });
                                    setIsModalOpen(false);
                                    setNewProjectName('');
                                    setCustomProjectId('');
                                    fetchData();
                                } catch (e: any) {
                                    setIdError(e.message);
                                }
                            }} className="flex-1 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold shadow-xl shadow-orange-100 transition-all">Create</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
