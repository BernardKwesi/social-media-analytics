import { Instagram, Facebook, Twitter, Linkedin, Music, TrendingUp, Users, Heart, AlertCircle } from 'lucide-react';
import { PlatformData } from '../data/mock-data';

interface PlatformCardProps {
  platform: PlatformData;
  onClick: () => void;
}

export function PlatformCard({ platform, onClick }: PlatformCardProps) {
  const icons = {
    instagram: Instagram,
    facebook: Facebook,
    twitter: Twitter,
    linkedin: Linkedin,
    tiktok: Music,
  };

  const Icon = icons[platform.platform];

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow text-left w-full"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${platform.color}15` }}
          >
            <Icon className="w-5 h-5" style={{ color: platform.color }} />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{platform.name}</h4>
            <p className="text-sm text-gray-500">{platform.posts} posts</p>
          </div>
        </div>
        
        {platform.daysInactive > 0 && (
          <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded">
            <AlertCircle className="w-3 h-3" />
            <span className="text-xs font-medium">{platform.daysInactive}d inactive</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-gray-600 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs">Followers</span>
          </div>
          <p className="font-semibold text-gray-900">{platform.followers.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-green-600" />
            <span className="text-xs text-green-600 font-medium">+{platform.followerGrowth}%</span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-gray-600 mb-1">
            <Heart className="w-4 h-4" />
            <span className="text-xs">Engagement</span>
          </div>
          <p className="font-semibold text-gray-900">{platform.engagementRate}%</p>
          <p className="text-xs text-gray-500 mt-1">{platform.engagements.toLocaleString()} total</p>
        </div>
      </div>
    </button>
  );
}
