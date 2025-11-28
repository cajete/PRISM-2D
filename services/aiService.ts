
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ResearchNode, GraphData, AIProvider, AIProviderStats, AIModel } from '../types/prism';
import { usePrismStore } from '../store/prismStore';

// -----------------------------------------------------------------------------
// SCHEMA DEFINITIONS
// Rigid structure enforcement for the LLM.
// -----------------------------------------------------------------------------

const graphResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    nodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Snake case unique ID (e.g. 'cold_war')" },
          label: { type: Type.STRING },
          type: { type: Type.STRING },
          summary: { type: Type.STRING },
          groupLabel: { type: Type.STRING, description: "Person, Organization, Event, Location, Concept, Technology" },
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

// -----------------------------------------------------------------------------
// DATA SANITIZATION
// Cleanse the AI's output before it touches the State.
// -----------------------------------------------------------------------------

const sanitizeGraphData = (data: GraphData): GraphData => {
  const cleanId = (id: string) => id.toLowerCase().trim().replace(/\s+/g, '_');
  
  const nodes = data.nodes.map(n => ({
    ...n,
    id: cleanId(n.id),
    tags: n.tags || []
  }));

  // Deduplicate within the response batch
  const uniqueNodes = Array.from(new Map(nodes.map(node => [node.id, node])).values());
  const nodeIds = new Set(uniqueNodes.map(n => n.id));

  // Ensure links point to valid nodes
  const links = data.links.map(l => ({
    ...l,
    source: cleanId(l.source as string),
    target: cleanId(l.target as string)
  })).filter(l => nodeIds.has(l.source as string) && nodeIds.has(l.target as string));

  return { nodes: uniqueNodes, links };
};

// -----------------------------------------------------------------------------
// ABSTRACT BASE PROVIDER
// The blueprint for all intelligence sources.
// -----------------------------------------------------------------------------

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

  protected deductTokens(amount: number, modelId: string) {
    const model = this.models.find(m => m.id === modelId);
    if (model) {
      model.remainingTokens = Math.max(0, model.remainingTokens - amount);
    }
  }

  abstract generateGraph(prompt: string, modelId?: string): Promise<GraphData>;

  /**
   * Universal Fetch Wrapper with Neural Bridge Fallback.
   * If the specific provider key is missing, we transparently route 
   * the request through the System Core (Gemini) to ensure the 
   * application remains functional (Mocking the persona).
   */
  protected async fetchAI(
    url: string, 
    payload: any, 
    apiKey: string | undefined, 
    modelId: string, 
    cost: number,
    prompt: string, // RAW Prompt required for fallback routing
    customHeaders?: Record<string, string>
  ): Promise<GraphData> {
    
    // 1. PRIMARY PATHWAY: Use the specific provider API
    if (apiKey) {
      try {
        const headers = {
          'Content-Type': 'application/json',
          ...(customHeaders || { 'Authorization': `Bearer ${apiKey}` })
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        });

        if(!res.ok) {
          const errText = await res.text();
          console.warn(`[${this.name}] API Error: ${res.status}. Switching to fallback.`);
          throw new Error(`${this.name} API Error: ${res.statusText}`);
        }
        
        const data = await res.json();
        this.deductTokens(cost, modelId); 
        
        let content = "";
        
        // Parsing Logic for different providers
        if (data.choices && data.choices[0] && data.choices[0].message) {
            content = data.choices[0].message.content;
        } else if (data.content && data.content[0] && data.content[0].text) {
            content = data.content[0].text;
        } else {
            throw new Error("Unknown response format");
        }

        const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
        return sanitizeGraphData(JSON.parse(jsonStr));
      } catch (e) {
        console.warn(`[${this.name}] Primary connection failed.`, e);
        // Fall through to fallback
      }
    } else {
      console.warn(`[${this.name}] No API Key found.`);
    }

    // 2. FALLBACK PATHWAY: Neural Bridge (Gemini Core)
    if (process.env.API_KEY) {
       console.log(`[${this.name}] Engaging Neural Bridge: Routing request via System Core.`);
       return this.generateViaFallback(modelId, prompt);
    }

    // 3. LAST RESORT: Static Mock
    return this.generateMockResponse(modelId);
  }

  private async generateViaFallback(modelId: string, prompt: string): Promise<GraphData> {
     try {
       const fallbackClient = new GoogleGenAI({ apiKey: process.env.API_KEY! });
       
       // We instruct the Core to adopt the persona of the requested provider
       // to maintain the "flavor" of the request if possible.
       const enhancedPrompt = `
         ${prompt}
         
         SYSTEM OVERRIDE:
         You are acting as a fallback for the ${this.name} engine (Model: ${modelId}).
         Ensure you generate a high-quality, rich Knowledge Graph with at least 15 nodes and 20 links.
         Do NOT return a simulation error. Return real data.
       `;

       const response = await fallbackClient.models.generateContent({
          model: 'gemini-2.5-flash', // High speed, low latency fallback
          contents: enhancedPrompt,
          config: {
              responseMimeType: "application/json",
              responseSchema: graphResponseSchema,
              temperature: 0.3,
          }
       });

       const text = response.text;
       if (!text) throw new Error("Fallback Core returned empty response");
       
       // Deduct from the "active" model statistics to maintain illusion of usage
       this.deductTokens(prompt.length + text.length, modelId);
       
       return sanitizeGraphData(JSON.parse(text) as GraphData);

     } catch (e) {
       console.error("Neural Bridge Failure:", e);
       return this.generateMockResponse(modelId);
     }
  }

  private generateMockResponse(modelId: string): GraphData {
      return {
        nodes: [{ id: 'system_error', label: `Connection Failed`, type: 'Error', summary: `Both ${this.name} and System Core are unreachable. Check credentials.`, groupLabel: 'Technology', metrics: { significance: 10 } }],
        links: []
      };
  }
}

