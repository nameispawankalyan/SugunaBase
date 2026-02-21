'use client';

import { UploadCloud, Folder, File, Image as ImageIcon, Video, Search, Grid, MoreVertical } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function StoragePage() {
    const params = useParams();
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchFiles();
    }, [params.id]);

    const fetchFiles = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`https://api.suguna.co/v1/console/projects/${params.id}/storage`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error('Failed to fetch storage items');
            const data = await res.json();
            setFiles(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatBytes = (bytes: number) => {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const dm = 2;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Storage</h1>
                    <p className="text-sm text-gray-500">Manage files and assets.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition">
                        <UploadCloud className="h-4 w-4" />
                        Upload File
                    </button>
                </div>
            </div>

            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center border-b px-4 py-3 gap-4">
                    <div className="flex items-center rounded-md bg-gray-100 px-3 py-1.5 w-64">
                        <Search className="mr-2 h-4 w-4 text-gray-400" />
                        <input type="text" placeholder="Search files" className="bg-transparent text-sm focus:outline-none w-full" />
                    </div>
                    <div className="flex-1"></div>
                    <div className="flex gap-2 text-sm text-gray-600">
                        <button className="p-1 hover:bg-gray-100 rounded"><Grid className="h-4 w-4" /></button>
                    </div>
                </div>

                {/* File List */}
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Path</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Size</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">URL</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {loading ? (
                            <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">Loading files...</td></tr>
                        ) : error ? (
                            <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-red-500">Error: {error}</td></tr>
                        ) : files.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No files uploaded yet. Upload from your app to see them here!</td></tr>
                        ) : files.map((file) => (
                            <tr key={file.id} className="hover:bg-gray-50/50 cursor-pointer group">
                                <td className="whitespace-nowrap px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        {file.file_type?.startsWith('image/') ? <ImageIcon className="h-5 w-5 text-purple-500" /> :
                                            file.file_type?.startsWith('video/') ? <Video className="h-5 w-5 text-blue-500" /> :
                                                <File className="h-5 w-5 text-gray-400" />
                                        }
                                        <span className="text-sm font-medium text-gray-900 group-hover:text-orange-600 transition-colors">{file.file_name}</span>
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{file.folder_path ? `/${file.folder_path}` : '/'}</td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{formatBytes(file.file_size)}</td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    <span className="inline-flex rounded-full px-2 text-xs font-semibold leading-5 bg-gray-100 text-gray-600">
                                        {file.file_type || 'Unknown'}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-blue-600 hover:text-blue-500">
                                    <a href={file.file_url} target="_blank" rel="noopener noreferrer">View File</a>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                    <button className="text-gray-400 hover:text-gray-600">
                                        <MoreVertical className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
