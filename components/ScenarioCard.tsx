import React from 'react';
import { TestScenario } from '../types';
import { Play, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  scenario: TestScenario;
  onSelect: (s: TestScenario) => void;
  isActive: boolean;
  lastResult?: boolean | null;
}

export const ScenarioCard: React.FC<Props> = ({ scenario, onSelect, isActive, lastResult }) => {
  return (
    <div 
      onClick={() => onSelect(scenario)}
      className={`
        p-4 rounded-lg cursor-pointer border transition-all duration-200
        ${isActive 
          ? 'bg-blue-900/20 border-blue-500 shadow-md shadow-blue-900/10' 
          : 'bg-gray-800 border-gray-700 hover:border-gray-500 hover:bg-gray-750'
        }
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
            scenario.standard.includes('E9') ? 'bg-purple-900 text-purple-200' : 'bg-emerald-900 text-emerald-200'
          }`}>
            {scenario.standard.split(' ')[0]}
          </span>
          <h3 className="font-semibold text-gray-100">{scenario.title}</h3>
        </div>
        {lastResult !== undefined && lastResult !== null && (
             lastResult ? <CheckCircle size={16} className="text-green-500" /> : <AlertCircle size={16} className="text-red-500" />
        )}
      </div>
      <p className="text-sm text-gray-400 mb-4 line-clamp-2">
        {scenario.description}
      </p>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <FileText size={12} /> {scenario.steps.length} Steps
        </span>
        <button 
          className={`p-1.5 rounded-full ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
        >
          <Play size={14} fill="currentColor" />
        </button>
      </div>
    </div>
  );
};