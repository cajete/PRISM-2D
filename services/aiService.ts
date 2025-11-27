
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

// Helper to clean AI output
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
  protected tokens: number = 0;
  protected maxTokens: number = 0;
  protected activeModelId: string = '';

  constructor(maxTokens: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
  }

  getStats(): AIProviderStats {
    return {
      name: this.name,
      activeModel: this.activeModelId || (this.models[0]?.id || 'unknown'),
      remainingTokens: this.tokens,
      maxTokens: this.maxTokens,
      status: this.tokens > 0 ? 'ACTIVE' : 'EXHAUSTED'
    };
  }

  resetCycle() { this.tokens = this.maxTokens; }

  // Abstract generation to be implemented by specifics
  abstract generateGraph(prompt: string, modelId?: string): Promise<GraphData>;

  // Common simulated deduction
  protected deductTokens(amount: number) {
    this.tokens = Math.max(0, this.tokens - amount);
  }
}

// --- PROVIDER IMPLEMENTATIONS ---

class GeminiProvider extends BaseAIProvider {
  name = "Gemini";
  models: AIModel[] = [
    { id: 'gemini-2.0-flash-thinking-exp-1219', name: 'Flash Thinking (2.0)', type: 'heavy' },
    { id: 'gemini-2.5-flash', name: 'Flash 2.5', type: 'standard' }
  ];
  private client: GoogleGenAI;

  constructor() {
    super(150000); // 150k Daily Token Budget
    this.activeModelId = 'gemini-2.5-flash';
    this.client = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async generateGraph(prompt: string, modelId?: string): Promise<GraphData> {
    if (this.tokens <= 0) throw new Error("Gemini Token Limit Exceeded");
    
    this.activeModelId = modelId || this.models[1].id; 

    // Real API Call
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
    
    // Deduct
    this.deductTokens(prompt.length + text.length);
    
    return sanitizeGraphData(JSON.parse(text) as GraphData);
  }
}

class OpenAIProvider extends BaseAIProvider {
  name = "OpenAI";
  models: AIModel[] = [
    { id: 'o1-preview', name: 'o1 Preview', type: 'heavy' },
    { id: 'gpt-4o', name: 'GPT-4o', type: 'standard' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', type: 'standard' }
  ];

  constructor() { super(50000); this.activeModelId = 'gpt-4o-mini'; }

  async generateGraph(prompt: string, modelId?: string): Promise<GraphData> {
    this.activeModelId = modelId || 'gpt-4o-mini';
    
    if (this.tokens <= 0) throw new Error("OpenAI Quota Exceeded");

    // Standard Chat Completion Payload
    const payload = {
      model: this.activeModelId,
      messages: [
        { role: "system", content: "You are a JSON generator for knowledge graphs." },
        { role: "user", content: prompt + "\nRespond strictly in JSON matching the schema." }
      ],
      response_format: { type: "json_object" }
    };

    // If API Key exists, use Real Fetch
    if (process.env.OPENAI_API_KEY) {
       const res = await fetch('https://api.openai.com/v1/chat/completions', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
         body: JSON.stringify(payload)
       });
       if(!res.ok) throw new Error(`OpenAI Error: ${res.statusText}`);
       const data = await res.json();
       const text = data.choices[0].message.content;
       this.deductTokens(1000); // Estimate
       return sanitizeGraphData(JSON.parse(text));
    }

    // Mock Fallback
    console.log(`[Mock] OpenAI ${this.activeModelId} would execute here.`);
    await new Promise(r => setTimeout(r, 1500)); 
    this.deductTokens(1000);
    throw new Error("OpenAI Key Missing - Triggering Fallback");
  }
}

class DeepSeekProvider extends BaseAIProvider {
  name = "DeepSeek";
  models: AIModel[] = [
    { id: 'deepseek-reasoner', name: 'DeepSeek R1', type: 'heavy' },
    { id: 'deepseek-chat', name: 'DeepSeek V3', type: 'standard' }
  ];

  constructor() { super(30000); this.activeModelId = 'deepseek-chat'; }

