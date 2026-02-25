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
  PhoneCall,
  Bell,
  Activity,
  FileText
} from 'lucide-react';

const Sidebar = () => {
  const pathname = usePathname();
  const params = useParams();
  const projectId = params?.id as string; // Get Project ID from URL

  const [fullUser, setFullUser] = useState<any>(null);
  const [projectIdHuman, setProjectIdHuman] = useState('');
  const [projectName, setProjectName] = useState('Loading...');
  const [isAdmin, setIsAdmin] = useState(false);

  // Check role and fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.get('/me');
        setFullUser(data);
        setIsAdmin(data.role === 'admin');
      } catch (e) {
        // Fallback to localStorage if /me fails
        let user = { role: 'developer' };
        try {
          user = JSON.parse(localStorage.getItem('user') || '{}');
        } catch (err) { }
        setFullUser(user);
        setIsAdmin(user.role === 'admin');
      }
    };
    fetchProfile();
  }, []);

  // HIDE SIDEBAR ON PUBLIC PAGES
  if (pathname === '/' || pathname === '/login' || pathname === '/signup') {
    return null;
  }

  // Fetch Project Name when inside a project
  useEffect(() => {
    if (projectId) {
      const fetchProjectDetails = async () => {
        try {
          const data = await api.get(`/projects/${projectId}`);
          setProjectName(data.name);
          setProjectIdHuman(data.project_id || projectId);
        } catch (error) {
          console.error("Failed to fetch project details", error);
          setProjectName("Unknown Project");
        }
      };
      fetchProjectDetails();
    }
  }, [projectId]);

  // --- VIEW: DASHBOARD (All Projects) ---
  if (!projectId) {
    return (
      <div className="flex h-screen flex-col bg-[#051e34] text-[#a2b5c8] w-[260px] flex-shrink-0 text-[14px]">
        {/* Main Header */}
        <div className="h-[60px] flex items-center px-4 border-b border-[#1d3348] text-white">
          <div className="flex items-center gap-3 w-full">
            <div className="h-6 w-6 rounded bg-orange-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-orange-600/20">
              S
            </div>
            <span className="font-bold truncate flex-1 tracking-tight">Suguna Console</span>
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

        <div className="p-4 border-t border-[#1d3348] bg-[#041626]">
          <p className="text-[10px] text-[#526f8b] uppercase font-black tracking-widest mb-3">My Identity</p>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-xs uppercase">
              {fullUser?.name?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold truncate text-xs">{fullUser?.name || 'User'}</p>
              <p className="text-[9px] text-[#4fc3f7] font-black uppercase tracking-tighter truncate">{fullUser?.developer_id || 'ID Pending'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW: INSIDE PROJECT ---
  return (
    <div className="flex h-screen flex-col bg-[#051e34] text-[#a2b5c8] w-[260px] flex-shrink-0 text-[14px]">
      {/* Project Header */}
      <div className="h-[75px] flex items-center px-4 border-b border-[#1d3348] text-white hover:bg-[#1a3449] cursor-pointer transition">
        <div className="flex items-center gap-3 w-full">
          <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center text-[12px] font-bold text-white shadow-lg shadow-blue-500/20">
            {projectName?.[0] || 'P'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate leading-tight text-[15px]">{projectName}</p>
            <p className="text-[10px] text-[#4fc3f7] font-black uppercase tracking-widest mt-0.5 truncate">{projectIdHuman}</p>
          </div>
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
            <NavItem href={`/project/${projectId}/cast`} icon={PhoneCall} label="Suguna Cast" pathname={pathname} />
            <NavItem href={`/project/${projectId}/messaging`} icon={Bell} label="Cloud Messaging" pathname={pathname} />
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

        {/* Monitoring Section (Admin Only) */}
        {isAdmin && (
          <div>
            <div className="px-4 text-[11px] font-bold uppercase tracking-wider mb-2 text-[#68859e]">
              Monitoring
            </div>
            <nav className="space-y-0.5">
              <NavItem href={`/project/${projectId}/health`} icon={Activity} label="System Status" pathname={pathname} />
              <NavItem href={`/project/${projectId}/logs`} icon={FileText} label="Real-time Logs" pathname={pathname} />
            </nav>
          </div>
        )}

      </div>

      {/* Footer / User Identity */}
      <div className="p-4 border-t border-[#1d3348] bg-[#041626]">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-xs uppercase shadow-lg shadow-blue-500/20">
            {fullUser?.name?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold truncate text-xs">{fullUser?.name || 'User'}</p>
            <p className="text-[9px] text-[#4fc3f7] font-black uppercase tracking-tighter truncate">{fullUser?.developer_id || 'ID Pending'}</p>
          </div>
          <Link href={`/project/${projectId}/settings`} title="Project Settings">
            <Settings className="h-4 w-4 text-gray-500 hover:text-white transition-colors" />
          </Link>
        </div>
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
