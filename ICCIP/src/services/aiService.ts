import { GoogleGenAI, Type } from "@google/genai";
import { HealthRecord, HealthAnalysis } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const analyzeHealth = async (records: HealthRecord[], retries = 3): Promise<HealthAnalysis> => {
  const model = "gemini-3.1-pro-preview";
  
  const prompt = `
    Analyze the following patient health records and provide a comprehensive health analysis.
    Records: ${JSON.stringify(records)}
    
    Provide:
    1. A risk score from 0-100 (0 being healthy, 100 being critical).
    2. A summary of current health status.
    3. A 6-month health projection.
    4. 3-5 key recommendations.
    5. A personalized nutrition plan.
    6. Potential disease risks based on data trends.
    7. Diagnosis feedback (what the data suggests).
    8. Impact of daily vs weekend routines on health metrics.
    9. A risk trend array for the last 7 entries (date and score).
    
    Format the response as JSON.
  `;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              riskScore: { type: Type.NUMBER },
              summary: { type: Type.STRING },
              projection: { type: Type.STRING },
              recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
              nutritionPlan: { type: Type.ARRAY, items: { type: Type.STRING } },
              diseaseRisks: { type: Type.ARRAY, items: { type: Type.STRING } },
              diagnosisFeedback: { type: Type.STRING },
              routineImpact: {
                type: Type.OBJECT,
                properties: {
                  daily: { type: Type.STRING },
                  weekend: { type: Type.STRING }
                },
                required: ["daily", "weekend"]
              },
              riskTrend: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    date: { type: Type.STRING },
                    score: { type: Type.NUMBER }
                  },
                  required: ["date", "score"]
                }
              }
            },
            required: ["riskScore", "summary", "projection", "recommendations", "nutritionPlan", "diseaseRisks", "diagnosisFeedback", "routineImpact", "riskTrend"]
          }
        }
      });

      if (!response.text) throw new Error("Empty AI response");
      return JSON.parse(response.text);
    } catch (error: any) {
      console.error(`AI Analysis Attempt ${i + 1} failed:`, error);
      if (i === retries - 1) {
        // Final attempt failed
        return {
          riskScore: 50,
          summary: "Health analysis is currently unavailable due to a connection issue with the AI service. Please try again in a few moments.",
          projection: "Data collection ongoing.",
          recommendations: ["Ensure your health records are up to date", "Consult a medical professional for urgent concerns"],
          nutritionPlan: ["Maintain a balanced diet"],
          diseaseRisks: ["Insufficient data"],
          diagnosisFeedback: "Analysis pending connection recovery.",
          routineImpact: { daily: "Monitoring...", weekend: "Monitoring..." },
          riskTrend: records.slice(-7).map(r => ({ date: new Date(r.timestamp).toLocaleDateString(), score: 50 }))
        };
      }
      // Exponential backoff
      await sleep(Math.pow(2, i) * 1000);
    }
  }
  
  // Should not reach here due to return in loop or error handling
  throw new Error("Unexpected end of analyzeHealth");
};

export const generateMonthlyReport = async (userId: number, records: HealthRecord[]): Promise<any> => {
  const model = "gemini-3-flash-preview";
  const prompt = `Generate a monthly health report for user ${userId} based on these records: ${JSON.stringify(records)}. Include average risk, key events, and a clinical summary for the doctor.`;
  
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            averageRisk: { type: Type.NUMBER },
            keyEvents: { type: Type.ARRAY, items: { type: Type.STRING } },
            clinicalSummary: { type: Type.STRING }
          },
          required: ["averageRisk", "keyEvents", "clinicalSummary"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    return { averageRisk: 50, keyEvents: [], clinicalSummary: "Report generation failed." };
  }
};
