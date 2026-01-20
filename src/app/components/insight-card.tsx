import { Lightbulb } from 'lucide-react';

interface InsightCardProps {
  insight: string;
}

export function InsightCard({ insight }: InsightCardProps) {
  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200 p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
          <Lightbulb className="w-4 h-4 text-white" />
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{insight}</p>
      </div>
    </div>
  );
}
