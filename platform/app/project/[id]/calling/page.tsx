'use client';

import { useState, use } from 'react';
import { PhoneCall, Key, ShieldCheck, Eye, EyeOff, RefreshCw, Copy, Check } from 'lucide-react';

export default function SugunaCallingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [isEnabled, setIsEnabled] = useState(false);
    const [showSecret, setShowSecret] = useState(false);
    const [copiedKey, setCopiedKey] = useState(false);
    const [copiedSecret, setCopiedSecret] = useState(false);

    // Mock Keys (In real app, fetch from API)
    const apiKey = `sg_live_${id}_kIy7z...`;
    const apiSecret = `sk_live_${id}_98f2a...`;

    const copyToClipboard = (text: string, isSecret: boolean) => {
        navigator.clipboard.writeText(text);
        if (isSecret) {
            setCopiedSecret(true);
            setTimeout(() => setCopiedSecret(false), 2000);
        } else {
            setCopiedKey(true);
            setTimeout(() => setCopiedKey(false), 2000);
        }
    };

    if (!isEnabled) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="bg-blue-50 p-6 rounded-full mb-6">
                    <PhoneCall className="h-16 w-16 text-blue-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Enable Suguna Calling</h1>
                <p className="text-gray-500 max-w-md mb-8">
                    Add real-time voice and video capabilities to your application.
                    Generate API keys to start making calls securely.
                </p>
                <button
                    onClick={() => setIsEnabled(true)}
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform hover:scale-105"
                >
                    Enable Service
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <PhoneCall className="h-6 w-6 text-blue-600" />
                        Suguna Calling
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage API credentials for voice services.</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 text-xs font-bold uppercase tracking-wider rounded-full border border-green-100">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                    Active
                </div>
            </div>

            {/* Credentials Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-gray-500" />
                        Production Credentials
                    </h3>
                    <button className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" /> Rotate Keys
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* API Key */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Public API Key</label>
                        <div className="flex gap-2">
                            <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-mono text-gray-600">
                                {apiKey}
                            </code>
                            <button
                                onClick={() => copyToClipboard(apiKey, false)}
                                className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                                title="Copy API Key"
                            >
                                {copiedKey ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Safe to use in your client-side code (Android/Web/iOS).</p>
                    </div>

                    {/* API Secret */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Secret Key</label>
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <code className="block w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-mono text-gray-600">
                                    {showSecret ? apiSecret : 'sk_live_•••••••••••••••••••••••••••••'}
                                </code>
                            </div>
                            <button
                                onClick={() => setShowSecret(!showSecret)}
                                className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                                title={showSecret ? "Hide Secret" : "Show Secret"}
                            >
                                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                            <button
                                onClick={() => copyToClipboard(apiSecret, true)}
                                className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                                title="Copy Secret Key"
                            >
                                {copiedSecret ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-red-500 mt-1 font-medium">Never share this key! Use only on your backend server.</p>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
                    <span>Created on Feb 19, 2026</span>
                    <span className="font-mono">ID: {id}_creds</span>
                </div>
            </div>

            {/* Documentation Link */}
            <div className="bg-blue-50 rounded-lg p-5 border border-blue-100 flex items-start gap-4">
                <div className="p-2 bg-white rounded-lg border border-blue-100 shadow-sm">
                    <Key className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                    <h4 className="font-medium text-blue-900 mb-1">Integration Guide</h4>
                    <p className="text-sm text-blue-700 mb-3">
                        Learn how to authenticate requests using these keys in your application.
                    </p>
                    <a href="/docs/android" className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
                        View Android SDK Docs →
                    </a>
                </div>
            </div>
        </div>
    );
}
