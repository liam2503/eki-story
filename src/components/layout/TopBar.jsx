export default function TopBar({ streak = 0, alerts = 0 }) {
  return (
    <div className="w-[90%] sm:w-3/4 bg-white flex items-center justify-center px-5 shadow-md fixed top-5 left-1/2 -translate-x-1/2 rounded-full py-2 z-20">
      <div className="flex items-center space-x-2 sm:space-x-4">
        <span className="text-sm sm:text-base font-bold text-white rounded-full px-3 sm:px-5 py-1 sm:py-2 bg-[#ff6f00]">
          Streak: {streak}d
        </span>
        <span className="text-sm sm:text-base font-bold text-white rounded-full px-3 sm:px-5 py-1 sm:py-2 bg-green-500">
          Alerts: {alerts}
        </span>
      </div>
    </div>
  );
}
