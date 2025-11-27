
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ResearchNode, GraphData, AIProvider, AIProviderStats, AIModel } from '../types/prism';
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
          id: { type: Type.STRING },
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

// --- BASE PROVIDER CLASS ---

abstract class BaseAIProvider implements AIProvider {
  abstract name: string;
  abstract models: AIModel[];
  protected activeModelId: string = '';

  getStats(): AIProviderStats {
    let totalRemaining = 0;
    let totalMax = 0;
    
    this.models.forEach(m => {
      totalRemaining += m.remainingTokens;
      totalMax += m.maxTokens;
    });

    return {
      name: this.name,
      activeModel: this.activeModelId || (this.models[0]?.id || 'unknown'),
      totalRemaining,
      totalMax,
      models: this.models,
      status: totalRemaining > 0 ? 'ACTIVE' : 'EXHAUSTED'
    };
  }

  resetCycle() { 
    this.models.forEach(m => m.remainingTokens = m.maxTokens);
  }

  abstract generateGraph(prompt: string, modelId?: string): Promise<GraphData>;

  protected deductTokens(amount: number, modelId: string) {
    const model = this.models.find(m => m.id === modelId);
    if (model) {
      model.remainingTokens = Math.max(0, model.remainingTokens - amount);
    }
  }

  protected async fetchAI(url: string, payload: any, apiKey: string | undefined, modelId: string, cost: number): Promise<GraphData> {
    if (!apiKey) {
      console.log(`[Mock] ${this.name} ${modelId} executing...`);
      await new Promise(r => setTimeout(r, 1200));
      this.deductTokens(cost, modelId);
      throw new Error(`${this.name} Key Missing - Triggering Simulation Fallback`);
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(payload)
    });

    if(!res.ok) throw new Error(`${this.name} API Error: ${res.statusText}`);
    
    const data = await res.json();
    this.deductTokens(cost, modelId);
    return sanitizeGraphData(JSON.parse(data.choices[0].message.content));
  }
}

// --- PROVIDER IMPLEMENTATIONS ---

class GeminiProvider extends BaseAIProvider {
  name = "Gemini";
  models: AIModel[] = [
    { id: 'gemini-2.0-flash-thinking-exp-1219', name: 'Flash Thinking (2.0)', type: 'heavy', remainingTokens: 50000, maxTokens: 50000 },
    { id: 'gemini-2.5-flash', name: 'Flash 2.5', type: 'standard', remainingTokens: 150000, maxTokens: 150000 }
  ];
  private client: GoogleGenAI;

