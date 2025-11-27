import Dexie, { Table } from 'dexie';
import { ResearchNode, OptimizedConnection } from './types/prism';

// Use functional initialization to avoid TypeScript class inheritance issues with Dexie
const db = new Dexie('prism_db') as Dexie & {
  nodes: Table<ResearchNode, string>;
  links: Table<OptimizedConnection, number>;
};

db.version(1).stores({
  nodes: 'id, groupLabel',
  links: '++id, source, target'
});

export { db };