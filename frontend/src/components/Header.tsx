import React from 'react';
import { ShieldCheck, User } from 'lucide-react';
import { UserInfo } from '../types';

interface HeaderProps {
  pageTitle: string;
  currentUser: UserInfo;
  availableUsers?: UserInfo[];
  onSwitchUser?: (user: UserInfo) => void;
}

export const Header: React.FC<HeaderProps> = ({
  pageTitle,
  currentUser,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm shrink-0">
      <div className="flex items-center space-x-3">
        <h1 className="text-lg font-bold text-slate-800 tracking-tight">{pageTitle}</h1>
        <span className="hidden lg:inline-flex items-center space-x-1.5 bg-slate-100 text-slate-600 text-[11px] px-2.5 py-0.5 rounded border border-slate-200">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
          <span>All India Council for Technical Education</span>
        </span>
      </div>

      <div className="flex items-center space-x-3">
        {/* Authorised AICTE Official Session Badge */}
        <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200/80 rounded-lg px-3 py-1.5 shadow-xs">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-bold text-blue-950">AICTE Official</span>
          <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold border border-blue-200">
            Authorised Scrutiny Session
          </span>
        </div>

        {/* User Avatar */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-800 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            AO
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-tight">AICTE Official</p>
            <p className="text-[10px] text-slate-500">Dr. V. Sharma (Scrutiny Officer)</p>
          </div>
        </div>
      </div>
    </header>
  );
};

