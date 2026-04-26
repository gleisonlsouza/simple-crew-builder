import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Workflow, 
  Settings, 
  Key, 
  Moon, 
  HelpCircle,
  Database
} from 'lucide-react';
import { useStore } from '../store/index';
import logo from '../assets/logo.PNG';
import { useState, useEffect } from 'react';

/**
 * MainSidebar - The global n8n-style vertical navigation bar.
 * Provides access to Workflows, Credentials, Knowledge Base, and Settings.
 */
export function MainSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const setIsSettingsOpen = useStore((state) => state.setIsSettingsOpen);
  const setIsAboutModalOpen = useStore((state) => state.setIsAboutModalOpen);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  
  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setIsSettingsMenuOpen(false);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' || location.pathname.startsWith('/workflow/');
    return location.pathname === path;
  };

  const navItemClass = (path: string) => `
    p-3 rounded-xl transition-all relative group
    ${isActive(path) 
      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm' 
      : 'text-brand-muted hover:text-brand-text hover:bg-brand-card'}
  `;

  return (
    <aside className="w-16 flex flex-col items-center py-6 bg-brand-card border-r border-brand-border z-20 transition-colors duration-300">
      {/* Logo */}
      <div 
        className="w-12 h-12 mb-10 overflow-hidden cursor-pointer group hover:scale-105 transition-transform duration-300" 
        onClick={() => navigate('/')}
        title="Simple Crew Builder"
      >
        <img src={logo} alt="Logo" className="w-full h-full object-contain" />
      </div>
      
      {/* Navigation */}
      <nav className="flex flex-col gap-6">
        <button 
          onClick={() => navigate('/')}
          className={navItemClass('/')}
          title="Workflows"
          aria-label="Workflows"
        >
          <Workflow className="w-6 h-6" />
          {!isActive('/') && (
             <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
               Workflows
             </div>
          )}
        </button>

        <button 
          className={navItemClass('/credentials')}
          title="Credentials"
          aria-label="Credentials"
          disabled
        >
          <Key className="w-6 h-6" />
        </button>

        <button 
          className={navItemClass('/knowledge')}
          title="Knowledge Base"
          aria-label="Knowledge Base"
          disabled
        >
          <Database className="w-6 h-6" />
        </button>

        {/* Settings Toggle */}
        <div className="relative">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsSettingsMenuOpen(!isSettingsMenuOpen);
            }}
            className={navItemClass('/settings')}
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-6 h-6" />
          </button>
          
          {isSettingsMenuOpen && (
            <div className="absolute left-full ml-2 bottom-0 w-48 bg-brand-card border border-brand-border rounded-xl shadow-xl z-[100] py-1 overflow-hidden animate-in slide-in-from-left-2 duration-150">
              <button 
                onClick={() => {
                  navigate('/settings');
                  setIsSettingsMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors text-left"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button 
                onClick={() => {
                  setIsSettingsOpen(true);
                  setIsSettingsMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors text-left"
              >
                <Moon className="w-4 h-4" />
                Theme
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Footer / About */}
      <div className="mt-auto">
        <button 
          onClick={() => setIsAboutModalOpen(true)}
          className="p-3 text-brand-muted hover:text-brand-text hover:bg-brand-bg rounded-xl transition-all group relative"
          title="About Simple Crew"
          aria-label="About"
        >
          <HelpCircle className="w-6 h-6" />
          <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
            About
          </div>
        </button>
      </div>
    </aside>
  );
}
