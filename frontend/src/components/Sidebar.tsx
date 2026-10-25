import React from 'react';
import {
  LayoutDashboard,
  FileCheck2,
  FilePlus,
  Bell,
  Settings,
  ShieldCheck
} from 'lucide-react';
import { UserInfo } from '../types';

export type NavView = 'dashboard' | 'applications' | 'intake' | 'notifications' | 'administration';

interface SidebarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  currentUser: UserInfo;
  unreadNotificationsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  currentUser,
  unreadNotificationsCount = 0,
}) => {
  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between shrink-0 shadow-xl border-r border-slate-800">
      <div>
        {/* Brand & AICTE Emblem Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-700 flex items-center justify-center text-white shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="font-extrabold text-base tracking-tight text-white flex items-center space-x-1.5">
              <span>VerifyAI</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 font-semibold px-1.5 py-0.5 rounded border border-blue-400/30">AICTE</span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Approval Scrutiny Portal</p>
          </div>
        </div>

        {/* Primary 4-Item Navigation Menu */}
        <div className="px-3 py-4 space-y-1.5">
          <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Primary Workspace
          </div>

          {/* 1. Dashboard */}
          <button
            onClick={() => onNavigate('dashboard')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'dashboard'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          {/* 2. Approval Applications */}
          <button
            onClick={() => onNavigate('applications')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'applications'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Approval Applications</span>
          </button>

          {/* 3. Application Intake */}
          <button
            onClick={() => onNavigate('intake')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'intake'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FilePlus className="w-4 h-4 text-emerald-400" />
            <span>Application Intake</span>
          </button>

          {/* 4. Notifications */}
          <button
            onClick={() => onNavigate('notifications')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'notifications'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </div>
            {unreadNotificationsCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Area: Secondary Administration & Active User Session */}
      <div className="p-3 border-t border-slate-800/80 space-y-2">
        {/* Secondary Administration Section */}
        <button
          onClick={() => onNavigate('administration')}
          className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
            currentView === 'administration'
              ? 'bg-slate-800 text-amber-300 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Settings className="w-3.5 h-3.5 text-slate-400" />
          <span>Administration & Rules</span>
        </button>

        {/* User Session Info Card */}
        <div className="px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
              {currentUser.full_name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-200 truncate">{currentUser.full_name}</p>
              <p className="text-[10px] text-slate-400 truncate">{currentUser.designation}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
