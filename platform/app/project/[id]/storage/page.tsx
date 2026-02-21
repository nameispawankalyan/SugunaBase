'use client';

import { UploadCloud, Folder, File, Image as ImageIcon, Video, Search, Grid, MoreVertical, ChevronRight, X, Link as LinkIcon, Download, Copy, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function StoragePage() {
    const params = useParams();
    const [allFiles, setAllFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPath, setCurrentPath] = useState<string>('');
    const [selectedFile, setSelectedFile] = useState<any | null>(null);
    const [copiedName, setCopiedName] = useState<boolean>(false);
    const [copiedPath, setCopiedPath] = useState<boolean>(false);
    const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

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
            setAllFiles(data);
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

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' });
    };

    const copyToClipboard = (text: string, type: 'name' | 'path' | 'url') => {
        navigator.clipboard.writeText(text);
        if (type === 'name') {
            setCopiedName(true);
            setTimeout(() => setCopiedName(false), 2000);
        } else if (type === 'path') {
            setCopiedPath(true);
            setTimeout(() => setCopiedPath(false), 2000);
        } else {
            setCopiedUrl(true);
            setTimeout(() => setCopiedUrl(false), 2000);
        }
    };

    // Calculate items for current path
    const getItems = () => {
        const folders = new Set<string>();
        const files: any[] = [];

        allFiles.forEach(f => {
            let fPath = f.folder_path ? f.folder_path.trim() : '';
            // Remove trailing slashes if any
            if (fPath.endsWith('/')) fPath = fPath.slice(0, -1);

            if (fPath === currentPath) {
                // It's a file in the current directory
                files.push({ ...f, isFolder: false });
            } else if (currentPath === '' || fPath.startsWith(currentPath + '/')) {
                // It's in a subdirectory
                let remainingPath = currentPath === '' ? fPath : fPath.substring(currentPath.length + 1);
                let folderName = remainingPath.split('/')[0];
                if (folderName) {
                    folders.add(folderName);
                }
            }
        });

        const folderItems = Array.from(folders).map(name => ({
            id: `folder_${name}`,
            file_name: name,
            isFolder: true,
            file_size: 0,
            file_type: 'Folder',
            created_at: null
        }));

        // Sort folders first, then files alphabetically
        folderItems.sort((a, b) => a.file_name.localeCompare(b.file_name));
        files.sort((a, b) => a.file_name.localeCompare(b.file_name));

        return [...folderItems, ...files];
    };

    const items = getItems();

    const handleNavigate = (folderName: string) => {
        const newPath = currentPath === '' ? folderName : `${currentPath}/${folderName}`;
        setCurrentPath(newPath);
        setSelectedFile(null);
    };

    const navigateToBreadcrumb = (index: number) => {
        if (index === -1) {
            setCurrentPath('');
        } else {
            const parts = currentPath.split('/');
            setCurrentPath(parts.slice(0, index + 1).join('/'));
        }
        setSelectedFile(null);
    };

    const breadcrumbParts = currentPath === '' ? [] : currentPath.split('/');

    const pseudoToken = selectedFile ? `df1d61d9-5e32-422a-a6dd-a2c2ab4${(selectedFile.id || 0).toString().padStart(4, '0')}` : '';
    const directUrl = selectedFile ? `${selectedFile.file_url}?alt=media&token=${pseudoToken}` : '';

    return (
        <div className="flex h-[calc(100vh-theme(spacing.16))] -m-8 mt-0 bg-gray-50/50">
            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 p-8 ${selectedFile ? 'pr-8' : ''}`}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Storage</h1>
                        <div className="flex items-center mt-2 text-sm text-gray-600 bg-white px-3 py-1.5 rounded-md border shadow-sm w-fit">
                            <LinkIcon className="h-4 w-4 mr-2 text-gray-400" />
                            <span
                                className="hover:text-orange-600 cursor-pointer transition-colors"
                                onClick={() => navigateToBreadcrumb(-1)}
                            >
                                gs://suguna-base-project-{params.id}.appspot.com
                            </span>
                            {breadcrumbParts.map((part, index) => (
                                <div key={index} className="flex items-center">
                                    <ChevronRight className="h-4 w-4 mx-1 text-gray-400" />
                                    <span
                                        className={`hover:text-orange-600 cursor-pointer transition-colors ${index === breadcrumbParts.length - 1 ? 'font-medium text-gray-900' : ''}`}
                                        onClick={() => navigateToBreadcrumb(index)}
                                    >
                                        {part}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition shadow-sm">
                            <UploadCloud className="h-4 w-4" />
                            Upload File
                        </button>
                    </div>
                </div>

                <div className="flex-1 rounded-xl border bg-white shadow-sm overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="w-12 px-6 py-3 text-left">
                                        <input type="checkbox" className="rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Name</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Size</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Type</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Last modified</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {loading ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">Loading files...</td></tr>
                                ) : error ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-red-500">Error: {error}</td></tr>
                                ) : items.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">No files in this folder.</td></tr>
                                ) : items.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => item.isFolder ? handleNavigate(item.file_name) : setSelectedFile(item)}
                                        className={`hover:bg-blue-50/50 cursor-pointer group transition-colors ${selectedFile?.id === item.id ? 'bg-blue-50/50' : ''}`}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <input type="checkbox" className="rounded border-gray-300 text-orange-600 focus:ring-orange-500" onClick={(e) => e.stopPropagation()} />
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {item.isFolder ? <Folder className="h-5 w-5 text-gray-400 fill-gray-200" /> :
                                                    item.file_type?.startsWith('image/') ? <ImageIcon className="h-5 w-5 text-gray-400" /> :
                                                        item.file_type?.startsWith('video/') ? <Video className="h-5 w-5 text-gray-400" /> :
                                                            <File className="h-5 w-5 text-gray-400" />
                                                }
                                                <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{item.file_name}{item.isFolder ? '/' : ''}</span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{item.isFolder ? '—' : formatBytes(item.file_size)}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{item.isFolder ? 'Folder' : (item.file_type || 'Unknown')}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{item.created_at ? formatDate(item.created_at) : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Side Panel (Details) */}
            {selectedFile && (
                <div className="w-80 border-l bg-white flex flex-col overflow-hidden shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] transition-all animate-in slide-in-from-right">
                    <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50/80">
                        <h2 className="text-sm font-semibold text-gray-700 truncate pr-4">{selectedFile.file_name}</h2>
                        <button onClick={() => setSelectedFile(null)} className="p-1.5 hover:bg-gray-200 rounded-md text-gray-500 transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="p-6 overflow-y-auto flex-1 space-y-6">
                        {selectedFile.file_type?.startsWith('image/') ? (
                            <div className="w-full h-48 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border p-2">
                                <img src={directUrl} alt={selectedFile.file_name} className="max-w-full max-h-full object-contain" />
                            </div>
                        ) : selectedFile.file_type?.startsWith('video/') ? (
                            <div className="w-full h-48 rounded-xl bg-black flex items-center justify-center overflow-hidden border">
                                <video src={directUrl} controls className="max-w-full max-h-full" />
                            </div>
                        ) : (
                            <div className="w-full h-48 rounded-xl bg-gray-100 flex items-center justify-center border">
                                <File className="h-16 w-16 text-gray-300" />
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Name</label>
                                <div className="flex items-center gap-2 group">
                                    <a href={directUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline break-all" title="Click to view file in new tab">
                                        {selectedFile.file_name}
                                    </a>
                                    <button
                                        onClick={() => copyToClipboard(selectedFile.file_name, 'name')}
                                        className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-all flex-shrink-0"
                                        title="Copy name"
                                    >
                                        {copiedName ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Size</label>
                                <p className="text-sm text-gray-900">{selectedFile.file_size.toLocaleString()} bytes ({formatBytes(selectedFile.file_size)})</p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Type</label>
                                <p className="text-sm text-gray-900">{selectedFile.file_type}</p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Created</label>
                                <p className="text-sm text-gray-900">{selectedFile.created_at ? formatDate(selectedFile.created_at) : '—'}</p>
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">File Location</label>

                            <div className="space-y-3">
                                <div className="group relative">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs text-gray-500 block">Storage location</span>
                                        <button
                                            onClick={() => copyToClipboard(`gs://suguna-base-project-${params.id}.appspot.com/${selectedFile.folder_path ? selectedFile.folder_path + '/' : ''}${selectedFile.file_name}`, 'path')}
                                            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-all"
                                            title="Copy path"
                                        >
                                            {copiedPath ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                                        </button>
                                    </div>
                                    <p className="text-sm text-gray-800 font-mono bg-gray-50 p-2 rounded border break-all">
                                        gs://suguna-base-project-{params.id}.appspot.com/{selectedFile.folder_path ? selectedFile.folder_path + '/' : ''}{selectedFile.file_name}
                                    </p>
                                </div>

                                <div className="mt-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs text-gray-500 block">Access token</span>
                                        <span className="text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium">Revoke</span>
                                    </div>
                                    <p className="text-sm text-gray-800 font-mono break-all mb-4">
                                        {pseudoToken}
                                    </p>
                                    <span className="text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium">Create new access token</span>
                                </div>

                                <div className="mt-4">
                                    <div className="flex justify-between items-start mb-1 group">
                                        <span className="text-xs text-gray-500 block">Download URL</span>
                                    </div>
                                    <div className="flex items-center gap-2 group">
                                        <span
                                            onClick={() => copyToClipboard(directUrl, 'url')}
                                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer break-all"
                                            title="Click to copy Download URL">
                                            {directUrl}
                                        </span>
                                        <button
                                            onClick={() => copyToClipboard(directUrl, 'url')}
                                            className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-all flex-shrink-0"
                                            title="Copy URL"
                                        >
                                            {copiedUrl ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Other Metadata</label>
                                    <a href={directUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium group">
                                        <Download className="h-3 w-3" />
                                        <span>Direct file view/download link</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
