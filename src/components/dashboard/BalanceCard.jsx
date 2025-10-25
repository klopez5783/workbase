import { TrendingUp } from 'lucide-react';

export default function BalanceCard({ amount = 5420, trend = 12.5 }) {
  return (
    <div className="mx-5 mt-4 p-6 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg">
      <div className="text-sm opacity-90 mb-2">Weekly Revenue</div>
      <div className="text-5xl font-bold tracking-tight mb-3">
        ${amount.toLocaleString()}
      </div>
      <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full text-sm">
        <TrendingUp size={25} />
        <span>+{trend}%</span>
      </div>
    </div>
  );
}