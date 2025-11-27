
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ResearchNode, GraphData, AIProvider, AIProviderStats } from '../types/prism';
import { usePrismStore } from '../store/prismStore';

// --- SHARED SCHEMA & UTILS ---

const graphResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    nodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Snake case ID" },
          label: { type: Type.STRING },
          type: { type: Type.STRING },
          summary: { type: Type.STRING },
          groupLabel: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          metrics: {
            type: Type.OBJECT,
            properties: { significance: { type: Type.NUMBER } },
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
          source: { type: Type.STRING },
          target: { type: Type.STRING },
          relation: { type: Type.STRING },
          weight: { type: Type.NUMBER }
        },
        required: ["source", "target", "relation", "weight"]
      }
    }
  },
  required: ["nodes", "links"]
};

// Helper to sanitize data across all providers
const sanitizeGraphData = (data: GraphData): GraphData => {
  const cleanId = (id: string) => id.toLowerCase().trim().replace(/\s+/g, '_');
  
  const nodes = data.nodes.map(n => ({
    ...n,
    id: cleanId(n.id),
    tags: n.tags || []
  }));

  const uniqueNodes = Array.from(new Map(nodes.map(node => [node.id, node])).values());
  const nodeIds = new Set(uniqueNodes.map(n => n.id));

  const links = data.links.map(l => ({
    ...l,
    source: cleanId(l.source as string),
    target: cleanId(l.target as string)
  })).filter(l => nodeIds.has(l.source as string) && nodeIds.has(l.target as string));

  return { nodes: uniqueNodes, links };
};

// --- PROVIDER IMPLEMENTATIONS ---

class GeminiProvider implements AIProvider {
  name = "Gemini";
  private client: GoogleGenAI;
  private tokens = 100000; // Simulated Daily Limit
  private maxTokens = 100000;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  getStats(): AIProviderStats {
    return {
      name: this.name,
      model: "gemini-2.5-flash",
      remainingTokens: this.tokens,
      maxTokens: this.maxTokens,
      status: this.tokens > 0 ? 'ACTIVE' : 'EXHAUSTED'
    };
  }

  resetCycle() { this.tokens = this.maxTokens; }

  async generateGraph(prompt: string): Promise<GraphData> {
    if (this.tokens <= 0) throw new Error("Token limit exceeded");

    const response = await this.client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: graphResponseSchema,
        temperature: 0.3, 
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");
    
    // Estimate usage
    this.tokens -= (prompt.length / 4) + (text.length / 4);
    
    return sanitizeGraphData(JSON.parse(text) as GraphData);
  }
}

class OpenAIProvider implements AIProvider {
  name = "OpenAI";
  private tokens = 50000;
  private maxTokens = 50000;

  getStats(): AIProviderStats {
    return {
      name: this.name,
      model: "gpt-4o-mini",
      remainingTokens: this.tokens,
      maxTokens: this.maxTokens,
      status: this.tokens > 0 ? 'ACTIVE' : 'EXHAUSTED'
    };
  }

  resetCycle() { this.tokens = this.maxTokens; }

  async generateGraph(prompt: string): Promise<GraphData> {
    // Mock implementation for fallback logic demonstration
    // In a real app, this would use fetch() to OpenAI API
    console.log("Fallback to OpenAI...");
    
    // Simulate network delay
    await new Promise(r => setTimeout(r, 1500));
    
    if (this.tokens <= 0) throw new Error("Token limit exceeded");
    this.tokens -= 500; // Mock deduction

    // Throw error if no key (simulating failure to trigger next fallback)
    if (!process.env.OPENAI_API_KEY) throw new Error("OpenAI Key Missing - Falling back");

    return { nodes: [], links: [] }; // Placeholder
  }
}

class DeepSeekProvider implements AIProvider {
  name = "DeepSeek";
  private tokens = 20000;
  private maxTokens = 20000;

  getStats(): AIProviderStats {
    return {
      name: this.name,
      model: "deepseek-coder",
      remainingTokens: this.tokens,
      maxTokens: this.maxTokens,
      status: this.tokens > 0 ? 'ACTIVE' : 'EXHAUSTED'
    };
  }

  resetCycle() { this.tokens = this.maxTokens; }

  async generateGraph(prompt: string): Promise<GraphData> {
    console.log("Fallback to DeepSeek...");
    await new Promise(r => setTimeout(r, 1000));
    if (this.tokens <= 0) throw new Error("Token limit exceeded");
    
    // Fallback failure simulation
    throw new Error("DeepSeek Connection Timeout");
  }
}

// --- SERVICE MANAGER (ORCHESTRATOR) ---

class AIServiceManager {
  private providers: AIProvider[];
  private activeIndex = 0;

  constructor() {
    this.providers = [
      new GeminiProvider(),
      new OpenAIProvider(),
      new DeepSeekProvider()
    ];
  }

  getCurrentProvider(): AIProvider {
    return this.providers[this.activeIndex];
  }

  getAllStats(): AIProviderStats[] {
    return this.providers.map(p => p.getStats());
  }

  private rotateProvider() {
    this.activeIndex = (this.activeIndex + 1) % this.providers.length;
    console.warn(`[AI Manager]: Switching to ${this.providers[this.activeIndex].name}`);
  }

  async executeWithFallback(prompt: string): Promise<GraphData> {
    const startProviderIndex = this.activeIndex;
    let attempts = 0;

    // Loop through providers until success or full cycle
    while (attempts < this.providers.length) {
      const currentProvider = this.providers[this.activeIndex];
      const stats = currentProvider.getStats();

      // Update Store UI
      usePrismStore.getState().updateAIStatus(currentProvider.name, stats);

      if (stats.status === 'EXHAUSTED') {
        this.rotateProvider();
        attempts++;
        continue;
      }

      try {
        console.log(`[AI Manager]: Requesting generation via ${currentProvider.name}...`);
        const data = await currentProvider.generateGraph(prompt);
        
        // Update stats after success
        usePrismStore.getState().updateAIStatus(currentProvider.name, currentProvider.getStats());
        return data;

      } catch (error) {
        console.error(`[AI Manager]: ${currentProvider.name} Failed:`, error);
        this.rotateProvider();
        attempts++;
        
        // Update UI to show we are switching
        usePrismStore.getState().setStatus(
           attempts < this.providers.length ? 'SWITCHING_PROVIDER' : 'ERROR'
        );
      }
    }

    throw new Error("All AI Providers failed. Please check API keys or connection.");
  }
}

export const aiManager = new AIServiceManager();

// --- EXPORTED FUNCTIONS ---

export const generateGraphFromTopic = async (topic: string): Promise<GraphData> => {
  const prompt = `
    Generate a knowledge graph for: "${topic}".
    Create 15-20 nodes and 20+ connections.
    CRITICAL: Use consistent, snake_case IDs.
    Include 'tags' array.
  `;
  return aiManager.executeWithFallback(prompt);
};

export const findCorrelation = async (nodeA: ResearchNode, nodeB: ResearchNode): Promise<GraphData> => {
  const prompt = `
    Find connections between: "${nodeA.label}" and "${nodeB.label}".
    Create intermediate nodes to bridge them.
    CRITICAL: Re-use exact snake_case IDs.
    Do not create duplicates.
  `;
  return aiManager.executeWithFallback(prompt);
};
