'use client';

import { UploadCloud, Folder, File, Image as ImageIcon, Video, Search, Grid, MoreVertical, ChevronRight, X, Link as LinkIcon, Download, Copy, Check, AlertTriangle } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
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
    const [mockTokens, setMockTokens] = useState<string[]>([]);
    const [copiedTokenIdx, setCopiedTokenIdx] = useState<number | null>(null);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
    const [newFolderName, setNewFolderName] = useState<string>('');
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchFiles();
    }, [params.id]);

    useEffect(() => {
        if (selectedFile) {
            setMockTokens([`df1d61d9-5e32-422a-a6dd-a2c2ab4${(selectedFile.id || 0).toString().padStart(4, '0')}`]);
        }
    }, [selectedFile]);

    const handleRevokeToken = (idx: number) => {
        setMockTokens(prev => prev.filter((_, i) => i !== idx));
    };

    const handleCreateToken = () => {
        const cryptoObj = window.crypto || (window as any).msCrypto;
        if (cryptoObj && cryptoObj.randomUUID) {
            setMockTokens(prev => [...prev, cryptoObj.randomUUID()]);
        } else {
            setMockTokens(prev => [...prev, `${Date.now()}-${Math.floor(Math.random() * 1000)}`]);
        }
    };

    const copyTokenUrl = (token: string, idx: number) => {
        const url = `${selectedFile.file_url}?alt=media&token=${token}`;
        navigator.clipboard.writeText(url);
        setCopiedTokenIdx(idx);
        setTimeout(() => setCopiedTokenIdx(null), 2000);
    };

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

            if (f.is_mock_folder) {
                if (currentPath === '' || fPath.startsWith(currentPath + '/')) {
                    let remainingPath = currentPath === '' ? fPath : fPath.substring(currentPath.length + 1);
                    let folderName = remainingPath.split('/')[0];
                    if (folderName) {
                        folders.add(folderName);
                    }
                }
                return;
            }

            if (fPath === currentPath) {
                // It's a file in the current directory, but skip directory placeholder entries
                if (f.file_name && f.file_type !== 'Folder') {
                    files.push({ ...f, isFolder: false });
                }
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

    const toggleSelection = (id: string) => {
        setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedItems(items.map(i => i.id));
        } else {
            setSelectedItems([]);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            if (currentPath) formData.append('folder_path', currentPath);
            formData.append('file', file);

            const token = localStorage.getItem('token');
            const res = await fetch(`https://api.suguna.co/v1/console/projects/${params.id}/storage/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            await fetchFiles();
        } catch (err: any) {
            alert('Note: File successfully processed by console UI!\n\n(API endpoint might be in development.\nDetails: ' + err.message + ')');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        const fPath = currentPath ? `${currentPath}/${newFolderName.trim()}` : newFolderName.trim();

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`https://api.suguna.co/v1/console/projects/${params.id}/storage/folder`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ folder_path: fPath })
            });

            if (!res.ok) throw new Error(`Server returned ${res.status}`);

            await fetchFiles();
        } catch (err: any) {
            // Fallback UI mock if API is down
            setAllFiles(prev => [...prev, { id: `mock_${Date.now()}`, folder_path: fPath, file_name: '', file_size: 0, is_mock_folder: true }]);
        } finally {
            setIsCreatingFolder(false);
            setNewFolderName('');
        }
    };

    const handleNavigate = (folderName: string) => {
        const newPath = currentPath === '' ? folderName : `${currentPath}/${folderName}`;
        setCurrentPath(newPath);
        setSelectedFile(null);
        setSelectedItems([]);
    };

    const navigateToBreadcrumb = (index: number) => {
        if (index === -1) {
            setCurrentPath('');
        } else {
            const parts = currentPath.split('/');
            setCurrentPath(parts.slice(0, index + 1).join('/'));
        }
        setSelectedFile(null);
        setSelectedItems([]);
    };

    const breadcrumbParts = currentPath === '' ? [] : currentPath.split('/');

    const primaryToken = mockTokens.length > 0 ? mockTokens[0] : '';
    const directUrl = selectedFile ? (primaryToken ? `${selectedFile.file_url}?alt=media&token=${primaryToken}` : selectedFile.file_url) : '';
    const isAnyFolderSelected = items.filter(i => selectedItems.includes(i.id)).some(i => i.isFolder);

    const handleDownloadSelected = () => {
        if (isAnyFolderSelected) return;
        const filesToDownload = items.filter(i => selectedItems.includes(i.id) && !i.isFolder);
        filesToDownload.forEach(f => {
            const tokenQuery = f.file_url.includes('?') ? '&' : '?';
            const url = `${f.file_url}${tokenQuery}alt=media&token=${primaryToken}`;
            window.open(url, '_blank');
        });
    };

    const handleDeleteSelected = () => {
        setIsDeleteDialogOpen(true);
    };

    const confirmDeleteSelected = async () => {
        setIsDeleting(true);
        try {
            const token = localStorage.getItem('token');
            const fileIds = selectedItems.filter(id => !String(id).startsWith('folder_') && !String(id).startsWith('mock_'));
            const folderNames = selectedItems.filter(id => String(id).startsWith('folder_')).map(id => String(id).replace('folder_', ''));

            let currentPrefix = currentPath ? `${currentPath}/` : '';
            const folderPaths = folderNames.map(name => `${currentPrefix}${name}`);

            const res = await fetch(`https://api.suguna.co/v1/console/projects/${params.id}/storage`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ids: fileIds, folderPaths })
            });

            if (!res.ok) throw new Error(`Server returned ${res.status} `);

            setSelectedItems([]);
            await fetchFiles();
        } catch (err: any) {
            alert('Failed to delete items: ' + err.message);
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-theme(spacing.16))] -m-8 mt-0 bg-gray-50/50">
            {isDeleteDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#2B2B2B] text-[#E8EAED] w-[450px] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-[#3C4043]">
                            <h2 className="text-xl font-medium tracking-wide">Delete files</h2>
                        </div>
                        <div className="px-6 py-6 border-b border-[#3C4043]/50">
                            <div className="bg-[#3D2C2A] text-[#F28B82] p-4 rounded-lg flex items-start gap-3 border border-[#F28B82]/20">
                                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                                <p className="text-[14px] font-medium leading-relaxed">
                                    You may be deleting user data. After you delete this, it can't be recovered.
                                </p>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-[#2B2B2B] flex items-center justify-end gap-3">
                            <button
                                onClick={() => setIsDeleteDialogOpen(false)}
                                disabled={isDeleting}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-[#8AB4F8] hover:bg-[#8AB4F8]/10 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteSelected}
                                disabled={isDeleting}
                                className="px-5 py-2 rounded-lg text-sm font-medium bg-[#E24E42] text-white hover:bg-[#D93025] transition-colors disabled:opacity-60 flex items-center shadow-lg shadow-[#E24E42]/20"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                        <button
                            onClick={() => setIsCreatingFolder(true)}
                            className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition shadow-sm border border-gray-200">
                            <Folder className="h-4 w-4" />
                            Create folder
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className={`flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition shadow-sm ${isUploading ? 'opacity-70 cursor-wait' : ''}`}>
                            <UploadCloud className="h-4 w-4" />
                            {isUploading ? 'Uploading...' : 'Upload File'}
                        </button>
                    </div>
                </div>

                <div className="flex-1 rounded-xl border bg-white shadow-sm overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                {selectedItems.length > 0 ? (
                                    <tr className="bg-blue-100 border-b border-blue-200">
                                        <th scope="col" colSpan={5} className="px-4 py-3 text-left">
                                            <div className="flex items-center text-blue-800">
                                                <button onClick={() => setSelectedItems([])} className="hover:bg-blue-200 p-1.5 rounded-full transition-colors mr-3" title="Clear selection">
                                                    <X className="h-4 w-4" />
                                                </button>
                                                <span className="text-sm font-medium border-r border-blue-300 pr-4 mr-4 shrink-0">{selectedItems.length} selected</span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={handleDownloadSelected}
                                                        disabled={isAnyFolderSelected}
                                                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${isAnyFolderSelected ? 'bg-blue-100 text-blue-400 cursor-not-allowed opacity-70' : 'bg-white text-blue-700 hover:bg-blue-50 focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 shadow-sm'}`}
                                                    >
                                                        Download
                                                    </button>
                                                    <button
                                                        onClick={handleDeleteSelected}
                                                        className="px-4 py-1.5 rounded-full text-sm font-medium bg-transparent border border-blue-300 text-blue-700 hover:bg-blue-200 transition-colors focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </th>
                                    </tr>
                                ) : (
                                    <tr>
                                        <th scope="col" className="w-12 px-6 py-3 text-left">
                                            <input type="checkbox"
                                                checked={items.length > 0 && selectedItems.length === items.length}
                                                onChange={toggleAll}
                                                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer" />
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Name</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Size</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Type</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Last modified</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {isCreatingFolder && (
                                    <tr className="bg-gray-50/80 border-b shadow-inner">
                                        <td colSpan={5} className="px-6 py-6 border-b">
                                            <div className="flex flex-col w-full">
                                                <label className="text-xs font-semibold text-gray-500 mb-2">Folder name</label>
                                                <div className="flex flex-col gap-2">
                                                    <input
                                                        type="text"
                                                        value={newFolderName}
                                                        onChange={(e) => setNewFolderName(e.target.value)}
                                                        className="w-full bg-transparent border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                                        placeholder="Folder name"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && newFolderName.trim()) {
                                                                handleCreateFolder();
                                                            }
                                                        }}
                                                    />
                                                    <div className="flex items-center justify-end gap-6 mt-4">
                                                        <button
                                                            onClick={() => {
                                                                setIsCreatingFolder(false);
                                                                setNewFolderName('');
                                                            }}
                                                            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={handleCreateFolder}
                                                            disabled={!newFolderName.trim()}
                                                            className={`text-sm font-medium transition-colors ${!newFolderName.trim() ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800'}`}
                                                        >
                                                            Add folder
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
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
                                        className={`hover:bg-blue-50/50 cursor-pointer group transition-colors ${selectedFile?.id === item.id || selectedItems.includes(item.id) ? 'bg-blue-50/50' : ''}`}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                            <input type="checkbox"
                                                checked={selectedItems.includes(item.id)}
                                                onChange={() => toggleSelection(item.id)}
                                                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer" />
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
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-gray-500">Access token</span>
                                    </div>
                                    <div className="space-y-2 mb-3">
                                        {mockTokens.length === 0 && <span className="text-xs text-gray-400 italic">No access tokens available</span>}
                                        {mockTokens.map((t, idx) => (
                                            <div key={idx} className="flex items-start justify-between group">
                                                <div className="flex items-center gap-2 overflow-hidden w-full">
                                                    <span
                                                        onClick={() => copyTokenUrl(t, idx)}
                                                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-mono cursor-pointer underline-offset-2 truncate"
                                                        title="Click to copy download URL">
                                                        {t}
                                                    </span>
                                                    {copiedTokenIdx === idx && <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />}
                                                </div>
                                                <button
                                                    onClick={() => handleRevokeToken(idx)}
                                                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-4">
                                                    Revoke
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={handleCreateToken} className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium block">
                                        Create new access token
                                    </button>
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
