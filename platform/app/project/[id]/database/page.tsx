'use client';

import { Plus, MoreVertical, Filter, Search, RefreshCw, X } from 'lucide-react';

export default function DatabasePage() {
    return (
        <div className="flex flex-col h-[calc(100vh-80px)] -m-8">
            {/* Header / Tabs */}
            <div className="bg-white border-b border-gray-200 px-6 pt-6">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl text-gray-700 font-normal">Cloud Firestore</h1>
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
                            <button className="p-1 hover:bg-gray-200 rounded"><RefreshCw className="h-4 w-4 text-gray-600" /></button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <CollectionItem name="users" active />
                        <CollectionItem name="matches" />
                        <CollectionItem name="messages" />
                        <CollectionItem name="reports" />
                        <CollectionItem name="payments" />
                    </div>
                </div>

                {/* Column 2: Documents */}
                <div className="w-[280px] border-r border-gray-200 flex flex-col">
                    <div className="p-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                        <div className="font-medium text-sm text-gray-600">users</div>
                        <button className="p-1 hover:bg-gray-200 rounded"><Filter className="h-4 w-4 text-gray-600" /></button>
                        <button className="p-1 hover:bg-gray-200 rounded ml-auto"><Plus className="h-4 w-4 text-gray-600" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <DocumentItem id="user_raju_123" active />
                        <DocumentItem id="user_sita_456" />
                        <DocumentItem id="user_ravi_789" />
                        <DocumentItem id="user_priya_001" />
                    </div>
                </div>

                {/* Column 3: Fields */}
                <div className="flex-1 flex flex-col bg-white">
                    {/* Document Header */}
                    <div className="p-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between h-[41px]">
                        <div className="text-xs font-mono text-gray-500">
                            /users/user_raju_123
                        </div>
                        <button className="text-gray-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                    </div>

                    {/* Fields List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-0">
                        <FieldRow name="name" type="string" value="Raju" />
                        <FieldRow name="age" type="number" value="24" />
                        <FieldRow name="isVerified" type="boolean" value="true" />
                        <FieldRow name="phone" type="string" value="+91 98765 43210" />
                        <FieldRow name="bio" type="string" value="Movie buff from Hyderabad!" />
                        <FieldRow name="interests" type="array" value="['Movies', 'Travel', 'Food']" />
                        <FieldRow name="location" type="map" value="{ lat: 17.385, lng: 78.486 }" />

                        <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                            <button className="text-sm text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded font-medium flex items-center gap-2">
                                <Plus className="h-4 w-4" /> Add field
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CollectionItem({ name, active }: { name: string, active?: boolean }) {
    return (
        <div className={`px-4 py-2 text-sm cursor-pointer border-l-4 ${active ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium' : 'border-transparent text-gray-700 hover:bg-gray-100'}`}>
            {name}
        </div>
    )
}

function DocumentItem({ id, active }: { id: string, active?: boolean }) {
    return (
        <div className={`px-4 py-2 text-sm font-mono cursor-pointer border-l-4 ${active ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-transparent text-gray-600 hover:bg-gray-100'}`}>
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
