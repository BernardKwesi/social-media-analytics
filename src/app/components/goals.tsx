import { Target, Plus, TrendingUp, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useState } from 'react';
import { goals as initialGoals, platformsData } from '../data/mock-data';

export function Goals() {
  const [goals, setGoals] = useState(initialGoals);
  const [showAddGoal, setShowAddGoal] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'exceeded':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'behind':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      default:
        return <Clock className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'exceeded':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'behind':
        return 'bg-orange-50 border-orange-200 text-orange-700';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-700';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'exceeded':
        return 'bg-green-500';
      case 'behind':
        return 'bg-orange-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Goal Tracking</h2>
          <p className="text-gray-600 mt-1">Monitor progress toward your social media objectives</p>
        </div>
        <button
          onClick={() => setShowAddGoal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Goal
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">
                {goals.filter(g => g.status === 'exceeded').length}
              </p>
              <p className="text-sm text-gray-600">Exceeded Goals</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">
                {goals.filter(g => g.status === 'on-track').length}
              </p>
              <p className="text-sm text-gray-600">On Track</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">
                {goals.filter(g => g.status === 'behind').length}
              </p>
              <p className="text-sm text-gray-600">Needs Attention</p>
            </div>
          </div>
        </div>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {goals.map((goal) => {
          const platform = platformsData.find(p => p.platform === goal.platform);
          const progress = Math.min((goal.current / goal.target) * 100, 100);

          return (
            <div key={goal.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  {platform && (
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold flex-shrink-0"
                      style={{ backgroundColor: platform.color }}
                    >
                      {platform.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{goal.metric}</h4>
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm text-gray-600 capitalize">{platform?.name}</span>
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm text-gray-600 capitalize">{goal.period}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">Current:</span>{' '}
                        <span className="text-gray-900 font-semibold">
                          {goal.metric === 'Follower Growth' || goal.metric === 'Engagement Rate'
                            ? `${goal.current}%`
                            : goal.current.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Target:</span>{' '}
                        <span className="text-gray-900 font-semibold">
                          {goal.metric === 'Follower Growth' || goal.metric === 'Engagement Rate'
                            ? `${goal.target}%`
                            : goal.target.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mb-2">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${getProgressColor(goal.status)}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{progress.toFixed(0)}% of target achieved</p>
                    </div>
                  </div>
                </div>

                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getStatusColor(goal.status)}`}>
                  {getStatusIcon(goal.status)}
                  <span className="text-sm font-medium capitalize">{goal.status.replace('-', ' ')}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Goal Modal */}
      {showAddGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Add New Goal</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option>Instagram</option>
                  <option>Facebook</option>
                  <option>X (Twitter)</option>
                  <option>LinkedIn</option>
                  <option>TikTok</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Metric</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option>Follower Growth (%)</option>
                  <option>Engagement Rate (%)</option>
                  <option>Post Frequency</option>
                  <option>Impressions</option>
                  <option>Link Clicks</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Value</label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddGoal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert('Goal would be saved here');
                  setShowAddGoal(false);
                }}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Add Goal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