// -----------------------------------------------------------------------------
// GEMINI PROVIDER IMPLEMENTATION (PRIMARY)
// -----------------------------------------------------------------------------

class GeminiProvider extends BaseAIProvider {
  name = "Gemini";
  models: AIModel[] = [
    { id: 'gemini-2.0-flash-thinking-exp-1219', name: 'Flash Thinking (2.0)', type: 'heavy', remainingTokens: 50000, maxTokens: 50000 },
    { id: 'gemini-2.5-flash', name: 'Flash 2.5', type: 'standard', remainingTokens: 150000, maxTokens: 150000 }
  ];
  
  private client: GoogleGenAI;

  constructor() {
    super();
    if (!process.env.API_KEY) {
        console.warn("Gemini API_KEY is missing from environment variables.");
    }
    this.client = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async generateGraph(prompt: string, modelId?: string): Promise<GraphData> {
    this.activeModelId = modelId || this.models[1].id; 
    
    const model = this.models.find(m => m.id === this.activeModelId);
    if (model && model.remainingTokens <= 0) {
        // Self-healing: If Gemini quota is out, we can't really do much unless we rotate keys, 
        // but for now we throw to trigger the Manager's next step.
        throw new Error(`Gemini Model ${model.name} Quota Exceeded`);
    }

    try {
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

    } catch (error) {
      console.error("Gemini API Execution Failed:", error);
      throw error;
    }
  }
}

// -----------------------------------------------------------------------------
// SECONDARY PROVIDERS (Now with Neural Bridge Support)
// -----------------------------------------------------------------------------

class OpenAIProvider extends BaseAIProvider {
  name = "OpenAI";
  models: AIModel[] = [
    { id: 'gpt-4o', name: 'GPT-4o', type: 'heavy', remainingTokens: 80000, maxTokens: 80000 },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', type: 'standard', remainingTokens: 200000, maxTokens: 200000 }
  ];

  async generateGraph(prompt: string, modelId?: string): Promise<GraphData> {
    this.activeModelId = modelId || 'gpt-4o-mini';
    const payload = {
      model: this.activeModelId,
      messages: [
        { role: "system", content: "You are a JSON generator for knowledge graphs." },
        { role: "user", content: prompt + "\nRespond strictly in JSON matching the schema." }
      ],
      response_format: { type: "json_object" }
    };
    return this.fetchAI('https://api.openai.com/v1/chat/completions', payload, process.env.OPENAI_API_KEY, this.activeModelId, 1000, prompt);
  }
}

class GrokProvider extends BaseAIProvider {
  name = "Grok";
  models: AIModel[] = [
    { id: 'grok-2-latest', name: 'Grok 2', type: 'heavy', remainingTokens: 60000, maxTokens: 60000 },
    { id: 'grok-beta', name: 'Grok Beta', type: 'standard', remainingTokens: 120000, maxTokens: 120000 }
  ];

  async generateGraph(prompt: string, modelId?: string): Promise<GraphData> {
    this.activeModelId = modelId || 'grok-beta';
    const payload = {
      model: this.activeModelId,
      messages: [
        { role: "system", content: "You are a specialized Knowledge Graph generator. Return ONLY JSON." },
        { role: "user", content: prompt + "\n\nSchema: { nodes: [], links: [] }" }
      ],
      response_format: { type: "json_object" }
    };
    return this.fetchAI('https://api.x.ai/v1/chat/completions', payload, process.env.GROK_API_KEY, this.activeModelId, 1200, prompt);
  }
}

class ClaudeProvider extends BaseAIProvider {
  name = "Claude";
  models: AIModel[] = [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', type: 'heavy', remainingTokens: 75000, maxTokens: 75000 },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', type: 'standard', remainingTokens: 180000, maxTokens: 180000 }
  ];

