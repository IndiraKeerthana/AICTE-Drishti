import React from 'react';
import { ShieldCheck, User, Users } from 'lucide-react';
import { UserInfo } from '../types';

interface HeaderProps {
  pageTitle: string;
  currentUser: UserInfo;
  availableUsers: UserInfo[];
  onSwitchUser: (user: UserInfo) => void;
}

export const Header: React.FC<HeaderProps> = ({
  pageTitle,
  currentUser,
  availableUsers,
  onSwitchUser,
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
        {/* Active Session & Role Switcher */}
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
          <Users className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px] text-slate-500 font-medium">Session:</span>
          <select
            value={currentUser.username}
            onChange={(e) => {
              const u = availableUsers.find(user => user.username === e.target.value);
              if (u) onSwitchUser(u);
            }}
            className="text-xs font-semibold bg-transparent border-none text-slate-800 focus:outline-none cursor-pointer"
          >
            {availableUsers.map((u) => (
              <option key={u.username} value={u.username}>
                {u.full_name} ({u.role})
              </option>
            ))}
          </select>
        </div>

        {/* User Avatar */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            {currentUser.full_name?.charAt(0) || 'U'}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-tight">{currentUser.full_name}</p>
            <p className="text-[10px] text-slate-500">{currentUser.designation}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
