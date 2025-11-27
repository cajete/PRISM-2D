
import { ResearchNode, OptimizedConnection } from '../types/prism';

export const INITIAL_NODES: ResearchNode[] = [
  { id: "cia", label: "CIA", type: "Intelligence Agency", summary: "Central Intelligence Agency of the United States.", groupLabel: "Organization", metrics: { significance: 10 }, tags: ["USA", "Espionage", "Government"] },
  { id: "kgb", label: "KGB", type: "Intelligence Agency", summary: "Main security agency for the Soviet Union.", groupLabel: "Organization", metrics: { significance: 10 }, tags: ["USSR", "Espionage", "Government"] },
  { id: "jfk", label: "John F. Kennedy", type: "President", summary: "35th President of the United States.", groupLabel: "Person", metrics: { significance: 9 }, tags: ["USA", "Politics", "Leader"] },
  { id: "khrushchev", label: "Nikita Khrushchev", type: "Premier", summary: "First Secretary of the Communist Party of the Soviet Union.", groupLabel: "Person", metrics: { significance: 9 }, tags: ["USSR", "Politics", "Leader"] },
  { id: "berlin_wall", label: "Berlin Wall", type: "Fortification", summary: "Concrete barrier dividing Berlin from 1961 to 1989.", groupLabel: "Location", metrics: { significance: 8 }, tags: ["Germany", "Cold War", "Border"] },
  { id: "cuban_missile_crisis", label: "Cuban Missile Crisis", type: "Conflict", summary: "1 month, 4 day confrontation between US and USSR.", groupLabel: "Event", metrics: { significance: 10 }, tags: ["Nuclear", "Cold War", "Cuba"] },
  { id: "iron_curtain", label: "Iron Curtain", type: "Geopolitical", summary: "Boundary dividing Europe into two separate areas.", groupLabel: "Concept", metrics: { significance: 7 }, tags: ["Europe", "Cold War", "Ideology"] },
  { id: "u2_incident", label: "U-2 Incident", type: "Incident", summary: "US spy plane shot down over Soviet airspace.", groupLabel: "Event", metrics: { significance: 6 }, tags: ["Espionage", "Aircraft", "USSR"] },
  { id: "francis_gary_powers", label: "Francis Gary Powers", type: "Pilot", "summary": "American pilot whose U-2 was shot down.", groupLabel: "Person", metrics: { significance: 5 }, tags: ["USA", "Espionage", "Pilot"] },
  { id: "nuclear_deterrence", label: "Nuclear Deterrence", type: "Strategy", "summary": "Military strategy under Mutually Assured Destruction.", groupLabel: "Concept", metrics: { significance: 8 }, tags: ["War", "Strategy", "Nuclear"] },
  { id: "fidel_castro", label: "Fidel Castro", type: "Leader", "summary": "Revolutionary and politician of Cuba.", groupLabel: "Person", metrics: { significance: 8 }, tags: ["Cuba", "Politics", "Revolution"] },
  { id: "bay_of_pigs", label: "Bay of Pigs", "type": "Invasion", "summary": "Failed landing operation on the southwestern coast of Cuba.", groupLabel: "Event", metrics: { significance: 7 }, tags: ["Cuba", "USA", "Military"] },
  { id: "u2_plane", label: "Lockheed U-2", "type": "Aircraft", "summary": "High altitude reconnaissance aircraft.", groupLabel: "Technology", metrics: { significance: 6 }, tags: ["Aviation", "Espionage", "Technology"] },
  { id: "checkoint_charlie", label: "Checkpoint Charlie", "type": "Crossing", "summary": "Best-known Berlin Wall crossing point.", groupLabel: "Location", metrics: { significance: 5 }, tags: ["Berlin", "Border", "Cold War"] },
  { id: "stasi", label: "Stasi", "type": "Secret Police", "summary": "State Security Service of East Germany.", groupLabel: "Organization", metrics: { significance: 6 }, tags: ["Germany", "Espionage", "Police"] },
  { id: "usa", label: "USA", type: "Country", summary: "United States of America", groupLabel: "Location", metrics: { significance: 10 }, tags: ["North America", "Superpower"] },
  { id: "ussr", label: "USSR", type: "Country", summary: "Soviet Union", groupLabel: "Location", metrics: { significance: 10 }, tags: ["Asia", "Europe", "Superpower"] }
];

export const INITIAL_LINKS: OptimizedConnection[] = [
    { source: "jfk", target: "usa", relation: "LEADER_OF", weight: 1.0 },
    { source: "khrushchev", target: "ussr", relation: "LEADER_OF", weight: 1.0 },
    { source: "cia", target: "usa", relation: "AGENCY_OF", weight: 0.9 },
    { source: "kgb", target: "ussr", relation: "AGENCY_OF", weight: 0.9 },
    { source: "jfk", target: "cuban_missile_crisis", relation: "KEY_FIGURE", weight: 1.0 },
    { source: "khrushchev", target: "cuban_missile_crisis", relation: "KEY_FIGURE", weight: 1.0 },
    { source: "fidel_castro", target: "cuban_missile_crisis", relation: "INVOLVED", weight: 0.9 },
    { source: "fidel_castro", target: "bay_of_pigs", relation: "DEFENDED", weight: 0.8 },
    { source: "cia", target: "bay_of_pigs", relation: "ORCHESTRATED", weight: 0.8 },
    { source: "berlin_wall", target: "iron_curtain", relation: "PART_OF", weight: 0.7 },
    { source: "checkoint_charlie", target: "berlin_wall", relation: "LOCATED_AT", weight: 0.6 },
    { source: "u2_plane", target: "u2_incident", relation: "INVOLVED", weight: 0.9 },
    { source: "francis_gary_powers", target: "u2_incident", relation: "PILOTED", weight: 0.9 },
    { source: "u2_plane", target: "cia", relation: "OPERATED_BY", weight: 0.7 },
    { source: "nuclear_deterrence", target: "cuban_missile_crisis", relation: "CONCEPT_OF", weight: 0.5 },
    { "source": "stasi", "target": "berlin_wall", "relation": "PATROLLED", "weight": 0.6 },
    { "source": "jfk", "target": "khrushchev", "relation": "OPPONENT", "weight": 0.8 }
];