  constructor() {
    super();
    this.activeModelId = 'gemini-2.5-flash';
    this.client = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async generateGraph(prompt: string, modelId?: string): Promise<GraphData> {
    this.activeModelId = modelId || this.models[1].id; 
    
    const model = this.models.find(m => m.id === this.activeModelId);
    if (model && model.remainingTokens <= 0) throw new Error(`Gemini Model ${model.name} Quota Exceeded`);

    const response = await this.client.models.generateContent({
      model: this.activeModelId, 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: graphResponseSchema,
        temperature: 0.3, 
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");
    
    this.deductTokens(prompt.length + text.length, this.activeModelId);
    return sanitizeGraphData(JSON.parse(text) as GraphData);
  }
}

class OpenAIProvider extends BaseAIProvider {
  name = "OpenAI";
  models: AIModel[] = [
    { id: 'o1-preview', name: 'o1 Preview', type: 'heavy', remainingTokens: 20000, maxTokens: 20000 },
    { id: 'gpt-4o', name: 'GPT-4o', type: 'standard', remainingTokens: 80000, maxTokens: 80000 },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', type: 'standard', remainingTokens: 200000, maxTokens: 200000 }
  ];

  async generateGraph(prompt: string, modelId?: string): Promise<GraphData> {
    this.activeModelId = modelId || 'gpt-4o-mini';
    const model = this.models.find(m => m.id === this.activeModelId);
    if (model && model.remainingTokens <= 0) throw new Error("OpenAI Model Quota Exceeded");

    const payload = {
      model: this.activeModelId,
      messages: [
        { role: "system", content: "You are a JSON generator for knowledge graphs." },
        { role: "user", content: prompt + "\nRespond strictly in JSON matching the schema." }
      ],
      response_format: { type: "json_object" }
    };

    return this.fetchAI('https://api.openai.com/v1/chat/completions', payload, process.env.OPENAI_API_KEY, this.activeModelId, 1000);
  }
}

class DeepSeekProvider extends BaseAIProvider {
  name = "DeepSeek";
  models: AIModel[] = [
    { id: 'deepseek-reasoner', name: 'DeepSeek R1', type: 'heavy', remainingTokens: 40000, maxTokens: 40000 },
    { id: 'deepseek-chat', name: 'DeepSeek V3', type: 'standard', remainingTokens: 100000, maxTokens: 100000 }
  ];

  async generateGraph(prompt: string, modelId?: string): Promise<GraphData> {
    this.activeModelId = modelId || 'deepseek-chat';
    const model = this.models.find(m => m.id === this.activeModelId);
    if (model && model.remainingTokens <= 0) throw new Error("DeepSeek Model Quota Exceeded");

    if (process.env.DEEPSEEK_API_KEY) {
        return this.fetchAI('https://api.deepseek.com/chat/completions', { /* payload */ }, process.env.DEEPSEEK_API_KEY, this.activeModelId, 800);
    }
    
    console.log(`[Mock] DeepSeek ${this.activeModelId}...`);
    await new Promise(r => setTimeout(r, 1200));
    this.deductTokens(800, this.activeModelId);
    throw new Error("Simulated Connection Timeout");
  }
}

class ClaudeProvider extends BaseAIProvider {
  name = "Claude";
  models: AIModel[] = [
    { id: 'claude-3-5-sonnet-20240620', name: 'Sonnet 3.5', type: 'heavy', remainingTokens: 40000, maxTokens: 40000 },
    { id: 'claude-3-haiku-20240307', name: 'Haiku 3', type: 'standard', remainingTokens: 120000, maxTokens: 120000 }
  ];

  async generateGraph(prompt: string, modelId?: string): Promise<GraphData> {
    this.activeModelId = modelId || this.models[1].id;
    this.deductTokens(1200, this.activeModelId);
    console.log(`[Mock] Claude ${this.activeModelId}...`);
    await new Promise(r => setTimeout(r, 1500));
    throw new Error("Simulated Rate Limit");
  }
}

class GrokProvider extends BaseAIProvider {
  name = "Grok";
  models: AIModel[] = [
    { id: 'grok-2', name: 'Grok 2', type: 'heavy', remainingTokens: 30000, maxTokens: 30000 },
    { id: 'grok-beta', name: 'Grok Beta', type: 'standard', remainingTokens: 50000, maxTokens: 50000 }
  ];

  async generateGraph(prompt: string, modelId?: string): Promise<GraphData> {
    this.activeModelId = modelId || 'grok-beta';
    this.deductTokens(900, this.activeModelId);
    console.log(`[Mock] Calling Grok ${this.activeModelId}...`);
    await new Promise(r => setTimeout(r, 1000));
    throw new Error("Simulated API Error");
  }
}

// --- SERVICE MANAGER ---

class AIServiceManager {
  private providers: AIProvider[];
  
  constructor() {
    this.providers = [
      new GeminiProvider(),
      new OpenAIProvider(),
      new DeepSeekProvider(),
      new ClaudeProvider(),
      new GrokProvider()
    ];
  }

  getProviders() { return this.providers; }

  getAllStats(): AIProviderStats[] {
    return this.providers.map(p => p.getStats());
  }

  // --- SMART ROUTING LOGIC ---
  
  async executeWithFallback(prompt: string): Promise<GraphData> {
    const { aiSettings, updateAIStatus, setStatus } = usePrismStore.getState();
    
    // 1. Determine Execution Plan
    let executionPlan: { provider: AIProvider, modelId?: string }[] = [];

    if (!aiSettings.autoMode) {
      const selectedP = this.providers.find(p => p.name === aiSettings.selectedProvider);
      if (selectedP) {
        const model = selectedP.models.find(m => m.id === aiSettings.selectedModel);
        if (model && model.remainingTokens > 0) {
           executionPlan.push({ provider: selectedP, modelId: aiSettings.selectedModel });
        }
      }
    }

    const activeProviders = this.providers;
    
    // Heavy Models (Reasoning)
    activeProviders.forEach(p => {
      const heavyModel = p.models.find(m => m.type === 'heavy' && m.remainingTokens > 0);
      if (heavyModel) executionPlan.push({ provider: p, modelId: heavyModel.id });
    });

    // Standard Models (Backup)
    activeProviders.forEach(p => {
      const stdModel = p.models.find(m => m.type === 'standard' && m.remainingTokens > 0);
      if (stdModel) executionPlan.push({ provider: p, modelId: stdModel.id });
    });

    let attempts = 0;
    
    for (const step of executionPlan) {
      const { provider, modelId } = step;
      const stats = provider.getStats();

      updateAIStatus(provider.name, { ...stats, activeModel: modelId || 'auto' });
      if (attempts > 0) setStatus('SWITCHING_PROVIDER');

      try {
        console.log(`[AI Manager]: Attempting ${provider.name} [${modelId}]`);
        const data = await provider.generateGraph(prompt, modelId);
        
        // --- INJECT PROVENANCE ---
        const timestamp = Date.now();
        const finalModelId = modelId || provider.getStats().activeModel;
        
        // This injects the metadata into the nodes before they reach the store
        data.nodes.forEach(node => {
            node.researchMetadata = {
                provider: provider.name,
                model: finalModelId,
                timestamp: timestamp
            };
        });
        // -------------------------

        updateAIStatus(provider.name, provider.getStats());
        return data;

      } catch (error) {
        console.warn(`[AI Manager]: ${provider.name} Failed:`, error);
        attempts++;
      }
    }

    throw new Error("All AI Providers and Fallbacks failed or exhausted quotas.");
  }
}

export const aiManager = new AIServiceManager();

// --- EXPORTS ---

export const generateGraphFromTopic = async (topic: string) => {
  const prompt = `
    Generate a knowledge graph for: "${topic}".
    Create 15-20 nodes and 20+ connections.
    CRITICAL: Use consistent, snake_case IDs. Include 'tags'.
  `;
  return aiManager.executeWithFallback(prompt);
};

export const findCorrelation = async (nodeA: ResearchNode, nodeB: ResearchNode) => {
  const prompt = `
    Find connections between: "${nodeA.label}" and "${nodeB.label}".
    Create intermediate nodes to bridge them.
    CRITICAL: Re-use exact snake_case IDs.
  `;
  return aiManager.executeWithFallback(prompt);
};
