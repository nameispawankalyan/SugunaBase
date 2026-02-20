'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { Plus, Trash2, Box, Settings, Smartphone, Globe, Monitor } from 'lucide-react';
import Link from 'next/link';
import { io } from 'socket.io-client';

// Helper to get Icon
const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
        case 'android': return <Smartphone className="h-5 w-5" />;
        case 'web': return <Globe className="h-5 w-5" />;
        case 'ios': return <Smartphone className="h-5 w-5" />;
        default: return <Monitor className="h-5 w-5" />;
    }
};

export default function Dashboard() {
    const router = useRouter();
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [packageName, setPackageName] = useState('');
    const [googleClientId, setGoogleClientId] = useState('');
    const [platform, setPlatform] = useState('Android');

    // Auth Check
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
        }
    }, [router]);

    // Fetch Projects
    const fetchProjects = async () => {
        try {
            const data = await api.get('/projects');
            setProjects(data.projects || []);
        } catch (error) {
            // If 401, redirect to login
            console.error("Failed to fetch projects", error);
            // api.ts might handle 401, but explicit check is good
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();

        // Socket.io Connection
        const socket = io('https://api.suguna.co', { path: '/socket.io' });

        socket.on('connect', () => {
            console.log("⚡ Socket Connected");
            // Join User-Specific Room
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    if (user && user.id) {
                        socket.emit('join', user.id);
                    }
                } catch (e) {
                    console.error("Failed to parse user data, clearing storage", e);
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    router.push('/login');
                }
            }
        });

        socket.on('project_created', (newProject) => {
            setProjects(prev => [newProject, ...prev]);
        });

        socket.on('project_updated', (updatedProject) => {
            setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
        });

        socket.on('project_deleted', (deletedId) => {
            setProjects(prev => prev.filter(p => p.id != deletedId));
        });

        return () => { socket.disconnect(); };
    }, [router]);

    const createProject = async () => {
        if (!newProjectName) return;

        try {
            // 1. Create Project
            const project = await api.post('/projects', {
                name: newProjectName,
                platform: platform,
                google_client_id: googleClientId
            });

            // 2. Link Package Name (if provided)
            if (packageName && project.id) {
                await api.post(`/projects/${project.id}/apps`, { package_name: packageName });
            }

            setNewProjectName('');
            setPackageName('');
            setGoogleClientId('');
            setIsModalOpen(false);
        } catch (error) {
            alert('Failed to create project');
        }
    };

    const deleteProject = async (id: string) => {
        if (confirm('Are you sure you want to delete this project?')) {
            try {
                await api.delete(`/projects/${id}`);
            } catch (error) {
                alert('Failed to delete project');
            }
        }
    };

    const logout = async () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    if (loading) {
        return <div className="p-8 text-center flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>;
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
                    <p className="text-gray-500 mt-1">Welcome, Admin!</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={logout} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                        Log Out
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-orange-600 text-white px-5 py-2.5 rounded-lg hover:bg-orange-700 transition-colors shadow-lg shadow-orange-200 font-medium">
                        <Plus className="h-5 w-5" />
                        Create Project
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Projects</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-2">{projects.length}</h3>
                            <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full mt-2 inline-block">Active Apps</span>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg"><Box className="h-6 w-6 text-blue-600" /></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Server Status</p>
                            <h3 className="text-2xl font-bold text-green-600 mt-2">Online</h3>
                            <span className="text-xs text-gray-400 font-medium mt-2 inline-block">api.suguna.co</span>
                        </div>
                        <div className="p-2 bg-green-50 rounded-lg"><Settings className="h-6 w-6 text-green-600" /></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Database</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-2">Connected</h3>
                            <span className="text-xs text-green-600 font-medium mt-2 inline-block">PostgreSQL</span>
                        </div>
                        <div className="p-2 bg-purple-50 rounded-lg"><Settings className="h-6 w-6 text-purple-600" /></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project: any) => (
                    <div key={project.id} className="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteProject(project.id) }} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors"><Trash2 className="h-4 w-4" /></button>
                        </div>

                        <div className="flex items-center gap-4 mb-4">
                            <div className={`p-3 rounded-xl ${project.platform === 'Android' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                {getPlatformIcon(project.platform)}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-900">{project.name}</h3>
                                <p className="text-sm text-gray-500">{project.platform}</p>
                                {project.package_name && <p className="text-xs text-gray-400 mt-1">{project.package_name}</p>}
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-50">
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-400 font-medium uppercase">Users</span>
                                <span className="text-sm font-bold text-gray-700">{project.users_count || 0}</span>
                            </div>
                            <div className="flex flex-col text-right">
                                <span className="text-xs text-gray-400 font-medium uppercase">Revenue</span>
                                <span className="text-sm font-bold text-gray-700">₹{project.revenue || 0}</span>
                            </div>
                        </div>

                        <div className="mt-4 pt-2">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${project.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {project.status || 'Active'}
                            </span>
                        </div>

                        <Link href={`/project/${project.id}`} className="absolute inset-0 z-10" />
                    </div>
                ))}

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex flex-col items-center justify-center h-full min-h-[200px] rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-all group"
                >
                    <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                        <Plus className="h-6 w-6 text-gray-400 group-hover:text-orange-600" />
                    </div>
                    <span className="font-medium text-gray-500 group-hover:text-gray-700">Add New App</span>
                </button>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl transform transition-all">
                        <h2 className="text-2xl font-bold mb-6 text-gray-900">New Project</h2>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g., FriendZone"
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2.5 px-3"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Package Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g., com.suguna.app"
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2.5 px-3"
                                    value={packageName}
                                    onChange={(e) => setPackageName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Platform</label>
                                <select
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2.5 px-3"
                                    value={platform}
                                    onChange={(e) => setPlatform(e.target.value)}
                                >
                                    <option value="Android">Android</option>
                                    <option value="iOS">iOS</option>
                                    <option value="Web">Web</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Google Client ID (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="For Google Sign-In"
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-orange-500 focus:ring-orange-500 py-2.5 px-3"
                                    value={googleClientId}
                                    onChange={(e) => setGoogleClientId(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createProject}
                                className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium shadow-sm transition-colors"
                            >
                                Create Project
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
