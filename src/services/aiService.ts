/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const extractDataFromDocument = async (base64Data: string, mimeType: string): Promise<ExtractedData | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: "Extract financial data from this document. Identify if it is an Invoice, Receipt, or Bank Statement. Extract vendor name, date, total amount, tax amount, currency, and categorize it (e.g., Office Supplies, Travel, Utilities). Return the result in JSON format.",
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ["Invoice", "Receipt", "Bank Statement"] },
            vendor: { type: Type.STRING },
            date: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            taxAmount: { type: Type.NUMBER },
            currency: { type: Type.STRING },
            category: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
          },
          required: ["type", "amount", "confidence", "category"],
        },
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return {
        id: Math.random().toString(36).substr(2, 9),
        documentId: '', // To be filled by caller
        ...data,
      };
    }
    return null;
  } catch (error) {
    console.error("AI Extraction Error:", error);
    return null;
  }
};
