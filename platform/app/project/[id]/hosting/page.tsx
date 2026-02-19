'use client';

import { use } from 'react';
import { Globe } from 'lucide-react';

export default function HostingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
            <div className="bg-blue-50 p-6 rounded-full mb-6">
                <Globe className="h-12 w-12 text-blue-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Suguna Hosting</h1>
            <p className="text-gray-500 max-w-md mb-6">
                Deploy your web apps instantly with global CDN and SSL.
            </p>
            <div className="bg-white p-6 rounded-lg border border-dashed border-gray-300 w-full max-w-lg">
                <p className="text-gray-400">No deployments found for project {id}</p>
                <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Connect GitHub
                </button>
            </div>
        </div>
    );
}
