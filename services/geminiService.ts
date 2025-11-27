
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ResearchNode, GraphData } from '../types/prism';

// Define the schema for the graph response
const graphResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    nodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Snake case unique ID (e.g., 'berlin_wall'). Must be consistent." },
          label: { type: Type.STRING, description: "Human readable label" },
          type: { type: Type.STRING, description: "Category type" },
          summary: { type: Type.STRING, description: "Brief description" },
          groupLabel: { type: Type.STRING, description: "Person, Organization, Event, Location, Concept, Technology" },
          tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Keywords for deduplication (e.g. ['Cold War', 'Berlin'])" },
          metrics: {
            type: Type.OBJECT,
            properties: {
              significance: { type: Type.NUMBER, description: "Integer 1-10" }
            },
            required: ["significance"]
          }
        },
        required: ["id", "label", "type", "summary", "groupLabel", "metrics"]
      }
    },
    links: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          source: { type: Type.STRING, description: "ID of source node" },
          target: { type: Type.STRING, description: "ID of target node" },
          relation: { type: Type.STRING, description: "Relationship description" },
          weight: { type: Type.NUMBER, description: "0.1-1.0" }
        },
        required: ["source", "target", "relation", "weight"]
      }
    }
  },
  required: ["nodes", "links"]
};

const getAiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY is not defined");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Helper to clean AI output before it hits the store
const sanitizeGraphData = (data: GraphData): GraphData => {
  const cleanId = (id: string) => id.toLowerCase().trim().replace(/\s+/g, '_');
  
  const nodes = data.nodes.map(n => ({
    ...n,
    id: cleanId(n.id),
    tags: n.tags || []
  }));

  // Internal dedupe within the response itself
  const uniqueNodes = Array.from(new Map(nodes.map(node => [node.id, node])).values());
  const nodeIds = new Set(uniqueNodes.map(n => n.id));

  const links = data.links.map(l => ({
    ...l,
    source: cleanId(l.source as string),
    target: cleanId(l.target as string)
  })).filter(l => nodeIds.has(l.source as string) && nodeIds.has(l.target as string));

  return { nodes: uniqueNodes, links };
};

export const generateGraphFromTopic = async (topic: string): Promise<GraphData> => {
  const ai = getAiClient();
  
  const prompt = `
    Generate a knowledge graph for: "${topic}".
    Create 15-20 nodes and 20+ connections.
    CRITICAL: Use consistent, snake_case IDs (e.g. 'john_f_kennedy' not 'JFK').
    Include 'tags' array for each node to help with semantic matching.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: graphResponseSchema,
        temperature: 0.3, 
      }
    });

    const text = response.text;
    if (!text) throw new Error("No data returned");

    const data = JSON.parse(text) as GraphData;
    return sanitizeGraphData(data);

  } catch (error) {
    console.error("Gemini Graph Generation Error:", error);
    throw error;
  }
};

export const findCorrelation = async (nodeA: ResearchNode, nodeB: ResearchNode): Promise<GraphData> => {
  const ai = getAiClient();

  const prompt = `
    Find connections between: "${nodeA.label}" and "${nodeB.label}".
    Create intermediate nodes to bridge them.
    CRITICAL: Re-use exact snake_case IDs if referring to common entities (e.g., 'usa', 'cia', 'cold_war').
    Do not create duplicates. Use 'tags' to identify entities.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: graphResponseSchema,
        temperature: 0.2,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No data returned");

    const data = JSON.parse(text) as GraphData;
    return sanitizeGraphData(data);

  } catch (error) {
    console.error("Gemini Correlation Error:", error);
    throw error;
  }
};