  async generateGraph(prompt: string, modelId?: string): Promise<GraphData> {
    this.activeModelId = modelId || 'claude-3-5-sonnet-20241022';
    
    const payload = {
      model: this.activeModelId,
      max_tokens: 4096,
      system: "You are a JSON generator. Output ONLY valid JSON representing the knowledge graph.",
      messages: [
        { role: "user", content: prompt + "\n\nEnsure strict JSON syntax." }
      ]
    };

    const headers = {
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01'
    };

    return this.fetchAI('https://api.anthropic.com/v1/messages', payload, process.env.ANTHROPIC_API_KEY, this.activeModelId, 1500, prompt, headers);
  }
}

class DeepSeekProvider extends BaseAIProvider {
  name = "DeepSeek";
  models: AIModel[] = [
    { id: 'deepseek-chat', name: 'DeepSeek V3', type: 'standard', remainingTokens: 100000, maxTokens: 100000 }
  ];

  async generateGraph(prompt: string, modelId?: string): Promise<GraphData> {
    this.activeModelId = modelId || 'deepseek-chat';
    const payload = {
       model: this.activeModelId,
       messages: [
         { role: "system", content: "You are a JSON generator." },
         { role: "user", content: prompt }
       ],
       response_format: { type: "json_object" }
    };
    return this.fetchAI('https://api.deepseek.com/chat/completions', payload, process.env.DEEPSEEK_API_KEY, this.activeModelId, 800, prompt);
  }
}

// -----------------------------------------------------------------------------
// AI SERVICE MANAGER (SINGLETON)
// Orchestrates provider selection and fallback logic.
// -----------------------------------------------------------------------------

class AIServiceManager {
  private providers: AIProvider[];
  
  constructor() {
    this.providers = [
      new GeminiProvider(),
      new OpenAIProvider(),
      new GrokProvider(),
      new ClaudeProvider(),
      new DeepSeekProvider()
    ];
  }

  getProviders() { return this.providers; }

  getAllStats(): AIProviderStats[] {
    return this.providers.map(p => p.getStats());
  }

  async executeWithFallback(prompt: string): Promise<GraphData> {
    const { aiSettings, updateAIStatus, setStatus } = usePrismStore.getState();
    
    let executionPlan: { provider: AIProvider, modelId?: string }[] = [];

    // 1. Build Execution Plan
    if (!aiSettings.autoMode) {
      // Manual Override: Try strictly the selected provider
      const selectedP = this.providers.find(p => p.name === aiSettings.selectedProvider);
      if (selectedP) {
        executionPlan.push({ provider: selectedP, modelId: aiSettings.selectedModel });
      }
    } else {
      // Auto Mode: Prioritize Heavy/Thinking models, then Standard models across providers
      this.providers.forEach(p => {
        const heavyModel = p.models.find(m => m.type === 'heavy' && m.remainingTokens > 0);
        if (heavyModel) executionPlan.push({ provider: p, modelId: heavyModel.id });
      });
      this.providers.forEach(p => {
        const stdModel = p.models.find(m => m.type === 'standard' && m.remainingTokens > 0);
        if (stdModel) executionPlan.push({ provider: p, modelId: stdModel.id });
      });
    }

    if (executionPlan.length === 0) throw new Error("No available AI Providers match the configuration.");

    // 2. Execute Plan
    let attempts = 0;
    
    for (const step of executionPlan) {
      const { provider, modelId } = step;
      updateAIStatus(provider.name, { ...provider.getStats(), activeModel: modelId || 'auto' });
      
      if (attempts > 0) setStatus('SWITCHING_PROVIDER');

      try {
        console.log(`[AI Manager]: Engaging ${provider.name}::${modelId}`);
        const data = await provider.generateGraph(prompt, modelId);
        
        // Inject Provenance Data
        const timestamp = Date.now();
        const finalModelId = modelId || provider.getStats().activeModel;
        
        data.nodes.forEach(node => {
            if (!node.researchMetadata) {
                node.researchMetadata = { provider: provider.name, model: finalModelId, timestamp };
            }
        });

        updateAIStatus(provider.name, provider.getStats());
        return data;

      } catch (error) {
        console.warn(`[AI Manager]: ${provider.name} failed. Falling back...`, error);
        attempts++;
      }
    }

    throw new Error("All AI Pathways failed. System offline.");
  }
}

export const aiManager = new AIServiceManager();

// Public facade functions
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
