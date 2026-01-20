import { FileText, Download, Share2, Calendar, TrendingUp, Users, Activity } from 'lucide-react';
import { platformsData } from '../data/mock-data';

interface ReportsProps {
  dateRange: '7d' | '30d' | '90d';
}

export function Reports({ dateRange }: ReportsProps) {
  const totalFollowers = platformsData.reduce((sum, p) => sum + p.followers, 0);
  const totalEngagements = platformsData.reduce((sum, p) => sum + p.engagements, 0);
  const totalPosts = platformsData.reduce((sum, p) => sum + p.posts, 0);
  const avgEngagementRate = (platformsData.reduce((sum, p) => sum + p.engagementRate, 0) / platformsData.length).toFixed(2);

  const handleDownloadPDF = () => {
    alert('PDF report would be generated here');
  };

  const handleDownloadCSV = () => {
    alert('CSV export would be generated here');
  };

  const handleShare = () => {
    alert('Shareable report link would be generated here');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Reports & Analytics</h2>
          <p className="text-gray-600 mt-1">Generate and download comprehensive performance reports</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share Report
          </button>
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Report Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Performance Summary</h3>
            <p className="text-sm text-gray-600">
              Report for {dateRange === '7d' ? 'last 7 days' : dateRange === '30d' ? 'last 30 days' : 'last 90 days'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-semibold text-gray-900">{totalFollowers.toLocaleString()}</p>
            <p className="text-sm text-gray-600 mt-1">Total Followers</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Activity className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-semibold text-gray-900">{totalEngagements.toLocaleString()}</p>
            <p className="text-sm text-gray-600 mt-1">Total Engagements</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Calendar className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-semibold text-gray-900">{totalPosts}</p>
            <p className="text-sm text-gray-600 mt-1">Posts Published</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <TrendingUp className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-semibold text-gray-900">{avgEngagementRate}%</p>
            <p className="text-sm text-gray-600 mt-1">Avg. Engagement</p>
          </div>
        </div>
      </div>

      {/* Platform Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Platform Performance Breakdown</h3>
        <div className="space-y-4">
          {platformsData.map((platform) => (
            <div key={platform.platform} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: platform.color }}
                  >
                    {platform.name.charAt(0)}
                  </div>
                  <span className="font-medium text-gray-900">{platform.name}</span>
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Followers</p>
                    <p className="font-semibold text-gray-900">{platform.followers.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Growth</p>
                    <p className="font-semibold text-green-600">+{platform.followerGrowth}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Posts</p>
                    <p className="font-semibold text-gray-900">{platform.posts}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Engagement</p>
                    <p className="font-semibold text-gray-900">{platform.engagementRate}%</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Executive Summary</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs">✓</span>
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-1">Strong Overall Growth</p>
              <p className="text-sm text-gray-700">
                Total follower base grew by 8.2% across all platforms, exceeding the 5% monthly target.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <TrendingUp className="w-3 h-3 text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-1">Top Performing Platform</p>
              <p className="text-sm text-gray-700">
                TikTok showed exceptional growth with 15.7% follower increase and 7.82% engagement rate.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs">!</span>
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-1">Action Needed</p>
              <p className="text-sm text-gray-700">
                Facebook and TikTok have inactive periods. Recommend increasing posting frequency to maintain momentum.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs">★</span>
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-1">Content Strategy Win</p>
              <p className="text-sm text-gray-700">
                Behind-the-scenes and educational content driving 2x higher engagement compared to promotional posts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Report Notes</h3>
        <textarea
          className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          placeholder="Add custom notes or observations to include in the report..."
        />
        <div className="flex justify-end mt-4">
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            Save Notes
          </button>
        </div>
      </div>
    </div>
  );
}
