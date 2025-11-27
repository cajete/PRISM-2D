
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
          id: { type: Type.STRING, description: "Snake case unique ID" },
          label: { type: Type.STRING, description: "Human readable label" },
          type: { type: Type.STRING, description: "Category type" },
          summary: { type: Type.STRING, description: "Brief description of the entity" },
          groupLabel: { type: Type.STRING, description: "Broad category: Person, Organization, Event, Location, Concept, Technology" },
          metrics: {
            type: Type.OBJECT,
            properties: {
              significance: { type: Type.NUMBER, description: "Integer 1-10 representing importance" }
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
          relation: { type: Type.STRING, description: "Relationship description (e.g., FOUNDED, LOCATED_AT)" },
          weight: { type: Type.NUMBER, description: "Float 0.1-1.0 representing connection strength" }
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

export const generateGraphFromTopic = async (topic: string): Promise<GraphData> => {
  const ai = getAiClient();
  
  const prompt = `
    Generate a knowledge graph for the topic: "${topic}".
    Create at least 15 nodes and 20 connections.
    Ensure nodes cover various aspects: People, Locations, Events, and Concepts.
    Assign a 'significance' score (1-10) based on importance.
    Use snake_case for IDs.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: graphResponseSchema,
        temperature: 0.5,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No data returned from Gemini");

    const data = JSON.parse(text) as GraphData;
    return { nodes: data.nodes, links: data.links };

  } catch (error) {
    console.error("Gemini Graph Generation Error:", error);
    throw error;
  }
};

export const findCorrelation = async (nodeA: ResearchNode, nodeB: ResearchNode): Promise<GraphData> => {
  const ai = getAiClient();

  const prompt = `
    Analyze the relationship between two entities: "${nodeA.label}" (${nodeA.summary}) and "${nodeB.label}" (${nodeB.summary}).
    Generate a knowledge graph that connects these two nodes.
    Create intermediate nodes (people, events, locations, concepts) that act as a bridge or path between them.
    Do NOT just link them directly unless they are immediately related. Find the hidden connections.
    Include the original two nodes in the output with their original IDs ("${nodeA.id}", "${nodeB.id}").
    Assign a 'significance' score (1-10).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: graphResponseSchema,
        temperature: 0.3, // Lower temperature for more analytical reasoning
      }
    });

    const text = response.text;
    if (!text) throw new Error("No data returned from Gemini");

    const data = JSON.parse(text) as GraphData;
    return { nodes: data.nodes, links: data.links };

  } catch (error) {
    console.error("Gemini Correlation Error:", error);
    throw error;
  }
};
