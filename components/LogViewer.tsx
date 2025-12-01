import React, { useEffect, useRef } from 'react';
import { LogEntry, MessageDirection } from '../types';

interface Props {
  logs: LogEntry[];
}

const formatSML = (jsonBody: any): string => {
  try {
    return JSON.stringify(jsonBody, null, 2)
      .replace(/"([^"]+)":/g, '$1:') // Remove quotes from keys for SML look-alike
      .replace(/[\{\}]/g, '') // Rough approximation of removing braces for SML style (List)
      .trim();
  } catch (e) {
    return String(jsonBody);
  }
};

export const LogViewer: React.FC<Props> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-gray-900 border border-gray-800 rounded-lg overflow-hidden font-mono text-sm shadow-inner">
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center sticky top-0 z-10">
        <span className="font-semibold text-gray-300">Transaction Logs</span>
        <span className="text-xs text-gray-500">{logs.length} messages</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {logs.length === 0 && (
          <div className="text-center text-gray-600 mt-10 italic">No communication traffic detected.</div>
        )}
        
        {logs.map((log) => (
          <div key={log.id} className="group animate-in fade-in duration-300">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-gray-500 text-xs">
                [{log.timestamp.toLocaleTimeString([], { hour12: false })}.{log.timestamp.getMilliseconds().toString().padStart(3, '0')}]
              </span>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                log.direction === MessageDirection.HOST_TO_EQP ? 'bg-green-900/50 text-green-400' :
                log.direction === MessageDirection.EQP_TO_HOST ? 'bg-blue-900/50 text-blue-400' :
                log.direction === MessageDirection.ERROR ? 'bg-red-900/50 text-red-400' : 'bg-gray-700 text-gray-300'
              }`}>
                {log.direction}
              </span>
              <span className="text-gray-200 font-semibold">{log.summary}</span>
            </div>
            {log.detail && (
              <div className="pl-24 text-gray-400 whitespace-pre-wrap text-xs border-l-2 border-gray-800 ml-3 py-1">
                {formatSML(JSON.parse(log.detail))}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};