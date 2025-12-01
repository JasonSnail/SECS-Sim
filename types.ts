export enum MessageDirection {
  HOST_TO_EQP = 'H->E',
  EQP_TO_HOST = 'E->H',
  INFO = 'INFO',
  ERROR = 'ERROR'
}

export interface SecsMessage {
  stream: number;
  function: number;
  waitBit: boolean;
  name: string;
  body: any; // Simplified JSON representation of SML
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  direction: MessageDirection;
  summary: string; // e.g. "S1F13 [W]"
  detail: string; // The full SML body
  type: 'success' | 'info' | 'error' | 'warning';
}

export enum StandardType {
  E9 = 'E9 (System Control)',
  E142 = 'E142 (Substrate Mapping)',
  GENERIC = 'Generic SECS'
}

export interface TestStep {
  name: string;
  description: string;
  messageToSend: SecsMessage;
  expectedResponseSxFy?: string; // e.g., "S1F14"
  simulateDelay?: number; // Time the equipment takes to respond (latency)
  timeout?: number; // Max time host waits for response (T3), in ms
}

export enum ParameterType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  ENUM = 'ENUM'
}

export interface ScenarioParameter {
  key: string;
  label: string;
  defaultValue: string;
  description?: string;
  type?: ParameterType; // Defaults to STRING if undefined
  options?: string[]; // For ENUM type
  min?: number; // For NUMBER type
  max?: number; // For NUMBER type
}

export interface TestScenario {
  id: string;
  title: string;
  standard: StandardType;
  description: string;
  parameters?: ScenarioParameter[];
  steps: TestStep[];
}

export interface TestResult {
  scenarioId: string;
  timestamp: Date;
  passed: boolean;
  notes: string;
}