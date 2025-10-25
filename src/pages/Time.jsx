import ClockInButton from '../features/timeTracking/components/ClockInButton';

export default function Time() {
  return (
    <div className="p-5 space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Clock In/Out</h2>
        <ClockInButton />
      </div>
    </div>
  );
}