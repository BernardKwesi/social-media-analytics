import { Calendar } from 'lucide-react';

interface DateRangeSelectorProps {
  value: '7d' | '30d' | '90d';
  onChange: (value: '7d' | '30d' | '90d') => void;
}

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const options = [
    { value: '7d' as const, label: 'Last 7 days' },
    { value: '30d' as const, label: 'Last 30 days' },
    { value: '90d' as const, label: 'Last 90 days' },
  ];

  return (
    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
      <Calendar className="w-4 h-4 text-gray-500 ml-2" />
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            value === option.value
              ? 'bg-purple-500 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
