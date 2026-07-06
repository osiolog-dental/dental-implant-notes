import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocale, COUNTRIES } from '../contexts/LocaleContext';
import { House, Users, ChartLine, Buildings, SignOut, ClockCounterClockwise, MagnifyingGlass, UserCircle, GearSix, CloudArrowUp, Crown } from '@phosphor-icons/react';
import AdBanner from './AdBanner';
import ExternalAdBanner from './ExternalAdBanner';
import AIChatBox from './AIChatBox';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';

/* Country picker popover — shown next to OSIOLOG logo on mobile */
function CountryPicker() {
  const { country, selectCountry } = useLocale();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.currency.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <button
        data-testid="country-picker-btn"
        onClick={() => { setOpen(o => !o); setSearch(''); }}
        className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[#F0F0EE] transition-colors text-xl leading-none"
        title={`${country.name} · ${country.currency}`}
      >
        <span>{country.flag}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-10 z-50 w-64 bg-white rounded-xl border border-[#E5E5E2] shadow-lg overflow-hidden">
          <div className="p-2 border-b border-[#E5E5E2]">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search country…"
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-[#E5E5E2] focus:outline-none focus:ring-1 focus:ring-[#82A098]"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.map(c => (
              <button
                key={c.code}
                data-testid={`country-option-${c.code}`}
                onClick={() => { selectCountry(c); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-[#F9F9F8] transition-colors ${
                  country.code === c.code ? 'bg-[#F0F5F4] font-medium' : ''
                }`}
              >
                <span className="text-lg">{c.flag}</span>
                <span className="flex-1 text-[#2A2F35]">{c.name}</span>
                <span className="text-xs text-[#5C6773] font-mono">{c.symbol.trim()}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-sm text-[#9CA3AF]">No countries found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: House },
    { path: '/patients', label: 'Patients', icon: Users },
    { path: '/analytics', label: 'Analytics', icon: ChartLine },
    { path: '/clinics', label: 'Clinics', icon: Buildings },
    { path: '/backup', label: 'Backup', icon: CloudArrowUp },
    { path: '/subscription', label: 'Subscription', icon: Crown },
  ];

  const footerItems = [
    { path: '/', label: 'Cases', icon: House },
    { path: '/patients', label: 'Patients', icon: Users },
    { path: '/analytics', label: 'Timeline', icon: ClockCounterClockwise },
    { path: '/clinics', label: 'Search', icon: MagnifyingGlass }
  ];

  const rawName = user?.name || 'Doctor';
  const displayName = rawName.startsWith('Dr.') || rawName.startsWith('Dr ') ? rawName : `Dr. ${rawName}`;
  const initials = rawName
    .replace(/^Dr\.?\s*/i, '')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <div className="min-h-screen bg-[#F9F9F8] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#F0F0EE] border-r border-[#E5E5E2] hidden md:flex md:flex-col relative">
        <div className="p-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-[#2A2F35] tracking-tight">OSIOLOG</h1>
            <CountryPicker />
          </div>
          <p className="text-xs text-[#5C6773] mt-1">Dental Implant Management System</p>
        </div>
        
        <nav className="px-3 mt-6 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors duration-200 ${
                  isActive
                    ? 'bg-white text-[#2A2F35] shadow-sm'
                    : 'text-[#5C6773] hover:bg-white/50'
                }`}
              >
                <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 bg-white border-b border-[#E5E5E2] flex items-center justify-between px-4 md:px-6 shrink-0 z-40" data-testid="top-header">
          <div className="md:hidden flex items-center gap-2">
            <h1 className="text-lg font-semibold text-[#2A2F35] tracking-tight">OSIOLOG</h1>
            <CountryPicker />
          </div>
          <div className="hidden md:block" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#F0F0EE] transition-colors duration-150 outline-none" data-testid="profile-menu-trigger">
                <span className="text-sm font-medium text-[#2A2F35] hidden sm:block max-w-[160px] truncate">
                  {displayName}
                </span>
                <Avatar className="h-8 w-8">
                  {user?.profile_picture && (
                    <AvatarImage src={user.profile_picture} alt={user?.name} />
                  )}
                  <AvatarFallback className="bg-[#82A098] text-white text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-[#2A2F35]">{displayName}</p>
                  <p className="text-xs text-[#5C6773] truncate">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                data-testid="account-menu-item"
                className="cursor-pointer gap-2"
                onClick={() => navigate('/account')}
              >
                <UserCircle size={16} weight="regular" />
                My Account
              </DropdownMenuItem>
              <DropdownMenuItem
                data-testid="settings-menu-item"
                className="cursor-pointer gap-2"
                onClick={() => navigate('/account')}
              >
                <GearSix size={16} weight="regular" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                data-testid="logout-menu-item"
                className="cursor-pointer gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                onClick={handleLogout}
              >
                <SignOut size={16} weight="regular" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Ad Banner */}
        <AdBanner onNavigate={(path) => navigate(path)} />

        {/* Page Content */}
        <main className="flex-1 overflow-auto pb-20 md:pb-4 flex flex-col">
          <div className="flex-1">
            <Outlet />
          </div>
          <ExternalAdBanner />
        </main>
      </div>

      {/* AI Chat */}
      <AIChatBox />

      {/* Bottom Navigation - Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E5E2] md:hidden z-50">
        <div className="flex items-center justify-around px-2 py-3">
          {footerItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`footer-nav-${item.label.toLowerCase()}`}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'text-[#3B82F6]'
                    : 'text-[#5C6773]'
                }`}
              >
                <Icon size={24} weight={isActive ? 'fill' : 'regular'} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;