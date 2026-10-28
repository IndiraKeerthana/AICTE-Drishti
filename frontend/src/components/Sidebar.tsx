import React from 'react';
import {
  LayoutDashboard,
  FileCheck2,
  CheckCircle2,
  FilePlus,
  BookOpen,
  Settings,
  ShieldCheck
} from 'lucide-react';
import { UserInfo } from '../types';

export type NavView =
  | 'dashboard'
  | 'applications'
  | 'ready_for_approval'
  | 'intake'
  | 'request_types'
  | 'administration';

interface SidebarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  currentUser: UserInfo;
}

interface NavItemConfig {
  id: NavView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
}

const PRIMARY_NAV_ITEMS: NavItemConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'applications', label: 'All Applications', icon: FileCheck2 },
  { id: 'ready_for_approval', label: 'Ready for Approval', icon: CheckCircle2, iconColor: 'text-emerald-400' },
  { id: 'intake', label: 'Application Intake', icon: FilePlus, iconColor: 'text-sky-400' },
  { id: 'request_types', label: 'Request Types & Documentation', icon: BookOpen, iconColor: 'text-amber-400' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  currentUser,
}) => {
  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between shrink-0 shadow-xl border-r border-slate-800">
      <div>
        {/* Brand & AICTE Emblem Header */}
        <div className="px-4 py-4 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-700 flex items-center justify-center text-white shadow-md shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-base tracking-tight text-white flex items-center">
              <span className="truncate">AICTE-Drishti</span>
            </div>
            <p className="text-xs text-slate-400 font-medium truncate">Scrutiny & Approval System</p>
          </div>
        </div>

        {/* Primary Navigation Menu */}
        <div className="px-3 py-4 space-y-1.5">
          <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Primary Navigation
          </div>

          {PRIMARY_NAV_ITEMS.map((item) => {
            const isSelected = currentView === item.id;
            const IconComponent = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium leading-5 text-left transition-colors min-h-[42px] cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <IconComponent
                  className={`w-4 h-4 shrink-0 self-start mt-0.5 ${item.iconColor || ''}`}
                />
                <span className="flex-1 min-w-0">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Area: Secondary Administration & Active Officer Session */}
      <div className="p-3 border-t border-slate-800/80 space-y-2">
        {/* Secondary Administration Section */}
        <button
          type="button"
          onClick={() => onNavigate('administration')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium leading-5 text-left transition-colors min-h-[42px] cursor-pointer ${
            currentView === 'administration'
              ? 'bg-slate-800 text-amber-300 border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Settings className="w-4 h-4 shrink-0 self-start mt-0.5 text-slate-400" />
          <span className="flex-1 min-w-0">Administration</span>
        </button>

        {/* User Session Info Card */}
        <div className="px-3 py-2.5 bg-slate-800/50 rounded-lg border border-slate-800 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
            O
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-200 truncate">
              {currentUser.full_name || 'Officer'}
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              {currentUser.designation || 'Scrutiny & Approval Officer'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
