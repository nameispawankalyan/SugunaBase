'use client';

import { UploadCloud, Folder, File, Image as ImageIcon, MoreVertical, Search, Grid } from 'lucide-react';

export default function StoragePage() {
    const files = [
        { name: 'profile_pics', type: 'folder', items: '1.2k items', size: '-' },
        { name: 'chat_images', type: 'folder', items: '45k items', size: '-' },
        { name: 'verification_docs', type: 'folder', items: '320 items', size: '-' },
        { name: 'splash_screen.png', type: 'image', items: '-', size: '1.2 MB' },
        { name: 'terms_v2.pdf', type: 'file', items: '-', size: '450 KB' },
    ];

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
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Size/Items</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {files.map((file) => (
                            <tr key={file.name} className="hover:bg-gray-50/50 cursor-pointer group">
                                <td className="whitespace-nowrap px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        {file.type === 'folder' ? <Folder className="h-5 w-5 text-blue-500 fill-blue-100" /> :
                                            file.type === 'image' ? <ImageIcon className="h-5 w-5 text-purple-500" /> :
                                                <File className="h-5 w-5 text-gray-400" />
                                        }
                                        <span className="text-sm font-medium text-gray-900 group-hover:text-orange-600 transition-colors">{file.name}</span>
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{file.type === 'folder' ? file.items : file.size}</td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${file.type === 'folder' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {file.type}
                                    </span>
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
