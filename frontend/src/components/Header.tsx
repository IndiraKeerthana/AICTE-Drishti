import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, ChevronDown, Check } from 'lucide-react';
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
  availableUsers = [],
  onSwitchUser,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  const officerDisplayName = currentUser.role === 'OFFICER' || currentUser.username === 'officer1'
    ? 'Officer'
    : (currentUser.full_name || 'Officer');

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm shrink-0 relative z-20">
      <div className="flex items-center space-x-3">
        <h1 className="text-lg font-bold text-slate-800 tracking-tight">{pageTitle}</h1>
        <span className="hidden lg:inline-flex items-center space-x-1.5 bg-slate-100 text-slate-600 text-[11px] px-2.5 py-0.5 rounded border border-slate-200">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
          <span>All India Council for Technical Education</span>
        </span>
      </div>

      <div className="flex items-center space-x-3">
        {/* Authorised Officer Session Badge */}
        <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200/80 rounded-lg px-3 py-1.5 shadow-xs">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-bold text-blue-950">Officer</span>
          <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold border border-blue-200">
            Authorised Scrutiny Session
          </span>
        </div>

        {/* User Profile & Profile Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
            className="flex items-center space-x-2 pl-2 border-l border-slate-200 hover:opacity-90 transition-opacity cursor-pointer text-left"
            aria-haspopup="true"
            aria-expanded={isProfileMenuOpen}
          >
            <div className="w-8 h-8 rounded-full bg-blue-800 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              O
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight">
                {officerDisplayName}
              </p>
              <p className="text-[10px] text-slate-500">
                {currentUser.designation || 'Scrutiny Officer'}
              </p>
            </div>
            {availableUsers.length > 0 && onSwitchUser && (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            )}
          </button>

          {/* Profile Menu Dropdown */}
          {isProfileMenuOpen && availableUsers.length > 0 && onSwitchUser && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-slate-800 animate-in fade-in slide-in-from-top-1">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Signed in as</p>
                <p className="text-sm font-bold text-slate-900 truncate">{officerDisplayName}</p>
                <p className="text-[11px] text-slate-500 truncate">{currentUser.designation || 'Scrutiny Officer'}</p>
              </div>

              <div className="p-1 space-y-0.5">
                <p className="px-3 pt-2 pb-1 text-[10px] uppercase font-bold text-slate-400">Switch Identity</p>
                {availableUsers.map((user) => {
                  const isSelected = user.username === currentUser.username;
                  const itemDisplayName = user.role === 'OFFICER' || user.username === 'officer1'
                    ? 'Officer'
                    : user.full_name;

                  return (
                    <button
                      key={user.username}
                      type="button"
                      onClick={() => {
                        onSwitchUser(user);
                        setIsProfileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 text-blue-900 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{itemDisplayName}</p>
                        <p className="text-[10px] text-slate-500 truncate">{user.designation}</p>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

