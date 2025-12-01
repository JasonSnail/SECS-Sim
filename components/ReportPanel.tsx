import React, { useState } from 'react';
import { LogEntry, TestResult } from '../types';
import { generateTestReport } from '../services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Loader2, BrainCircuit, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  logs: LogEntry[];
  results: TestResult[];
}

export const ReportPanel: React.FC<Props> = ({ logs, results }) => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  
  const data = [
    { name: 'Passed', value: passedCount },
    { name: 'Failed', value: failedCount },
  ];
  
  const COLORS = ['#10B981', '#EF4444'];

  const handleGenerateAI = async () => {
    setLoading(true);
    try {
      const result = await generateTestReport(logs, results);
      setReport(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto pr-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stats Card */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Test Execution Summary</h3>
          <div className="h-48 w-full">
            {results.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                    itemStyle={{ color: '#f3f4f6' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            ) : (
                <div className="flex items-center justify-center h-full text-gray-500">No tests run yet.</div>
            )}
          </div>
        </div>

        {/* History List */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 max-h-[300px] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Execution History</h3>
          <div className="space-y-3">
            {results.map((r, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-gray-900 rounded border border-gray-800">
                <span className="text-sm font-medium text-gray-300">{r.scenarioId}</span>
                {r.passed ? (
                  <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle2 size={12} /> PASS</span>
                ) : (
                  <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle size={12} /> FAIL</span>
                )}
              </div>
            ))}
             {results.length === 0 && <div className="text-gray-500 text-sm">No history available.</div>}
          </div>
        </div>
      </div>

      {/* AI Report Section */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 min-h-[300px]">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <BrainCircuit className="text-purple-400" />
            <h3 className="text-lg font-semibold text-gray-200">AI Analysis Report</h3>
          </div>
          <button 
            onClick={handleGenerateAI}
            disabled={loading || logs.length === 0}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : 'Analyze Logs with Gemini'}
          </button>
        </div>

        {report ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
              <h4 className="text-purple-300 font-medium mb-2">Executive Summary</h4>
              <p className="text-gray-300 text-sm leading-relaxed">{report.summary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-red-900/10 p-4 rounded-lg border border-red-900/30">
                  <h4 className="text-red-300 font-medium mb-2">Detected Anomalies</h4>
                  <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                    {report.anomalies?.map((a: string, i: number) => (
                        <li key={i}>{a}</li>
                    ))}
                  </ul>
               </div>
               <div className="bg-emerald-900/10 p-4 rounded-lg border border-emerald-900/30">
                  <h4 className="text-emerald-300 font-medium mb-2">Recommendations</h4>
                  <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                    {report.recommendations?.map((r: string, i: number) => (
                        <li key={i}>{r}</li>
                    ))}
                  </ul>
               </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-gray-600 border-2 border-dashed border-gray-800 rounded-lg">
             <BrainCircuit size={48} className="mb-2 opacity-20" />
             <p>Run tests and click analyze to generate an E9/E142 compliance report.</p>
          </div>
        )}
      </div>
    </div>
  );
};