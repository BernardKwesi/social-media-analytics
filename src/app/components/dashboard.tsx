import { Calendar, TrendingUp, Users, Activity, Link2 } from 'lucide-react';
import { platformsData, topPosts, generateTimeSeriesData } from '../data/mock-data';
import { PlatformCard } from './platform-card';
import { MetricCard } from './metric-card';
import { TrendChart } from './trend-chart';
import { TopPostsTable } from './top-posts-table';
import { DateRangeSelector } from './date-range-selector';
import { useAuth } from '../context/auth-context';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';
import { fetchAllAnalytics, AnalyticsData } from '../services/analytics-service';
import { RefreshCw } from 'lucide-react';

interface DashboardProps {
  dateRange: '7d' | '30d' | '90d';
  onDateRangeChange: (range: '7d' | '30d' | '90d') => void;
  onPlatformSelect: (platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok') => void;
  onManageAccounts?: () => void;
}

export function Dashboard({ dateRange, onDateRangeChange, onPlatformSelect, onManageAccounts }: DashboardProps) {
  const { connectedAccounts, session } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<Record<string, AnalyticsData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch analytics data when component mounts or connected accounts change
  useEffect(() => {
    if (connectedAccounts.length > 0 && session?.access_token) {
      fetchAnalyticsData();
    }
  }, [connectedAccounts, session?.access_token]);

  const fetchAnalyticsData = async () => {
    if (!session?.access_token) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchAllAnalytics(session.access_token);
      setAnalyticsData(data.analytics);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load analytics data. Using sample data.');
      // Keep using mock data on error
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter platforms based on connected accounts and merge with real data
  const activePlatforms = connectedAccounts.length > 0 
    ? platformsData.filter(p => connectedAccounts.includes(p.platform)).map(platform => {
        const realData = analyticsData[platform.platform];
        
        // If we have real data and it's connected, merge it with platform data
        if (realData && realData.connected !== false && !realData.error) {
          return {
            ...platform,
            followers: realData.followers || platform.followers,
            impressions: realData.impressions || platform.impressions,
            reach: realData.reach || platform.reach,
            posts: realData.posts || platform.posts,
            engagements: realData.engagements || platform.engagements,
            engagementRate: realData.engagementRate || platform.engagementRate,
          };
        }
        
        // Otherwise use mock data
        return platform;
      })
    : [];

  // Show empty state if no accounts connected
  if (connectedAccounts.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Overview Dashboard</h2>
            <p className="text-gray-600 mt-1">Track your social media performance across all platforms</p>
          </div>
        </div>

        {/* Empty State */}
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12">
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Link2 className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Social Accounts Connected
            </h3>
            <p className="text-gray-600 mb-6">
              Connect your social media accounts to start tracking your performance metrics, engagement, and growth across all platforms.
            </p>
            <Button 
              onClick={onManageAccounts || (() => window.location.reload())} 
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Link2 className="w-4 h-4 mr-2" />
              Connect Your Accounts
            </Button>
          </div>
        </div>

        {/* Feature Preview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Track Growth</h4>
            <p className="text-sm text-gray-600">
              Monitor follower growth, reach, and impressions across all your social platforms.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Analyze Engagement</h4>
            <p className="text-sm text-gray-600">
              Understand what content resonates with your audience through engagement metrics.
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Generate Reports</h4>
            <p className="text-sm text-gray-600">
              Create comprehensive reports with AI-powered insights and recommendations.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalFollowers = activePlatforms.reduce((sum, p) => sum + p.followers, 0);
  const totalEngagements = activePlatforms.reduce((sum, p) => sum + p.engagements, 0);
  const totalImpressions = activePlatforms.reduce((sum, p) => sum + p.impressions, 0);
  const avgEngagementRate = activePlatforms.length > 0
    ? activePlatforms.reduce((sum, p) => sum + p.engagementRate, 0) / activePlatforms.length
    : 0;

  const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
  
  // Combine time series data from active platforms only
  const combinedData = generateTimeSeriesData('instagram', days).map((item, index) => {
    const combined = { date: item.date, followers: 0, engagements: 0, impressions: 0 };
    
    activePlatforms.forEach(platform => {
      const platformTimeSeries = generateTimeSeriesData(platform.platform, days);
      if (platformTimeSeries[index]) {
        combined.followers += platformTimeSeries[index].followers;
        combined.engagements += platformTimeSeries[index].engagements;
        combined.impressions += platformTimeSeries[index].impressions;
      }
    });
    
    return combined;
  });

  // Filter top posts to only show from connected platforms
  const filteredTopPosts = topPosts.filter(post => 
    connectedAccounts.includes(post.platform)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Overview Dashboard</h2>
          <p className="text-gray-600 mt-1">Track your social media performance across all platforms</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalyticsData}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refreshing...' : 'Refresh Data'}
          </Button>
          <DateRangeSelector value={dateRange} onChange={onDateRangeChange} />
        </div>
      </div>

      {/* Data source info banner */}
      {Object.keys(analyticsData).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Activity className="w-5 h-5 text-blue-600 mt-0.5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 mb-1">
                Live Data Connected
              </h4>
              <p className="text-sm text-blue-700">
                Displaying real-time analytics from your connected social media accounts.
                {error && <span className="block mt-1 text-orange-700">{error}</span>}
              </p>
            </div>
          </div>
        </div>
      )}

      {Object.keys(analyticsData).length === 0 && !isLoading && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-orange-600 mt-0.5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-orange-900 mb-1">
                Sample Data Mode
              </h4>
              <p className="text-sm text-orange-700">
                Configure your API credentials in the OAUTH_SETUP_GUIDE.md to connect and fetch real analytics data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Followers"
          value={totalFollowers.toLocaleString()}
          icon={Users}
          trend={6.8}
          color="purple"
        />
        <MetricCard
          title="Total Engagements"
          value={totalEngagements.toLocaleString()}
          icon={Activity}
          trend={12.3}
          color="blue"
        />
        <MetricCard
          title="Total Impressions"
          value={totalImpressions.toLocaleString()}
          icon={TrendingUp}
          trend={8.7}
          color="green"
        />
        <MetricCard
          title="Avg. Engagement Rate"
          value={`${avgEngagementRate.toFixed(2)}%`}
          icon={Calendar}
          trend={4.2}
          color="orange"
        />
      </div>

      {/* Platform Cards */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activePlatforms.map((platform) => (
            <PlatformCard
              key={platform.platform}
              platform={platform}
              onClick={() => onPlatformSelect(platform.platform)}
            />
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChart
          title="Follower Growth"
          data={combinedData}
          dataKey="followers"
          color="#8b5cf6"
        />
        <TrendChart
          title="Engagement Trends"
          data={combinedData}
          dataKey="engagements"
          color="#3b82f6"
        />
      </div>

      {/* Top Posts */}
      {filteredTopPosts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Content</h3>
          <TopPostsTable posts={filteredTopPosts} />
        </div>
      )}
    </div>
  );
}