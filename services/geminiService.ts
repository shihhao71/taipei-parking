import { GoogleGenAI } from "@google/genai";
import { SearchResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Uses Gemini with Google Search Grounding to find parking lot details based on a user query.
 * Since responseSchema is not supported with googleSearch, we parse a structured text response.
 */
export const searchParkingLot = async (query: string): Promise<SearchResult> => {
  try {
    const prompt = `
      Find the specific parking lot details for the following location or name in Taipei: "${query}".
      
      I need the exact Name, Address, current Parking Rates (e.g., $40/hr, free, etc), and a Google Maps Link. 
      Also, try to find the total parking capacity (number of spaces). If you cannot find the exact capacity, estimate it based on the size of the facility (e.g., small=30, medium=100, large=300).
      
      Strictly format your response in a single line using pipes (||) as delimiters in exactly this order:
      Name: [Name] || Address: [Address] || Rates: [Rates] || Capacity: [Number] || Map: [URL]
      
      Example response:
      Name: Xinyi Plaza Parking || Address: No. 1, Shifu Rd, Xinyi District, Taipei City || Rates: $40/hour, $300 max daily || Capacity: 400 || Map: https://maps.google.com/...
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    
    // Parse the response manually since we couldn't use JSON schema with search
    const nameMatch = text.match(/Name:\s*(.*?)\s*\|\|/);
    const addressMatch = text.match(/Address:\s*(.*?)\s*\|\|/);
    const ratesMatch = text.match(/Rates:\s*(.*?)\s*\|\|/);
    const capacityMatch = text.match(/Capacity:\s*(\d+)/);
    const mapMatch = text.match(/Map:\s*(http[^\s]+)/);

    if (!nameMatch || !addressMatch) {
      // Fallback if formatting failed, try a simpler heuristic or throw
      if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        // If search worked but format failed, try to construct a basic result from chunks?
        // For this demo, we will rely on the model instruction adherence.
        throw new Error("Could not parse parking details. Please try a more specific name.");
      }
      throw new Error("No parking lot found for this query.");
    }

    return {
      name: nameMatch[1].trim(),
      address: addressMatch[1].trim(),
      rates: ratesMatch ? ratesMatch[1].trim() : "Rates info unavailable",
      capacity: capacityMatch ? parseInt(capacityMatch[1], 10) : 100, // Default to 100 if not found
      mapUrl: mapMatch ? mapMatch[1].trim() : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nameMatch[1].trim())}`,
    };

  } catch (error) {
    console.error("Gemini Search Error:", error);
    throw error;
  }
};

/**
 * Simulates fetching live data. 
 * In a real production app, this would hit the Taipei City Open Data API.
 * For this demo, we generate plausible data based on the capacity.
 */
export const fetchLiveStatus = async (capacity: number) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const occupied = Math.floor(Math.random() * capacity);
  const available = capacity - occupied;
  
  return {
    available,
    isFull: available === 0,
  };
};