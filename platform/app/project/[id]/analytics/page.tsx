'use client';

import { use } from 'react';
import { BarChart2 } from 'lucide-react';

export default function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
            <div className="bg-green-50 p-6 rounded-full mb-6">
                <BarChart2 className="h-12 w-12 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytics</h1>
            <p className="text-gray-500 max-w-md mb-6">
                Real-time insights for project {id}.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                <div className="bg-white p-6 rounded shadow-sm border border-gray-100">
                    <div className="text-sm text-gray-500 mb-1">Active Users</div>
                    <div className="text-2xl font-bold">0</div>
                </div>
                <div className="bg-white p-6 rounded shadow-sm border border-gray-100">
                    <div className="text-sm text-gray-500 mb-1">Events</div>
                    <div className="text-2xl font-bold">0</div>
                </div>
                <div className="bg-white p-6 rounded shadow-sm border border-gray-100">
                    <div className="text-sm text-gray-500 mb-1">Sessions</div>
                    <div className="text-2xl font-bold">0</div>
                </div>
            </div>
        </div>
    );
}
