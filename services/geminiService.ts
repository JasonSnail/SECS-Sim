import { GoogleGenAI } from "@google/genai";
import { LogEntry, TestResult } from "../types";

// NOTE: In a real environment, the API key should be handled via backend proxy.
// We assume process.env.API_KEY is available as per instructions.

export const generateTestReport = async (logs: LogEntry[], results: TestResult[]) => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const recentLogs = logs.slice(-20).map(l => `[${l.timestamp.toISOString()}] ${l.direction}: ${l.summary}`).join('\n');
  const resultsSummary = results.map(r => `Scenario: ${r.scenarioId}, Passed: ${r.passed}`).join('\n');

  const prompt = `
    You are a Senior Semiconductor Automation Engineer. 
    Analyze the following SECS/GEM test session for a host simulator interacting with a tool.
    
    Test Results:
    ${resultsSummary}

    Recent Communication Logs:
    ${recentLogs}

    Please provide a structured report in JSON format containing:
    1. "summary": A brief executive summary of the test session.
    2. "anomalies": Any potential issues or timing irregularities seen in the logs.
    3. "recommendations": What to check next based on E9 (Control) or E142 (Map) standards.
    
    Output strictly valid JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      summary: "Failed to generate AI report.",
      anomalies: ["API connection failed"],
      recommendations: ["Check network settings"]
    };
  }
};