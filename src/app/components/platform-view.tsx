import { Instagram, Facebook, Twitter, Linkedin, Music, Eye, MousePointer, BarChart3, Calendar as CalendarIcon } from 'lucide-react';
import { platformsData, generateTimeSeriesData, topPosts, aiInsights } from '../data/mock-data';
import { MetricCard } from './metric-card';
import { TrendChart } from './trend-chart';
import { DateRangeSelector } from './date-range-selector';
import { TopPostsTable } from './top-posts-table';
import { InsightCard } from './insight-card';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/auth-context';
import { fetchPlatformAnalytics, AnalyticsData } from '../services/analytics-service';
import { RefreshCw, Activity, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';

type Platform = 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok';

interface PlatformViewProps {
  platform: Platform;
  dateRange: '7d' | '30d' | '90d';
  onDateRangeChange: (range: '7d' | '30d' | '90d') => void;
  onPlatformChange: (platform: Platform) => void;
}

export function PlatformView({ platform, dateRange, onDateRangeChange, onPlatformChange }: PlatformViewProps) {
  const { session } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const platformData = platformsData.find(p => p.platform === platform);
  
  // Fetch platform-specific analytics
  useEffect(() => {
    if (session?.access_token) {
      fetchData();
    }
  }, [platform, session?.access_token]);

  const fetchData = async () => {
    if (!session?.access_token) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchPlatformAnalytics(platform, session.access_token);
      setAnalyticsData(data);
    } catch (err) {
      console.error(`Failed to fetch ${platform} analytics:`, err);
      setError('Failed to load analytics data. Using sample data.');
      // Keep using mock data on error
    } finally {
      setIsLoading(false);
    }
  };

  if (!platformData) return null;

  // Merge real data with platform data
  const displayData = analyticsData && !analyticsData.error ? {
    ...platformData,
    followers: analyticsData.followers || platformData.followers,
    impressions: analyticsData.impressions || platformData.impressions,
    reach: analyticsData.reach || platformData.reach,
    posts: analyticsData.posts || platformData.posts,
    engagements: analyticsData.engagements || platformData.engagements,
    engagementRate: analyticsData.engagementRate || platformData.engagementRate,
  } : platformData;

  const platformIcons = {
    instagram: Instagram,
    facebook: Facebook,
    twitter: Twitter,
    linkedin: Linkedin,
    tiktok: Music,
  };

  const Icon = platformIcons[platform];
  const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
  const timeSeriesData = generateTimeSeriesData(platform, days);
  const platformTopPosts = topPosts.filter(post => post.platform === platform);
  const insights = aiInsights.find(i => i.platform === platform);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${platformData.color}15` }}
          >
            <Icon className="w-8 h-8" style={{ color: platformData.color }} />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">{platformData.name} Analytics</h2>
            <p className="text-gray-600 mt-1">Detailed performance metrics and insights</p>
          </div>
        </div>
        <DateRangeSelector value={dateRange} onChange={onDateRangeChange} />
      </div>

      {/* Platform Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {platformsData.map((p) => {
          const PlatformIcon = platformIcons[p.platform];
          return (
            <button
              key={p.platform}
              onClick={() => onPlatformChange(p.platform)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all whitespace-nowrap ${
                platform === p.platform
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <PlatformIcon className="w-4 h-4" />
              <span className="font-medium">{p.name}</span>
            </button>
          );
        })}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Followers"
          value={displayData.followers.toLocaleString()}
          icon={Icon}
          trend={displayData.followerGrowth}
          color="purple"
        />
        <MetricCard
          title="Impressions"
          value={displayData.impressions.toLocaleString()}
          icon={Eye}
          trend={8.4}
          color="blue"
        />
        <MetricCard
          title="Engagement Rate"
          value={`${displayData.engagementRate}%`}
          icon={BarChart3}
          trend={5.2}
          color="green"
        />
        <MetricCard
          title="Profile Visits"
          value={displayData.profileVisits.toLocaleString()}
          icon={MousePointer}
          trend={12.8}
          color="orange"
        />
      </div>

      {/* AI Insights */}
      {insights && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI-Powered Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.insights.map((insight, index) => (
              <InsightCard key={index} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChart
          title="Follower Growth Over Time"
          data={timeSeriesData}
          dataKey="followers"
          color={platformData.color}
        />
        <TrendChart
          title="Engagement Trends"
          data={timeSeriesData}
          dataKey="engagements"
          color={platformData.color}
        />
        <TrendChart
          title="Impressions Over Time"
          data={timeSeriesData}
          dataKey="impressions"
          color={platformData.color}
        />
        <TrendChart
          title="Reach Over Time"
          data={timeSeriesData}
          dataKey="reach"
          color={platformData.color}
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <CalendarIcon className="w-5 h-5" />
            <span className="font-medium">Content Consistency</span>
          </div>
          <p className="text-3xl font-semibold text-gray-900 mb-1">{displayData.posts}</p>
          <p className="text-sm text-gray-600">Posts in last {days} days</p>
          {displayData.daysInactive > 0 && (
            <p className="text-sm text-orange-600 mt-2">⚠️ {displayData.daysInactive} days since last post</p>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <MousePointer className="w-5 h-5" />
            <span className="font-medium">Link Performance</span>
          </div>
          <p className="text-3xl font-semibold text-gray-900 mb-1">{displayData.linkClicks.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Total link clicks</p>
          <p className="text-sm text-green-600 mt-2">
            {((displayData.linkClicks / displayData.profileVisits) * 100).toFixed(1)}% click-through rate
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <BarChart3 className="w-5 h-5" />
            <span className="font-medium">Total Engagements</span>
          </div>
          <p className="text-3xl font-semibold text-gray-900 mb-1">{displayData.engagements.toLocaleString()}</p>
          <p className="text-sm text-gray-600">Likes, comments, shares</p>
          <p className="text-sm text-gray-500 mt-2">
            Avg. {Math.round(displayData.engagements / displayData.posts)} per post
          </p>
        </div>
      </div>

      {/* Top Posts */}
      {platformTopPosts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Posts</h3>
          <TopPostsTable posts={platformTopPosts} />
        </div>
      )}
    </div>
  );
}