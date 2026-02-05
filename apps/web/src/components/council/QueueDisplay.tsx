'use client';

interface QueueEntry {
  id: string;
  citizenName: string;
  citizenAvatar?: string;
  joinedAt: Date;
  status: 'waiting' | 'active';
}

interface QueueDisplayProps {
  memberName: string;
  queue: QueueEntry[];
  currentCitizenId?: string;
  isOnline: boolean;
  onRaiseHand?: () => void;
  onLeaveQueue?: () => void;
}

export function QueueDisplay({
  memberName,
  queue,
  currentCitizenId,
  isOnline,
  onRaiseHand,
  onLeaveQueue,
}: QueueDisplayProps) {
  const myQueueEntry = queue.find(e => e.id === currentCitizenId);
  const isInQueue = !!myQueueEntry;
  const myPosition = queue.findIndex(e => e.id === currentCitizenId);
  const activeEntry = queue.find(e => e.status === 'active');
  const waitingCount = queue.filter(e => e.status === 'waiting').length;

  return (
    <div className="bg-gray-100 border border-gray-300 rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="font-retro text-xs font-bold text-gray-700">
          Office Hours Queue
        </p>
        <span className={`text-xs px-2 py-0.5 rounded ${
          isOnline ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'
        }`}>
          {isOnline ? 'Open' : 'Closed'}
        </span>
      </div>

      {/* Current speaker */}
      {activeEntry && (
        <div className="bg-white border border-blue-300 rounded p-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-xs text-white">
              {activeEntry.citizenAvatar || '👤'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-retro text-xs font-bold truncate">
                {activeEntry.citizenName}
              </p>
              <p className="font-retro text-[10px] text-blue-600">
                Speaking now
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Queue stats */}
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="font-retro text-gray-600">
          {waitingCount} waiting
        </span>
        {isInQueue && myPosition > 0 && (
          <span className="font-retro text-yellow-700">
            Your position: #{myPosition + 1}
          </span>
        )}
      </div>

      {/* Waiting list (first 3) */}
      {waitingCount > 0 && (
        <div className="space-y-1 mb-3">
          {queue
            .filter(e => e.status === 'waiting')
            .slice(0, 3)
            .map((entry, i) => (
              <div
                key={entry.id}
                className={`flex items-center gap-2 p-1.5 rounded ${
                  entry.id === currentCitizenId
                    ? 'bg-yellow-100 border border-yellow-300'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <span className="font-retro text-[10px] text-gray-400 w-4">
                  #{i + 1}
                </span>
                <div className="w-5 h-5 bg-gray-300 rounded flex items-center justify-center text-[10px]">
                  {entry.citizenAvatar || '👤'}
                </div>
                <span className="font-retro text-[10px] text-gray-700 truncate flex-1">
                  {entry.citizenName}
                  {entry.id === currentCitizenId && ' (You)'}
                </span>
              </div>
            ))}
          {waitingCount > 3 && (
            <p className="font-retro text-[10px] text-gray-500 text-center">
              +{waitingCount - 3} more waiting
            </p>
          )}
        </div>
      )}

      {/* Action button */}
      {isOnline ? (
        isInQueue ? (
          <button
            onClick={onLeaveQueue}
            className="btn-retro w-full text-xs bg-red-100 border-red-300 hover:bg-red-200"
          >
            🚪 Leave Queue
          </button>
        ) : (
          <button
            onClick={onRaiseHand}
            className="btn-retro w-full text-xs"
          >
            🙋 Raise Hand to Speak
          </button>
        )
      ) : (
        <p className="font-retro text-[10px] text-gray-500 text-center">
          {memberName} is offline. Check back during office hours!
        </p>
      )}
    </div>
  );
}