  async generateGraph(prompt: string, modelId?: string): Promise<GraphData> {
    this.activeModelId = modelId || 'deepseek-chat';
    
    if (this.tokens <= 0) throw new Error("DeepSeek Quota Exceeded");

    if (process.env.DEEPSEEK_API_KEY) {
        const res = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}` },
            body: JSON.stringify({
                model: this.activeModelId,
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            })
        });
        if(!res.ok) throw new Error("DeepSeek API Error");
        const data = await res.json();
        this.deductTokens(800);
        return sanitizeGraphData(JSON.parse(data.choices[0].message.content));
    }

    // Mock
    console.log(`[Mock] DeepSeek ${this.activeModelId}...`);
    await new Promise(r => setTimeout(r, 1200));
    this.deductTokens(800);
    throw new Error("DeepSeek Key Missing - Connection Timeout");
  }
}

class ClaudeProvider extends BaseAIProvider {
  name = "Claude";
  models: AIModel[] = [
    { id: 'claude-3-5-sonnet-20240620', name: 'Sonnet 3.5', type: 'heavy' },
    { id: 'claude-3-haiku-20240307', name: 'Haiku 3', type: 'standard' }
  ];

  constructor() { super(40000); this.activeModelId = 'claude-3-haiku-20240307'; }

  async generateGraph(prompt: string, modelId?: string): Promise<GraphData> {
    this.activeModelId = modelId || this.models[1].id;
    
    if (this.tokens <= 0) throw new Error("Claude Quota Exceeded");
    
    if (process.env.ANTHROPIC_API_KEY) {
        // Anthropic Implementation placeholder
    }

    console.log(`[Mock] Claude ${this.activeModelId}...`);
    await new Promise(r => setTimeout(r, 1500));
    this.deductTokens(1200);
    throw new Error("Simulated Rate Limit");
  }
}

class GrokProvider extends BaseAIProvider {
  name = "Grok";
  models: AIModel[] = [
    { id: 'grok-2', name: 'Grok 2', type: 'heavy' },
    { id: 'grok-beta', name: 'Grok Beta', type: 'standard' }
  ];

  constructor() { super(25000); this.activeModelId = 'grok-beta'; }

  async generateGraph(prompt: string, modelId?: string): Promise<GraphData> {
    this.activeModelId = modelId || 'grok-beta';
    console.log(`[Mock] Calling Grok ${this.activeModelId}...`);
    await new Promise(r => setTimeout(r, 1000));
    this.deductTokens(900);
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
    
    // 1. Determine Execution Plan (List of Providers to try in order)
    let executionPlan: { provider: AIProvider, modelId?: string }[] = [];

    if (!aiSettings.autoMode) {
      // MANUAL MODE: Try specific user selection first
      const selectedP = this.providers.find(p => p.name === aiSettings.selectedProvider);
      if (selectedP) {
        executionPlan.push({ provider: selectedP, modelId: aiSettings.selectedModel });
      }
    }

    // AUTO MODE (or Fallback): Prioritize Heavy models, then Standard
    const activeProviders = this.providers.filter(p => p.getStats().status !== 'EXHAUSTED');
    
    // Add "Heavy" models first (Smart Reasoning)
    activeProviders.forEach(p => {
      const heavyModel = p.models.find(m => m.type === 'heavy');
      if (heavyModel) executionPlan.push({ provider: p, modelId: heavyModel.id });
    });

    // Add "Standard" models next (Speed/Backup)
    activeProviders.forEach(p => {
      const stdModel = p.models.find(m => m.type === 'standard');
      if (stdModel) executionPlan.push({ provider: p, modelId: stdModel.id });
    });

    let attempts = 0;
    
    for (const step of executionPlan) {
      const { provider, modelId } = step;
      const stats = provider.getStats();

      // UI Feedback
      updateAIStatus(provider.name, { ...stats, activeModel: modelId || 'auto' });
      if (attempts > 0) setStatus('SWITCHING_PROVIDER');

      try {
        console.log(`[AI Manager]: Attempting ${provider.name} [${modelId}]`);
        const data = await provider.generateGraph(prompt, modelId);
        
        // Success! Update stats and return
        updateAIStatus(provider.name, provider.getStats());
        return data;

      } catch (error) {
        console.warn(`[AI Manager]: ${provider.name} Failed:`, error);
        attempts++;
      }
    }

    throw new Error("All AI Providers and Fallbacks failed. System Offline.");
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
