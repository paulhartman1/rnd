"use client";

type Props = {
  isIOS: boolean;
  callStatus: string;
};

export default function CallStatusBanner({ isIOS, callStatus }: Props) {
  if (callStatus === 'idle' || callStatus === 'disconnected') {
    return null;
  }

  const getMessage = () => {
    if (isIOS) {
      switch (callStatus) {
        case 'connecting':
          return '📞 Calling your phone...';
        case 'ringing':
          return '🔗 Connecting to lead...';
        case 'connected':
          return '✅ Connected - Use your phone to control the call';
        default:
          return '';
      }
    } else {
      switch (callStatus) {
        case 'connecting':
          return '🔄 Connecting...';
        case 'ringing':
          return '📞 Ringing...';
        case 'connected':
          return '✅ Connected';
        default:
          return '';
      }
    }
  };

  const getColor = () => {
    switch (callStatus) {
      case 'connected':
        return 'bg-green-100 border-green-500 text-green-800';
      case 'error':
        return 'bg-red-100 border-red-500 text-red-800';
      default:
        return 'bg-blue-100 border-blue-500 text-blue-800';
    }
  };

  return (
    <div className={`border-2 rounded-lg p-3 ${getColor()}`}>
      <div className="font-medium">{getMessage()}</div>
      {isIOS && callStatus === 'connected' && (
        <div className="text-sm mt-1">
          Hang up from your phone when finished
        </div>
      )}
    </div>
  );
}
