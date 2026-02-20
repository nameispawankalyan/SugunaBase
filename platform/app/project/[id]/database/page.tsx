'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/utils/api';
import { Plus, MoreVertical, Filter, Search, RefreshCw, X } from 'lucide-react';

export default function DatabasePage() {
    const params = useParams();
    const projectId = params.id;

    const [collections, setCollections] = useState<string[]>([]);
    const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
    const [documents, setDocuments] = useState<string[]>([]);
    const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
    const [documentData, setDocumentData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Fetch Collections
    const fetchCollections = async () => {
        try {
            const data = await api.get(`/console/projects/${projectId}/firestore/collections`);
            setCollections(data);
            // Don't auto-select if already selected
            if (data.length > 0 && !selectedCollection) {
                // handleCollectionClick(data[0]); // Optional: auto-select first
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (projectId) {
            fetchCollections();
        }
    }, [projectId]);

    const handleCollectionClick = async (name: string) => {
        setLoading(true);
        setSelectedCollection(name);
        setSelectedDocument(null);
        setDocumentData(null);
        try {
            const data = await api.get(`/console/projects/${projectId}/firestore/${name}/documents`);
            setDocuments(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDocumentClick = async (collection: string, docId: string) => {
        setSelectedDocument(docId);
        setDocumentData(null);
        try {
            const data = await api.get(`/console/projects/${projectId}/firestore/${collection}/${docId}`);
            setDocumentData(data);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] -m-8">
            {/* Header / Tabs */}
            <div className="bg-white border-b border-gray-200 px-6 pt-6">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl text-gray-700 font-normal">Suguna Firestore</h1>
                    <div className="flex gap-2">
                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded uppercase tracking-wide">Data</span>
                        <span className="text-xs text-blue-600 hover:underline cursor-pointer">Usage</span>
                    </div>
                </div>
                <div className="flex gap-6 text-sm font-medium text-gray-500">
                    <div className="border-b-2 border-blue-600 text-blue-600 pb-2 cursor-pointer">Data</div>
                    <div className="hover:text-gray-800 pb-2 cursor-pointer">Rules</div>
                    <div className="hover:text-gray-800 pb-2 cursor-pointer">Indexes</div>
                    <div className="hover:text-gray-800 pb-2 cursor-pointer">Usage</div>
                </div>
            </div>

            {/* Main Content Area (3-Column Layout) */}
            <div className="flex flex-1 bg-white overflow-hidden">

                {/* Column 1: Collections */}
                <div className="w-[280px] border-r border-gray-200 flex flex-col">
                    <div className="p-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                        <div className="font-medium text-sm text-gray-600">Root</div>
                        <div className="flex gap-1">
                            <button className="p-1 hover:bg-gray-200 rounded"><Plus className="h-4 w-4 text-gray-600" /></button>
                            <button onClick={fetchCollections} className="p-1 hover:bg-gray-200 rounded"><RefreshCw className="h-4 w-4 text-gray-600" /></button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {collections.map(col => (
                            <CollectionItem
                                key={col}
                                name={col}
                                active={selectedCollection === col}
                                onClick={() => handleCollectionClick(col)}
                            />
                        ))}
                        {collections.length === 0 && <div className="p-4 text-sm text-gray-400">No collections found</div>}
                    </div>
                </div>

                {/* Column 2: Documents */}
                <div className="w-[280px] border-r border-gray-200 flex flex-col">
                    <div className="p-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                        <div className="font-medium text-sm text-gray-600 truncate">{selectedCollection || 'Collections'}</div>
                        <button className="p-1 hover:bg-gray-200 rounded ml-auto text-gray-400"><Plus className="h-4 w-4" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {documents.map(docId => (
                            <DocumentItem
                                key={docId}
                                id={docId}
                                active={selectedDocument === docId}
                                onClick={() => handleDocumentClick(selectedCollection!, docId)}
                            />
                        ))}
                        {selectedCollection && documents.length === 0 && !loading && (
                            <div className="p-4 text-sm text-gray-400">No documents</div>
                        )}
                        {!selectedCollection && (
                            <div className="p-4 text-sm text-gray-400">Select a collection</div>
                        )}
                    </div>
                </div>

                {/* Column 3: Fields */}
                <div className="flex-1 flex flex-col bg-white">
                    {/* Document Header */}
                    <div className="p-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between h-[41px]">
                        <div className="text-xs font-mono text-gray-500 truncate">
                            {selectedCollection && selectedDocument ? `/${selectedCollection}/${selectedDocument}` : 'Selection'}
                        </div>
                        <button className="text-gray-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                    </div>

                    {/* Fields List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-0">
                        {documentData ? Object.entries(documentData).map(([key, value]) => (
                            <FieldRow
                                key={key}
                                name={key}
                                type={typeof value}
                                value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            />
                        )) : (
                            <div className="text-center mt-20 text-gray-400">
                                <Search className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                <p>Select a document to view data</p>
                            </div>
                        )}

                        {documentData && (
                            <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                                <button className="text-sm text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded font-medium flex items-center gap-2">
                                    <Plus className="h-4 w-4" /> Add field
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function CollectionItem({ name, active, onClick }: { name: string, active?: boolean, onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className={`px-4 py-2 text-sm cursor-pointer border-l-4 ${active ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium' : 'border-transparent text-gray-700 hover:bg-gray-100'}`}>
            {name}
        </div>
    )
}

function DocumentItem({ id, active, onClick }: { id: string, active?: boolean, onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className={`px-4 py-2 text-sm font-mono cursor-pointer border-l-4 ${active ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-transparent text-gray-600 hover:bg-gray-100'}`}>
            {id}
        </div>
    )
}

function FieldRow({ name, type, value }: { name: string, type: string, value: string }) {
    return (
        <div className="flex border-b border-gray-100 py-2 hover:bg-gray-50 group">
            <div className="w-1/3 pl-2 text-sm font-medium text-gray-700">{name}</div>
            <div className="w-1/6 text-xs text-gray-400 italic pt-0.5">{type}</div>
            <div className="flex-1 font-mono text-sm text-gray-600 truncate pr-2 relative">
                <span className={type === 'string' ? 'text-green-700' : type === 'number' ? 'text-blue-600' : type === 'boolean' ? 'text-purple-600' : ''}>{value}</span>
                <div className="absolute right-2 top-0 hidden group-hover:flex bg-white shadow-sm border rounded">
                    <button className="p-1 hover:bg-gray-100"><MoreVertical className="h-3 w-3 text-gray-500" /></button>
                </div>
            </div>
        </div>
    )
}

