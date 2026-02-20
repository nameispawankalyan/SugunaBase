'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/utils/api';
import { ArrowLeft, Box, Download, Settings, Smartphone, Trash2, Key, Save } from 'lucide-react';
import Link from 'next/link';

// Config Object Generator
const generateConfig = (projectId: string, packageName: string, googleClientId?: string) => {
    return {
        "project_info": {
            "project_name": "SugunaBase Project",
            "project_id": projectId,
            "project_number": "1",
            "endpoint": "https://api.suguna.co/v1" // Secured Endpoint
        },
        "client": [
            {
                "client_info": {
                    "android_client_info": {
                        "package_name": packageName
                    }
                },
                "oauth_client": [
                    {
                        "client_id": googleClientId || "YOUR_WEB_CLIENT_ID",
                        "client_type": 3
                    }
                ],
                "services": {
                    "sugunabase": {
                        "base_url": "https://api.suguna.co/"
                    }
                }
            }
        ]
    }
};

export default function ProjectDetails() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [packageName, setPackageName] = useState('');
    const [isAddingApp, setIsAddingApp] = useState(false);
    const [configJson, setConfigJson] = useState<string | null>(null);

    // SHA Keys State
    const [sha1, setSha1] = useState('');
    const [sha256, setSha256] = useState('');
    const [savingKeys, setSavingKeys] = useState(false);

    useEffect(() => {
        if (!projectId) return;

        const fetchProject = async () => {
            try {
                const doc = await api.get(`/projects/${projectId}`);
                setProject(doc);
                if (doc.package_name) {
                    setPackageName(doc.package_name);
                    setSha1(doc.sha1_fingerprint || '');
                    setSha256(doc.sha256_fingerprint || '');
                    setConfigJson(JSON.stringify(generateConfig(projectId, doc.package_name, doc.google_client_id), null, 2));
                }
            } catch (error) {
                console.error("Failed to fetch project", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProject();
    }, [projectId]);

    const handleAddApp = async () => {
        if (!packageName) return;
        try {
            await api.post(`/projects/${projectId}/apps`, {
                package_name: packageName
            });

            // Update local state
            const updatedProject = { ...project, package_name: packageName };
            setProject(updatedProject);
            setConfigJson(JSON.stringify(generateConfig(projectId, packageName, project.google_client_id), null, 2));
            setIsAddingApp(false);
            alert('App linked successfully!');
        } catch (error: any) {
            alert('Failed to add app: ' + error.message);
        }
    };

    const handleSaveKeys = async () => {
        setSavingKeys(true);
        try {
            const updated = await api.put(`/projects/${projectId}/sha`, { sha1, sha256 });
            setProject(updated);
            setSha1(updated.sha1_fingerprint || '');
            setSha256(updated.sha256_fingerprint || '');
            alert('Signing keys saved successfully!');
        } catch (error: any) {
            alert('Failed to save keys: ' + error.message);
        } finally {
            setSavingKeys(false);
        }
    };

    const downloadConfig = () => {
        if (!configJson) return;
        const blob = new Blob([configJson], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "suguna-services.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (loading) {
        return <div className="p-8 text-center flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>;
    }

    if (!project) return <div className="p-8">Project not found</div>;

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 py-4">
                <Link href="/console" className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">{project.name}</h1>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium mr-2">{project.platform}</span>
                        <span>ID: {projectId}</span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 shadow-sm transition-all">
                        <Settings className="h-4 w-4" />
                        Settings
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium shadow-sm transition-all">
                        <Trash2 className="h-4 w-4" />
                        Delete
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid gap-6 lg:grid-cols-3">

                {/* Main Column: Platforms & Config */}
                <div className="lg:col-span-2 space-y-6">

                    {/* App Integration Section */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="border-b border-gray-100 p-5 bg-gray-50/50">
                            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                <Smartphone className="h-5 w-5 text-gray-500" />
                                Platforms & Integration
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">Manage your app's connection to SugunaBase.</p>
                        </div>

                        <div className="p-6">
                            {configJson ? (
                                <div className="space-y-6">
                                    {/* Connected App Status */}
                                    <div className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-lg">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 bg-white rounded-lg border border-green-100 flex items-center justify-center text-green-600 shadow-sm">
                                                <Smartphone className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-gray-900">Android App Connected</h3>
                                                <p className="text-sm text-gray-500 font-mono">{packageName}</p>
                                            </div>
                                        </div>
                                        <div className="hidden sm:block">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Active
                                            </span>
                                        </div>
                                    </div>

                                    {/* SHA Keys Configuration */}
                                    <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                                        <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                                            <Key className="h-4 w-4 text-gray-500" />
                                            App Signing Keys (SHA)
                                        </h4>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">SHA-1 Certificate Fingerprint</label>
                                                <input
                                                    type="text"
                                                    className="w-full text-sm font-mono border-gray-300 rounded-md focus:border-orange-500 focus:ring-orange-500"
                                                    placeholder="XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX"
                                                    value={sha1}
                                                    onChange={(e) => setSha1(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">SHA-256 Certificate Fingerprint</label>
                                                <input
                                                    type="text"
                                                    className="w-full text-sm font-mono border-gray-300 rounded-md focus:border-orange-500 focus:ring-orange-500"
                                                    placeholder="XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX"
                                                    value={sha256}
                                                    onChange={(e) => setSha256(e.target.value)}
                                                />
                                            </div>
                                            <div className="pt-2">
                                                <button
                                                    onClick={handleSaveKeys}
                                                    disabled={savingKeys}
                                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition shadow-sm"
                                                >
                                                    <Save className="h-4 w-4" />
                                                    {savingKeys ? 'Saving...' : 'Save Keys'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Configuration Download */}
                                    <div className="bg-blue-50/50 rounded-lg p-5 border border-blue-100">
                                        <h4 className="font-medium text-gray-900 mb-2">Setup Instructions</h4>
                                        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2 mb-4">
                                            <li>Download the <strong>suguna-services.json</strong> file below.</li>
                                            <li>Place it in your Android project's <strong>app/src/main/assets</strong> folder.</li>
                                            <li>Initialize the SugunaBase client in your Application class.</li>
                                        </ol>
                                        <button
                                            onClick={downloadConfig}
                                            className="inline-flex items-center gap-2 bg-orange-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-orange-700 transition shadow-sm"
                                        >
                                            <Download className="h-4 w-4" />
                                            Download Configuration
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4 ring-8 ring-gray-50">
                                        <Smartphone className="h-8 w-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-1">Add your Android App</h3>
                                    <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
                                        Link your Android application to generate configuration files and start using backend services.
                                    </p>

                                    {isAddingApp ? (
                                        <div className="max-w-md mx-auto bg-gray-50 p-6 rounded-xl border border-gray-200 animate-in fade-in zoom-in duration-200">
                                            <label className="block text-left text-sm font-medium text-gray-700 mb-1.5">Package Name</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. com.suguna.friendzone"
                                                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-orange-500 focus:ring-orange-500 text-sm py-2.5"
                                                autoFocus
                                                value={packageName}
                                                onChange={(e) => setPackageName(e.target.value)}
                                            />
                                            <p className="text-xs text-left text-gray-500 mt-1 mb-4">Must match your AndroidManifest.xml package.</p>

                                            <div className="flex gap-3">
                                                <button
                                                    onClick={handleAddApp}
                                                    disabled={!packageName}
                                                    className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                                >
                                                    Register & Connect
                                                </button>
                                                <button
                                                    onClick={() => setIsAddingApp(false)}
                                                    className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setIsAddingApp(true)}
                                            className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition shadow-sm"
                                        >
                                            <Smartphone className="h-4 w-4" />
                                            Add Platform
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Database Section */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                                <Box className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-900">Database</h2>
                                <p className="text-sm text-gray-500">Manage collections and documents</p>
                            </div>
                        </div>
                        <button className="text-sm font-medium text-orange-600 hover:text-orange-700 hover:underline">
                            Open Visual Editor →
                        </button>
                    </div>
                </div>

                {/* Right Sidebar: Stats & Info */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-6">Quick Stats</h3>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-sm">Active Users</span>
                                <span className="text-xl font-bold text-gray-900">{project.usersCount || 0}</span>
                            </div>
                            <div className="h-px bg-gray-100"></div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-sm">Revenue</span>
                                <span className="text-xl font-bold text-gray-900">₹{project.revenue || 0}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-[#1a3449] to-[#0f1f2d] rounded-xl p-6 text-white shadow-lg">
                        <h3 className="font-bold mb-2 text-lg">Developer Guide</h3>
                        <p className="text-sm text-gray-300 mb-6 leading-relaxed">
                            Learn how to integrate the SugunaBase SDK into your Android application securely.
                        </p>
                        <a href="/docs/android" className="block w-full text-center bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg py-2.5 text-sm font-medium transition backdrop-blur-sm">
                            View Documentation
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
