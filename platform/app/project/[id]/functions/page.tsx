'use client';

import { use } from 'react';
import { FileCode } from 'lucide-react';

export default function FunctionsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
            <div className="bg-purple-50 p-6 rounded-full mb-6">
                <FileCode className="h-12 w-12 text-purple-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Suguna Functions</h1>
            <p className="text-gray-500 max-w-md mb-6">
                Run backend logic without managing servers.
            </p>
            <div className="bg-white p-8 rounded-lg border border-dashed border-gray-300 w-full max-w-lg">
                <p className="text-gray-400">No functions deployed for project {id}</p>
                <button className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                    Create Function
                </button>
            </div>
        </div>
    );
}
