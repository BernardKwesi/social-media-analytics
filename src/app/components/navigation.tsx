import { NavLink } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, FileText, Target, Shield } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/platform', label: 'Platforms', icon: TrendingUp },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/goals', label: 'Goals', icon: Target },
  { path: '/privacy', label: 'Privacy', icon: Shield },
  { path: '/terms', label: 'Terms', icon: FileText },
];

export function Navigation() {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                    isActive
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
