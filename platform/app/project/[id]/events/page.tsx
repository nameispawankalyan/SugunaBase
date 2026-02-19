'use client';

import { use } from 'react';
import { Zap } from 'lucide-react';

export default function EventsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
            <div className="bg-orange-50 p-6 rounded-full mb-6">
                <Zap className="h-12 w-12 text-orange-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Events</h1>
            <p className="text-gray-500 max-w-md mb-6">
                Stream of all events across your project services.
            </p>
            <div className="w-full max-w-4xl bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-4 bg-gray-50 text-sm font-medium text-gray-500 border-b border-gray-200 text-left">
                    Project ID: {id}
                </div>
                <div className="p-8 text-center text-gray-400">
                    No events recorded yet.
                </div>
            </div>
        </div>
    );
}
