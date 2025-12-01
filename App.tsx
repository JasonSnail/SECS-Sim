import React, { useState, useCallback, useEffect } from 'react';
import { TEST_SCENARIOS, MOCK_RESPONSES } from './constants';
import { TestScenario, LogEntry, MessageDirection, TestResult, ParameterType, ScenarioParameter } from './types';
import { ScenarioCard } from './components/ScenarioCard';
import { LogViewer } from './components/LogViewer';
import { ReportPanel } from './components/ReportPanel';
import { Activity, Server, FileBarChart2, Zap, Play, RotateCcw, Sliders, Clock, Info, AlertTriangle, Download, Upload } from 'lucide-react';

// Simple UUID generator since we can't install uuid package in this strict prompt environment easily
// overriding the import above
const generateId = () => Math.random().toString(36).substr(2, 9);

function App() {
  const [activeTab, setActiveTab] = useState<'scenarios' | 'reports'>('scenarios');
  const [scenarios, setScenarios] = useState<TestScenario[]>(TEST_SCENARIOS);
  const [selectedScenario, setSelectedScenario] = useState<TestScenario | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [runningStep, setRunningStep] = useState<number | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Initialize parameters when scenario is selected
  useEffect(() => {
    if (selectedScenario?.parameters) {
      const defaults = selectedScenario.parameters.reduce((acc, p) => ({ ...acc, [p.key]: p.defaultValue }), {});
      setParamValues(defaults);
      setValidationErrors({});
    } else {
      setParamValues({});
      setValidationErrors({});
    }
  }, [selectedScenario]);

  // Validation Logic
  const validateParameter = (param: ScenarioParameter, value: string): string | null => {
    if (!value && value !== '0') return "Value is required";

    if (param.type === ParameterType.NUMBER) {
      const num = Number(value);
      if (isNaN(num)) return "Must be a number";
      if (param.min !== undefined && num < param.min) return `Min value: ${param.min}`;
      if (param.max !== undefined && num > param.max) return `Max value: ${param.max}`;
    }

    return null;
  };

  const handleParamChange = (param: ScenarioParameter, value: string) => {
    setParamValues(prev => ({ ...prev, [param.key]: value }));
    
    // Validate on change
    const error = validateParameter(param, value);
    setValidationErrors(prev => {
      const next = { ...prev };
      if (error) {
        next[param.key] = error;
      } else {
        delete next[param.key];
      }
      return next;
    });
  };

  // Helper to add logs
  const addLog = useCallback((direction: MessageDirection, summary: string, detail: any, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, {
      id: generateId(),
      timestamp: new Date(),
      direction,
      summary,
      detail: JSON.stringify(detail),
      type
    }]);
  }, []);

  // Simulator Logic
  const runScenario = async (scenario: TestScenario) => {
    if (runningStep !== null) return; // Prevent double click

    // Final Validation Check
    if (Object.keys(validationErrors).length > 0) {
        addLog(MessageDirection.ERROR, "Execution Blocked: Fix invalid parameters.", validationErrors, 'error');
        return;
    }

    setRunningStep(0);
    addLog(MessageDirection.INFO, `Starting Scenario: ${scenario.title}`, {}, 'info');

    let allPassed = true;

    // Helper to resolve parameters in body
    const resolveBody = (body: any) => {
      if (!body) return body;
      let str = JSON.stringify(body);
      Object.entries(paramValues).forEach(([key, val]) => {
          str = str.replace(new RegExp(`{{${key}}}`, 'g'), String(val));
      });
      // Attempt to fix JSON types for numbers after substitution if necessary
      // This is a simple replacer, in a real app, we'd traverse the object safely.
      return JSON.parse(str);
    };

    for (let i = 0; i < scenario.steps.length; i++) {
      setRunningStep(i);
      const step = scenario.steps[i];

      // 1. Host Sends Message with Resolved Parameters
      const msg = step.messageToSend;
      let msgBody;
      try {
        msgBody = resolveBody(msg.body);
      } catch (e) {
        addLog(MessageDirection.ERROR, `Failed to parse message body for ${step.name}`, { error: String(e) }, 'error');
        allPassed = false;
        break;
      }

      const sxfy = `S${msg.stream}F${msg.function}`;
      addLog(MessageDirection.HOST_TO_EQP, `${sxfy} ${msg.name} ${msg.waitBit ? '[W]' : ''}`, msgBody, 'info');

      // Setup Timeout and Delay
      const timeoutMs = step.timeout ?? 10000; // Default 10s
      const simulateDelayMs = step.simulateDelay ?? 600;

      // Check for T3 Timeout Condition (Simulated)
      if (msg.waitBit && simulateDelayMs > timeoutMs) {
         // Simulate waiting until timeout
         await new Promise(r => setTimeout(r, timeoutMs));
         addLog(MessageDirection.ERROR, `T3 Timeout: No response received within ${timeoutMs}ms (Simulated Delay: ${simulateDelayMs}ms)`, {}, 'error');
         allPassed = false;
         // In a real scenario, we might abort, but for testing we can continue to next step or break.
         // Here we treat it as a step failure and move on or break. 
         // Let's continue to let other steps run if possible, but mark scenario as failed.
         // Add artificial pause
         await new Promise(r => setTimeout(r, 500));
         continue;
      }

      // Normal Simulated Delay
      await new Promise(r => setTimeout(r, simulateDelayMs));

      // 2. Equipment Responds (Mock Logic)
      // Calculate expected response ID
      const expectedResponse = step.expectedResponseSxFy;
      
      if (expectedResponse && MOCK_RESPONSES[expectedResponse]) {
         addLog(MessageDirection.EQP_TO_HOST, `${expectedResponse} Response`, MOCK_RESPONSES[expectedResponse], 'success');
      } else if (expectedResponse) {
         // Fallback mock
         addLog(MessageDirection.EQP_TO_HOST, `${expectedResponse} Ack`, { "ACK": 0 }, 'success');
      } else {
         // No response expected defined in mock, but we already handled timeout above.
         // If we are here, it means we technically "received" something or just finished waiting.
         // If waitBit was true but no mock response, it's a different kind of error (missing mock data).
         if (msg.waitBit) {
             addLog(MessageDirection.ERROR, `No Mock Response defined for ${sxfy}`, {}, 'error');
             allPassed = false;
         }
      }
      
      // Artificial pause between steps
      await new Promise(r => setTimeout(r, 800));
    }

    setRunningStep(null);
    
    // Save Result
    const result: TestResult = {
        scenarioId: scenario.title,
        timestamp: new Date(),
        passed: allPassed,
        notes: allPassed ? "All steps completed successfully." : "Scenario failed due to errors or timeouts."
    };
    
    setResults(prev => [result, ...prev]);
    addLog(MessageDirection.INFO, `Scenario Complete: ${allPassed ? 'PASSED' : 'FAILED'}`, {}, allPassed ? 'success' : 'error');
  };

  const clearLogs = () => {
      setLogs([]);
      setResults([]);
  };

  // Import / Export Handlers
  const handleExportScenarios = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(scenarios, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "secs_scenarios.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    addLog(MessageDirection.INFO, "Scenarios exported successfully.", {}, 'success');
  };

  const handleImportScenarios = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileObj = event.target.files && event.target.files[0];
    if (!fileObj) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result;
        if (typeof json === 'string') {
          const imported = JSON.parse(json);
          if (Array.isArray(imported)) {
             setScenarios(imported);
             setSelectedScenario(null);
             addLog(MessageDirection.INFO, `Imported ${imported.length} scenarios successfully.`, {}, 'success');
          } else {
             addLog(MessageDirection.ERROR, "Import failed: Invalid JSON format. Expected an array.", {}, 'error');
          }
        }
      } catch (err) {
        addLog(MessageDirection.ERROR, "Import failed: Could not parse JSON.", { error: String(err) }, 'error');
      }
    };
    reader.readAsText(fileObj);
    event.target.value = '';
  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Server size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">SECS-Sim</h1>
            <p className="text-xs text-gray-500">Host Emulator v1.0</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('scenarios')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'scenarios' ? 'bg-blue-900/30 text-blue-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
            }`}
          >
            <Activity size={18} />
            Test Scenarios
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'reports' ? 'bg-blue-900/30 text-blue-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
            }`}
          >
            <FileBarChart2 size={18} />
            Reports & Analysis
          </button>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-2 text-xs text-green-500 bg-green-900/10 px-3 py-2 rounded border border-green-900/30">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            Connected: 127.0.0.1:5000
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between px-6 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-gray-200">
            {activeTab === 'scenarios' ? 'Scenario Execution' : 'Test Reports'}
          </h2>
          <div className="flex gap-3">
            <button 
                onClick={clearLogs}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors" 
                title="Clear Session"
            >
                <RotateCcw size={18} />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden p-6">
          {activeTab === 'scenarios' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
              
              {/* Left Column: List with Toolbar */}
              <div className="lg:col-span-4 flex flex-col h-full">
                {/* Tools */}
                <div className="flex gap-2 mb-4 shrink-0">
                     <button
                        onClick={handleExportScenarios}
                        className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 py-2 rounded-lg text-sm transition-colors"
                     >
                        <Download size={14} /> Export
                     </button>
                     <label className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 py-2 rounded-lg text-sm transition-colors cursor-pointer">
                        <Upload size={14} /> Import
                        <input type="file" accept=".json" onChange={handleImportScenarios} className="hidden" />
                     </label>
                </div>

                <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">
                  {scenarios.map((scenario) => {
                      const lastResult = results.find(r => r.scenarioId === scenario.title)?.passed;
                      return (
                          <ScenarioCard 
                          key={scenario.id} 
                          scenario={scenario} 
                          isActive={selectedScenario?.id === scenario.id}
                          onSelect={setSelectedScenario}
                          lastResult={lastResult}
                          />
                      );
                  })}
                </div>
              </div>

              {/* Middle/Right: Execution & Logs */}
              <div className="lg:col-span-8 flex flex-col gap-4 h-full">
                {selectedScenario ? (
                  <>
                    {/* Active Scenario Controls */}
                    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-sm flex flex-col gap-4 shrink-0">
                      <div className="flex justify-between items-start">
                        <div>
                           <h3 className="text-xl font-bold text-white mb-1">{selectedScenario.title}</h3>
                           <p className="text-gray-400 text-sm">{selectedScenario.description}</p>
                        </div>
                        <button 
                          onClick={() => runScenario(selectedScenario)}
                          disabled={runningStep !== null || Object.keys(validationErrors).length > 0}
                          className={`
                            flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-lg
                            ${runningStep !== null || Object.keys(validationErrors).length > 0
                              ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                              : 'bg-blue-600 hover:bg-blue-500 text-white hover:shadow-blue-500/20'
                            }
                          `}
                        >
                           {runningStep !== null ? <Loader /> : <Play size={16} fill="currentColor" />}
                           {runningStep !== null ? 'Running...' : 'Execute Scenario'}
                        </button>
                      </div>

                      {/* Parameter Inputs */}
                      {selectedScenario.parameters && selectedScenario.parameters.length > 0 && (
                        <div className="mt-4 bg-gray-900/50 p-4 rounded border border-gray-700/50">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Sliders size={12} /> Command Parameters
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {selectedScenario.parameters.map(param => (
                                    <div key={param.key} className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5">
                                            <label className="text-xs text-blue-300 font-medium">{param.label}</label>
                                            {/* Tooltip Icon & Popup */}
                                            <div className="group/tooltip relative">
                                                <Info size={12} className="text-gray-500 hover:text-blue-400 cursor-help transition-colors" />
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-gray-950 border border-gray-700 rounded-md shadow-xl text-xs opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50">
                                                    <p className="text-gray-200 mb-1.5 leading-snug">{param.description}</p>
                                                    <div className="text-[10px] text-gray-500 bg-gray-900/50 border border-gray-800 rounded px-1.5 py-0.5 inline-block font-mono">
                                                        Default: {param.defaultValue}
                                                    </div>
                                                    {param.type === ParameterType.NUMBER && (
                                                        <div className="mt-1 text-[10px] text-gray-400">
                                                            Range: {param.min ?? '-'} to {param.max ?? '-'}
                                                        </div>
                                                    )}
                                                    {/* Arrow */}
                                                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-gray-700"></div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {param.type === ParameterType.ENUM && param.options ? (
                                             <select
                                                value={paramValues[param.key] || ''}
                                                onChange={(e) => handleParamChange(param, e.target.value)}
                                                className={`bg-gray-800 border rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none transition-colors ${
                                                    validationErrors[param.key] ? 'border-red-500' : 'border-gray-600'
                                                }`}
                                             >
                                                {param.options.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                             </select>
                                        ) : (
                                            <input 
                                                type={param.type === ParameterType.NUMBER ? "number" : "text"}
                                                value={paramValues[param.key] || ''}
                                                onChange={(e) => handleParamChange(param, e.target.value)}
                                                className={`bg-gray-800 border rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 outline-none transition-colors ${
                                                    validationErrors[param.key] ? 'border-red-500' : 'border-gray-600'
                                                }`}
                                                placeholder={param.defaultValue}
                                            />
                                        )}
                                        {validationErrors[param.key] && (
                                            <span className="text-[10px] text-red-400 flex items-center gap-1">
                                                <AlertTriangle size={10} /> {validationErrors[param.key]}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                      )}

                      {/* Step Progress */}
                      <div className="space-y-2 mt-2">
                        {selectedScenario.steps.map((step, idx) => (
                           <div key={idx} className={`flex items-center text-sm p-2 rounded transition-colors ${
                               runningStep === idx ? 'bg-blue-900/20 border border-blue-800' : 'text-gray-500'
                           }`}>
                               <div className={`w-6 flex justify-center mr-2 ${
                                   runningStep !== null && idx < runningStep ? 'text-green-500' : 
                                   runningStep === idx ? 'text-blue-400' : 'text-gray-600'
                               }`}>
                                  {runningStep !== null && idx < runningStep ? '✓' : (idx + 1)}
                               </div>
                               <span className={runningStep === idx ? 'text-blue-100' : ''}>{step.name}</span>
                               
                               <div className="flex items-center gap-3 ml-auto">
                                  {step.timeout && (
                                     <span className={`text-xs flex items-center gap-1 border px-1.5 py-0.5 rounded ${
                                        runningStep === idx ? 'text-orange-300 border-orange-900/50 bg-orange-900/20' : 'text-gray-600 border-gray-800'
                                     }`} title={`Timeout: ${step.timeout}ms`}>
                                       <Clock size={10} /> {step.timeout/1000}s
                                     </span>
                                  )}
                                  <span className="font-mono text-xs opacity-50">S{step.messageToSend.stream}F{step.messageToSend.function}</span>
                               </div>
                           </div>
                        ))}
                      </div>
                    </div>

                    {/* Logs */}
                    <div className="flex-1 min-h-0">
                      <LogViewer logs={logs} />
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-500 bg-gray-900/20 rounded-lg border border-dashed border-gray-800">
                    <div className="text-center">
                        <Zap size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Select a scenario to begin testing</p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <ReportPanel logs={logs} results={results} />
          )}
        </div>
      </main>
    </div>
  );
}

const Loader = () => (
  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export default App;