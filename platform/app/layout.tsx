import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import AuthWrapper from '@/components/AuthWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  // ... existing metadata ...
  title: 'SugunaBase Console - Manage Your Apps',
  description: 'The official console for SugunaBase to manage your databases, authentication, and storage efficiently.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthWrapper>
          <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <aside className="hidden md:block w-64 border-r bg-gray-50 flex-none h-full overflow-y-auto">
              <Sidebar />
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-gray-100 p-8">
              <div className="max-w-7xl mx-auto space-y-6">
                {children}
              </div>
            </main>
          </div>
        </AuthWrapper>
      </body>
    </html>
  );
}
