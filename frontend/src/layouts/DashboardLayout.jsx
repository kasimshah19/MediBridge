import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Logo from '../common/Logo';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#F0FDFA] to-[#F0F9FF]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200/80 bg-white/70 backdrop-blur-sm px-6 flex items-center justify-between">
          <div className="md:hidden">
            <Logo size="sm" />
          </div>
          <div className="text-xs font-semibold text-text-muted">MediBridge Management Workspace</div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

