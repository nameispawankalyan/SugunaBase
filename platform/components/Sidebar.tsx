'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import {
  LayoutDashboard,
  Users,
  Database,
  HardDrive,
  Settings,
  MoreVertical,
  LogOut,
  ChevronDown,
  Home,
  FileCode,
  Zap,
  BarChart2,
  Globe,
  ArrowLeft,
  PhoneCall
} from 'lucide-react';

const Sidebar = () => {
  const pathname = usePathname();
  const params = useParams();
  const projectId = params?.id as string; // Get Project ID from URL

  const [projectName, setProjectName] = useState('Loading...');

  // HIDE SIDEBAR ON PUBLIC PAGES
  if (pathname === '/' || pathname === '/login' || pathname === '/signup') {
    return null;
  }

  // Fetch Project Name when inside a project
  useEffect(() => {
    if (projectId) {
      const fetchProjectName = async () => {
        try {
          const data = await api.get(`/projects/${projectId}`);
          setProjectName(data.name);
        } catch (error) {
          console.error("Failed to fetch project name", error);
          setProjectName("Unknown Project");
        }
      };
      fetchProjectName();
    }
  }, [projectId]);

  // --- VIEW: DASHBOARD (All Projects) ---
  if (!projectId) {
    return (
      <div className="flex h-screen flex-col bg-[#051e34] text-[#a2b5c8] w-[260px] flex-shrink-0 text-[14px]">
        {/* Main Header */}
        <div className="h-[60px] flex items-center px-4 border-b border-[#1d3348] text-white">
          <div className="flex items-center gap-3 w-full">
            <div className="h-6 w-6 rounded bg-orange-600 flex items-center justify-center text-[10px] font-bold text-white">
              S
            </div>
            <span className="font-medium truncate flex-1">Suguna Console</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-2">
          <nav>
            <Link
              href="/console"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors ${pathname === '/console' ? 'bg-[#1a3752] text-[#4fc3f7] font-medium' : 'hover:bg-[#1a3449] hover:text-white'}`}
            >
              <LayoutDashboard className="h-5 w-5" />
              All Projects
            </Link>
          </nav>
        </div>

        <div className="p-4 border-t border-[#1d3348]">
          <p className="text-xs text-[#526f8b] uppercase font-bold tracking-wider mb-2">Workspace</p>
          <div className="text-sm text-gray-400">Ram Charan</div>
        </div>
      </div>
    );
  }

  // --- VIEW: INSIDE PROJECT ---
  return (
    <div className="flex h-screen flex-col bg-[#051e34] text-[#a2b5c8] w-[260px] flex-shrink-0 text-[14px]">
      {/* Project Header */}
      <div className="h-[60px] flex items-center px-4 border-b border-[#1d3348] text-white hover:bg-[#1a3449] cursor-pointer transition">
        <div className="flex items-center gap-3 w-full">
          <div className="h-6 w-6 rounded bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white">
            P
          </div>
          <span className="font-medium truncate flex-1">{projectName}</span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6">

        {/* Back Link */}
        <nav>
          <Link
            href="/console"
            className="flex items-center gap-3 px-4 py-2 rounded-md hover:bg-[#1a3449] hover:text-white mb-4 text-[#a2b5c8]"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Projects
          </Link>

          <Link
            href={`/project/${projectId}`}
            className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${pathname === `/project/${projectId}` ? 'bg-[#1a3752] text-[#4fc3f7] font-medium' : 'hover:bg-[#1a3449] hover:text-white'}`}
          >
            <Home className="h-5 w-5" />
            Overview
          </Link>
        </nav>

        {/* Build Section */}
        <div>
          <div className="px-4 text-[11px] font-bold uppercase tracking-wider mb-2 text-[#68859e]">
            Build
          </div>
          <nav className="space-y-0.5">
            <NavItem href={`/project/${projectId}/auth`} icon={Users} label="Authentication" pathname={pathname} />
            <NavItem href={`/project/${projectId}/database`} icon={Database} label="Suguna Firestore" pathname={pathname} />
            <NavItem href={`/project/${projectId}/storage`} icon={HardDrive} label="Storage" pathname={pathname} />
            <NavItem href={`/project/${projectId}/hosting`} icon={Globe} label="Hosting" pathname={pathname} />
            <NavItem href={`/project/${projectId}/functions`} icon={FileCode} label="Functions" pathname={pathname} />
            <NavItem href={`/project/${projectId}/calling`} icon={PhoneCall} label="Suguna Calling" pathname={pathname} />
          </nav>
        </div>

        {/* Analytics Section */}
        <div>
          <div className="px-4 text-[11px] font-bold uppercase tracking-wider mb-2 text-[#68859e]">
            Analytics
          </div>
          <nav className="space-y-0.5">
            <NavItem href={`/project/${projectId}/analytics`} icon={BarChart2} label="Dashboard" pathname={pathname} />
            <NavItem href={`/project/${projectId}/events`} icon={Zap} label="Events" pathname={pathname} />
          </nav>
        </div>

      </div>

      {/* Footer / Settings */}
      <div className="p-2 border-t border-[#1d3348]">
        <Link
          href={`/project/${projectId}/settings`}
          className="flex items-center gap-3 px-4 py-2 hover:bg-[#1a3449] hover:text-white rounded-md transition-colors"
        >
          <Settings className="h-5 w-5" />
          Project Settings
        </Link>
      </div>
    </div>
  );
};

const NavItem = ({ href, icon: Icon, label, pathname }: { href: string; icon: any; label: string; pathname: string }) => {
  const isActive = pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${isActive
        ? 'bg-[#1a3752] text-[#4fc3f7] font-medium'
        : 'hover:bg-[#1a3449] hover:text-white'
        }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
};

export default Sidebar;
