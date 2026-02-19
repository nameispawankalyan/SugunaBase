import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SugunaBase Console - Manage Your Apps',
  description: 'The official console for SugunaBase to manage your databases, authentication, and storage efficiently.',
  keywords: ['SugunaBase', 'Console', 'Appwrite', 'Backend', 'Database Management', 'suguna.co'],
  authors: [{ name: 'Pawan Kalyan', url: 'https://suguna.co' }],
  openGraph: {
    title: 'SugunaBase Console',
    description: 'Manage your apps with SugunaBase.',
    url: 'https://suguna.co',
    siteName: 'SugunaBase',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
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
      </body>
    </html>
  );
}
