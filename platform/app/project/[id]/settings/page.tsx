'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import {
    Settings,
    Trash2,
    Save,
    Shield,
    Info,
    Smartphone,
    Globe,
    ChevronLeft
} from 'lucide-react';
import Link from 'next/link';

export default function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [googleClientId, setGoogleClientId] = useState('');

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const data = await api.get(`/projects/${id}`);
                setProject(data);
                setName(data.name);
                setGoogleClientId(data.google_client_id || '');
            } catch (error) {
                console.error('Failed to fetch project:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProject();
    }, [id]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.put(`/projects/${id}`, {
                name,
                google_client_id: googleClientId
            });
            alert('Settings saved successfully!');
            router.refresh();
        } catch (error: any) {
            alert('Failed to save settings: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('This will PERMANENTLY delete the project. Are you sure?')) return;
        try {
            await api.delete(`/projects/${id}`);
            router.push('/console');
        } catch (error: any) {
            alert('Delete failed: ' + error.message);
        }
    };

    if (loading) return <div className="p-8 text-center animate-pulse text-gray-400">Loading settings...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/project/${id}`} className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-gray-100 transition-all text-gray-500 hover:text-gray-900 group">
                        <ChevronLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                            <Settings className="h-6 w-6 text-gray-500" />
                            Project Settings
                        </h1>
                        <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-0.5">Project ID: {project?.project_id || id}</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-8">
                {/* General Settings */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                        <h3 className="font-black text-gray-900 flex items-center gap-2">
                            <Info className="h-5 w-5 text-blue-500" />
                            General Information
                        </h3>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Project Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl transition-all font-bold text-gray-900 shadow-inner"
                                placeholder="e.g. My Awesome App"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Google Client ID</label>
                            <input
                                type="text"
                                value={googleClientId}
                                onChange={(e) => setGoogleClientId(e.target.value)}
                                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl transition-all font-bold text-gray-900 font-mono shadow-inner"
                                placeholder="client-id.apps.googleusercontent.com"
                            />
                            <p className="text-[10px] text-gray-400 font-bold px-1">Required for Google Sign-In features.</p>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-8 py-3.5 bg-gray-900 text-white font-black rounded-2xl hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-gray-200 flex items-center gap-2 disabled:opacity-50"
                            >
                                <Save className="h-5 w-5" />
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Service Info */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-blue-50 rounded-2xl">
                                <Shield className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <h4 className="font-black text-gray-900">Security Status</h4>
                                <p className="text-xs font-semibold text-green-600">Active & Protected</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed font-medium">
                            Your project is protected by JWT-based authentication and end-to-end encryption for Firestore and Storage.
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-orange-50 rounded-2xl">
                                {project?.platform === 'Android' ? <Smartphone className="h-6 w-6 text-orange-600" /> : <Globe className="h-6 w-6 text-orange-600" />}
                            </div>
                            <div>
                                <h4 className="font-black text-gray-900">Environment</h4>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{project?.platform || 'Universal'}</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed font-medium">
                            Configured for {project?.platform} development. You can download the suguna-services.json from the overview.
                        </p>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-red-50/50 rounded-3xl border border-red-100 overflow-hidden">
                    <div className="px-8 py-6 border-b border-red-100 flex items-center justify-between">
                        <h3 className="font-black text-red-900 flex items-center gap-2">
                            <Trash2 className="h-5 w-5 text-red-600" />
                            Danger Zone
                        </h3>
                    </div>
                    <div className="p-8 flex items-center justify-between">
                        <div>
                            <p className="font-black text-gray-900">Delete this project</p>
                            <p className="text-xs text-red-600 font-bold mt-1">Warning: This will delete all Firestore data, Storage files, and project configuration.</p>
                        </div>
                        <button
                            onClick={handleDelete}
                            className="px-6 py-3 bg-white border-2 border-red-200 text-red-600 font-black rounded-2xl hover:bg-red-600 hover:text-white hover:border-red-600 transition-all active:scale-95 shadow-sm"
                        >
                            Delete Project
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
