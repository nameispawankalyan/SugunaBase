'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Database, Shield, Zap, Code, Terminal, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      router.push('/console');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Navbar */}
      <nav className="border-b border-slate-800 backdrop-blur-md sticky top-0 z-50 bg-slate-900/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-orange-600 rounded-lg flex items-center justify-center font-bold text-white">S</div>
            <span className="text-xl font-bold tracking-tight">SugunaBase</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Products</a>
            <a href="#docs" className="hover:text-white transition-colors">Docs</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <Link
                href="/console"
                className="text-sm font-medium text-slate-300 hover:text-white px-3 py-2"
              >
                Go to Console
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-slate-300 hover:text-white px-3 py-2"
              >
                Sign In
              </Link>
            )}

            <Link
              href={isLoggedIn ? "/console" : "/signup"}
              className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2"
            >
              {isLoggedIn ? 'Console' : 'Get Started'} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
          <div className="absolute top-20 left-20 w-72 h-72 bg-orange-600/20 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700 text-sm text-slate-300 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
            <span>SugunaBase 2.0 is now live</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
            Build apps <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">fast</span>, without managing infrastructure.
          </h1>

          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            SugunaBase gives you the tools to develop high-quality apps, grow your user base, and earn more money. All from a single, easy-to-use platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={isLoggedIn ? "/console" : "/signup"}
              className="w-full sm:w-auto px-8 py-4 bg-white text-slate-900 rounded-full font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
            >
              Get Started <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/docs"
              className="w-full sm:w-auto px-8 py-4 bg-slate-800/50 border border-slate-700 hover:bg-slate-800 text-white rounded-full font-bold transition-all flex items-center justify-center gap-2"
            >
              <Terminal className="h-5 w-5" /> View Documentation
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-slate-900 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything you need to build apps</h2>
            <p className="text-slate-400">Products that work great individually, but even better together.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Database className="h-8 w-8 text-orange-400" />}
              title="Realtime Database"
              desc="Store and sync data efficiently in realtime across all your clients."
            />
            <FeatureCard
              icon={<Shield className="h-8 w-8 text-blue-400" />}
              title="Authentication"
              desc="Secure user sign-ins with email, Google, and more with zero friction."
            />
            <FeatureCard
              icon={<Globe className="h-8 w-8 text-green-400" />}
              title="Hosting"
              desc="Deploy fast-loading, secure web apps and static content with ease."
            />
            <FeatureCard
              icon={<Code className="h-8 w-8 text-purple-400" />}
              title="Cloud Functions"
              desc="Run backend code without managing servers. Scale automatically."
            />
            <FeatureCard
              icon={<Zap className="h-8 w-8 text-yellow-400" />}
              title="Analytics"
              desc="Get insights into user behavior and app performance."
            />
            <FeatureCard
              icon={<Terminal className="h-8 w-8 text-slate-400" />}
              title="CLI Tools"
              desc="Manage your projects and deploy from your command line."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-slate-800 rounded flex items-center justify-center text-xs font-bold text-white">S</div>
            <span className="font-bold text-slate-300">SugunaBase</span>
          </div>
          <p className="text-slate-500 text-sm">© 2026 SugunaBase Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="p-8 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{desc}</p>
    </div>
  )
}
