
import { ResearchNode, OptimizedConnection } from '../types/prism';

// --- SIMILARITY ALGORITHMS ---

/**
 * Calculates Jaccard Similarity Coefficient between two strings.
 * Used for fuzzy matching node labels and aliases.
 * Returns 0.0 to 1.0
 */
export const calculateStringSimilarity = (str1: string, str2: string): number => {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s1 = normalize(str1);
  const s2 = normalize(str2);

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  // Bigram tokenization for fuzzy matching
  const bigrams = (text: string) => {
    const res = new Set<string>();
    for (let i = 0; i < text.length - 1; i++) {
      res.add(text.substring(i, i + 2));
    }
    return res;
  };

  const set1 = bigrams(s1);
  const set2 = bigrams(s2);
  
  if (set1.size === 0 || set2.size === 0) return 0.0;

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
};

/**
 * Checks if two nodes are likely the same entity based on Label, ID, or Aliases.
 * Threshold: 0.85 (High confidence required)
 */
export const isSameEntity = (nodeA: ResearchNode, nodeB: ResearchNode): boolean => {
  // 1. Exact ID Match (Fastest)
  if (nodeA.id === nodeB.id) return true;

  // 2. Exact Label Match (Case Insensitive)
  if (nodeA.label.toLowerCase() === nodeB.label.toLowerCase()) return true;

  // 3. Fuzzy Similarity Match
  const similarity = calculateStringSimilarity(nodeA.label, nodeB.label);
  if (similarity > 0.85) return true;

  // 4. Alias Cross-Check
  if (nodeA.aliases && nodeB.aliases) {
    const hasOverlap = nodeA.aliases.some(aliasA => 
      nodeB.aliases?.some(aliasB => 
        aliasA.toLowerCase() === aliasB.toLowerCase() || calculateStringSimilarity(aliasA, aliasB) > 0.9
      )
    );
    if (hasOverlap) return true;
  }

  return false;
};

// --- CONSOLIDATION ENGINE ---

interface ConsolidationResult {
  nodes: ResearchNode[];
  links: OptimizedConnection[];
  mergedCount: number;
}

/**
 * Merges new graph data into the existing graph, deduplicating nodes
 * and re-wiring links to preserve connections.
 */
export const consolidateGraphData = (
  existingNodes: ResearchNode[],
  existingLinks: OptimizedConnection[],
  newNodes: ResearchNode[],
  newLinks: OptimizedConnection[]
): ConsolidationResult => {
  
  const finalNodes = [...existingNodes];
  const nodeMap = new Map<string, string>(); // Maps New_ID -> Existing_ID (if merged)
  let mergedCount = 0;

  // 1. Process New Nodes
  newNodes.forEach(newNode => {
    // Check against ALL existing nodes for duplicates
    const existingMatch = finalNodes.find(existing => isSameEntity(existing, newNode));

    if (existingMatch) {
      // DUPLICATE FOUND: Merge Logic
      nodeMap.set(newNode.id, existingMatch.id);
      mergedCount++;

      // Merge Tags
      const combinedTags = new Set([...(existingMatch.tags || []), ...(newNode.tags || [])]);
      existingMatch.tags = Array.from(combinedTags);

      // Merge Aliases
      const combinedAliases = new Set([...(existingMatch.aliases || []), ...(newNode.aliases || [])]);
      existingMatch.aliases = Array.from(combinedAliases);

      // Boost significance if rediscovered
      existingMatch.metrics.significance = Math.min(10, Math.max(existingMatch.metrics.significance, newNode.metrics.significance));
    } else {
      // UNIQUE: Add to list
      finalNodes.push(newNode);
      nodeMap.set(newNode.id, newNode.id); // Maps to itself
    }
  });

  // 2. Process & Re-wire Links
  const linkSignature = new Set(existingLinks.map(l => {
    const s = typeof l.source === 'object' ? (l.source as ResearchNode).id : l.source;
    const t = typeof l.target === 'object' ? (l.target as ResearchNode).id : l.target;
    return `${s}|${t}`;
  }));

  const validNewLinks: OptimizedConnection[] = [];

  newLinks.forEach(link => {
    const rawSource = typeof link.source === 'object' ? (link.source as ResearchNode).id : link.source as string;
    const rawTarget = typeof link.target === 'object' ? (link.target as ResearchNode).id : link.target as string;

    // RE-WIRE: Point source/target to the resolved ID (either itself or the merged parent)
    const resolvedSource = nodeMap.get(rawSource);
    const resolvedTarget = nodeMap.get(rawTarget);

    // Only add link if both endpoints exist in the final graph
    if (resolvedSource && resolvedTarget && resolvedSource !== resolvedTarget) {
      const signatureA = `${resolvedSource}|${resolvedTarget}`;
      const signatureB = `${resolvedTarget}|${resolvedSource}`; // Undirected check

      if (!linkSignature.has(signatureA) && !linkSignature.has(signatureB)) {
        validNewLinks.push({
          source: resolvedSource,
          target: resolvedTarget,
          relation: link.relation,
          weight: link.weight
        });
        linkSignature.add(signatureA);
      }
    }
  });

  return {
    nodes: finalNodes,
    links: [...existingLinks, ...validNewLinks],
    mergedCount
  };
};
