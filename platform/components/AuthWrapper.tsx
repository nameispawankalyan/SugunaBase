'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/utils/api';

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const publicPages = ['/', '/login', '/signup'];
            if (publicPages.includes(pathname)) {
                setAuthorized(true);
                setLoading(false);
                return;
            }

            const token = localStorage.getItem('token');
            if (!token) {
                window.location.replace('/login');
                return;
            }

            try {
                // Verify token with /me
                await api.get('/me');
                setAuthorized(true);
            } catch (error) {
                console.error("Auth verification failed", error);
                localStorage.clear();
                window.location.replace('/login');
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, [pathname]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-orange-600 border-r-2 border-transparent"></div>
            </div>
        );
    }

    if (!authorized) return null;

    return <>{children}</>;
}
