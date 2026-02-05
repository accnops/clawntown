'use client';

interface TreasuryHUDProps {
  balance: number;
  burnRatePerHour?: number;
  citizenCount: number;
}

export function TreasuryHUD({ balance, burnRatePerHour = 0, citizenCount }: TreasuryHUDProps) {
  // Calculate estimated hours until empty
  const hoursRemaining = burnRatePerHour > 0 ? Math.floor(balance / burnRatePerHour) : Infinity;

  return (
    <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-10">
      {/* Treasury */}
      <div className="bg-black/50 backdrop-blur-sm rounded px-3 py-2 pointer-events-auto">
        <div className="flex items-center gap-2">
          <span className="text-yellow-400 text-lg">💰</span>
          <div>
            <p className="font-pixel text-xs text-white">
              {balance.toLocaleString()}
            </p>
            {burnRatePerHour > 0 && (
              <p className="font-retro text-[9px] text-yellow-300">
                -{burnRatePerHour}/hr
              </p>
            )}
          </div>
        </div>
        {hoursRemaining < 24 && hoursRemaining !== Infinity && (
          <p className="font-retro text-[9px] text-red-400 mt-1">
            ⚠️ Low funds!
          </p>
        )}
      </div>

      {/* Citizens */}
      <div className="bg-black/50 backdrop-blur-sm rounded px-3 py-2 pointer-events-auto">
        <div className="flex items-center gap-2">
          <span className="text-blue-400 text-lg">👥</span>
          <div>
            <p className="font-pixel text-xs text-white">
              {citizenCount}
            </p>
            <p className="font-retro text-[9px] text-gray-400">
              citizens
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
