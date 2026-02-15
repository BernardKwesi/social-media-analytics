import { useState } from 'react';
import { AuthProvider, useAuth } from './context/auth-context';
import { Login } from './components/auth/login';
import { Signup } from './components/auth/signup';
import { ConnectAccounts } from './components/onboarding/connect-accounts';
import { Dashboard } from './components/dashboard';
import { PlatformView } from './components/platform-view';
import { Reports } from './components/reports';
import { Goals } from './components/goals';
import { Header } from './components/header';
import { Navigation } from './components/navigation';
import { ProfileSettings } from './components/profile-settings';
import { projectId, publicAnonKey } from '@utils/supabase/info';

// Add global window function for emergency logout
if (typeof window !== 'undefined') {
  (window as any).emergencyLogout = () => {
    localStorage.clear();
    window.location.reload();
  };
  console.log('💡 Tip: Type emergencyLogout() in console to force logout');
}

type View = 'dashboard' | 'platform' | 'reports' | 'goals';
type Platform = 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok';

function AppContent() {
  const auth = useAuth();
  
  // Safety check for hot reload
  if (!auth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }
  
  const { user, loading, accessToken, login, signup, logout, connectedAccounts, setConnectedAccounts } = auth;
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => {
    // Check localStorage for onboarding completion status
    const completed = localStorage.getItem('onboarding_completed') === 'true';
    console.log('📋 Onboarding completed status from localStorage:', completed);
    return completed;
  });
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('instagram');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Debug log when user/loading state changes
  if (user) {
    console.log('👤 User is logged in:', user.email);
    console.log('📊 Connected accounts:', connectedAccounts);
    console.log('🎓 Show onboarding:', showOnboarding);
    console.log('✅ Has completed onboarding:', hasCompletedOnboarding);
  }

  const handlePlatformSelect = (platform: Platform) => {
    setSelectedPlatform(platform);
    setCurrentView('platform');
  };

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
    // Check after login completes - connectedAccounts will be updated by auth context
  };

  const handleSignup = async (name: string, email: string, password: string) => {
    await signup(name, email, password);
    setShowOnboarding(true);
  };

  const handleOnboardingComplete = async (accounts: string[]) => {
    if (accounts.length > 0 && accessToken) {
      // Save connected accounts to backend
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/server/connect-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ connectedAccounts: accounts }),
      });

      if (response.ok) {
        setConnectedAccounts(accounts);
      }
    }
    // Mark onboarding as completed and hide it
    setHasCompletedOnboarding(true);
    setShowOnboarding(false);
    // Save onboarding completion status to localStorage
    localStorage.setItem('onboarding_completed', 'true');
  };

  const handleManageAccounts = () => {
    setShowOnboarding(true);
  };

  // Auto-show onboarding only if user just signed up or logged in for the first time
  // Don't auto-show if user already completed onboarding (even if they skipped)
  if (user && !loading && connectedAccounts.length === 0 && !showOnboarding && !hasCompletedOnboarding) {
    // Only show onboarding once after login/signup
    setShowOnboarding(true);
    setHasCompletedOnboarding(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (authMode === 'login') {
      return <Login onLogin={handleLogin} onSwitchToSignup={() => setAuthMode('signup')} />;
    } else {
      return <Signup onSignup={handleSignup} onSwitchToLogin={() => setAuthMode('login')} />;
    }
  }

  if (showOnboarding) {
    return <ConnectAccounts onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onManageAccounts={handleManageAccounts} 
        onOpenProfile={() => setShowProfileSettings(true)}
      />
      <Navigation 
        currentView={currentView} 
        onViewChange={setCurrentView}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'dashboard' && (
          <Dashboard 
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onPlatformSelect={handlePlatformSelect}
            onManageAccounts={handleManageAccounts}
          />
        )}
        
        {currentView === 'platform' && (
          <PlatformView 
            platform={selectedPlatform}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onPlatformChange={setSelectedPlatform}
          />
        )}
        
        {currentView === 'reports' && (
          <Reports dateRange={dateRange} />
        )}
        
        {currentView === 'goals' && (
          <Goals />
        )}
      </main>

      {/* Profile Settings Modal */}
      {showProfileSettings && (
        <ProfileSettings onClose={() => setShowProfileSettings(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}