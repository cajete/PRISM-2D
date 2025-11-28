
import { ResearchNode, OptimizedConnection } from '../types/prism';

// The Genesis State: Ancient Astronaut & Future Human Theory
export const INITIAL_NODES: ResearchNode[] = [
  {
    id: "ancient_astronaut_theory",
    label: "Ancient Astronaut Theory",
    type: "Hypothesis",
    summary: "The pseudo-scientific hypothesis that intelligent extraterrestrial beings visited Earth and made contact with humans in antiquity and prehistoric times, influencing the development of human cultures, technologies, and religions.",
    groupLabel: "Concept",
    tags: ["paleocontact", "extraterrestrials", "history", "mythology"],
    metrics: { significance: 10 }
  },
  {
    id: "ancient_aliens",
    label: "Ancient Aliens",
    type: "Entity Group",
    summary: "Refers to the theoretical extraterrestrial visitors who are alleged to have guided human civilization, often interpreted as 'gods' in ancient texts.",
    groupLabel: "Organization",
    tags: ["gods", "visitors", "sky_people"],
    metrics: { significance: 9 }
  },
  {
    id: "ufo_phenomenon",
    label: "UFO Phenomenon",
    type: "Technology",
    summary: "Unidentified Flying Objects. Within this graph, they are the physical manifestation of either extraterrestrial visitation or temporal displacement technology.",
    groupLabel: "Technology",
    tags: ["uap", "saucers", "aerial_phenomena"],
    metrics: { significance: 9 }
  },
  {
    id: "future_human_theory",
    label: "Future Human Theory",
    type: "Hypothesis",
    summary: "The hypothesis proposing that 'aliens' (specifically the Greys) are actually humans from a distant future who have traveled back in time to study or repair their own genetic timeline.",
    groupLabel: "Concept",
    tags: ["time_travel", "evolution", "chronology"],
    metrics: { significance: 8 }
  },
  {
    id: "alien_abduction",
    label: "Alien Abduction",
    type: "Event",
    summary: "The subjective experience of being forcibly taken by non-human entities, often associated with medical examinations and reproductive procedures.",
    groupLabel: "Event",
    tags: ["missing_time", "examination", "psychology"],
    metrics: { significance: 7 }
  },
  {
    id: "genetic_manipulation",
    label: "Genetic Manipulation",
    type: "Science",
    summary: "A core bridge concept linking Ancient Aliens (creating humans) and Future Humans (repairing degrading DNA). Suggests humanity is a designed or managed species.",
    groupLabel: "Technology",
    tags: ["dna", "hybridization", "evolution"],
    metrics: { significance: 8 }
  },
  {
    id: "ancient_martian_civilization",
    label: "Ancient Martian Civilization",
    type: "Civilization",
    summary: "The theory that Mars once hosted a complex civilization that was destroyed by a cataclysm, potentially forcing survivors to migrate to Earth, seeding human life.",
    groupLabel: "Location",
    tags: ["cydonia", "mars", "panspermia"],
    metrics: { significance: 7 }
  },
  {
    id: "cydonia_region",
    label: "Cydonia Mensae",
    type: "Location",
    summary: "A region on Mars containing the 'Face on Mars' and pyramid-like structures, often cited as evidence of artificial construction by an ancient civilization.",
    groupLabel: "Location",
    tags: ["face_on_mars", "anomalies", "pareidolia"],
    metrics: { significance: 6 }
  },
  {
    id: "alien_autopsy",
    label: "Alien Autopsy",
    type: "Event",
    summary: "Refers to the controversial 1995 film footage allegedly depicting a medical examination of a recovery extraterrestrial from the Roswell incident.",
    groupLabel: "Event",
    tags: ["roswell", "disinformation", "hoax"],
    metrics: { significance: 5 }
  },
  {
    id: "roswell_incident",
    label: "Roswell Incident (1947)",
    type: "Event",
    summary: "The recovery of balloon debris (or a craft) in New Mexico. The seminal event of modern UFOlogy and the catalyst for government cover-up conspiracy theories.",
    groupLabel: "Event",
    tags: ["crash_retrieval", "coverup", "military"],
    metrics: { significance: 8 }
  },
  {
    id: "erich_von_daniken",
    label: "Erich von Däniken",
    type: "Person",
    summary: "Swiss author of 'Chariots of the Gods?', responsible for popularizing the Ancient Astronaut theory in mainstream culture.",
    groupLabel: "Person",
    tags: ["author", "chariots", "archaeology"],
    metrics: { significance: 6 }
  },
  {
    id: "nazca_lines",
    label: "Nazca Lines",
    type: "Location",
    summary: "Large geoglyphs in Peru. Theorized by proponents to be landing strips or navigational aids for ancient spacecraft.",
    groupLabel: "Location",
    tags: ["peru", "geoglyphs", "archaeology"],
    metrics: { significance: 6 }
  },
  {
    id: "the_greys",
    label: "The Greys",
    type: "Entity Group",
    summary: "The archetypal alien image. In Future Human Theory, they represent the terminal point of human evolution—atrophied bodies, large craniums, and loss of emotional capacity.",
    groupLabel: "Organization",
    tags: ["biology", "future_humans", "abductors"],
    metrics: { significance: 7 }
  },
  {
    id: "panspermia",
    label: "Directed Panspermia",
    type: "Hypothesis",
    summary: "The hypothesis that life on Earth was deliberately seeded by an advanced extraterrestrial civilization.",
    groupLabel: "Concept",
    tags: ["origin_of_life", "seeding", "biology"],
    metrics: { significance: 6 }
  }
];

export const INITIAL_LINKS: OptimizedConnection[] = [
  // Ancient Astronaut Cluster
  { source: "ancient_astronaut_theory", target: "ancient_aliens", relation: "POSTULATES_EXISTENCE_OF", weight: 1.0 },
  { source: "erich_von_daniken", target: "ancient_astronaut_theory", relation: "POPULARIZED", weight: 0.9 },
  { source: "ancient_aliens", target: "genetic_manipulation", relation: "PERFORMED", weight: 0.8 },
  { source: "ancient_aliens", target: "nazca_lines", relation: "ALLEGEDLY_CONSTRUCTED", weight: 0.6 },
  { source: "ancient_aliens", target: "panspermia", relation: "EXECUTED", weight: 0.7 },

  // Mars Cluster
  { source: "ancient_martian_civilization", target: "cydonia_region", relation: "LOCATED_AT", weight: 0.9 },
  { source: "ancient_martian_civilization", target: "ancient_aliens", relation: "POSSIBLE_ORIGIN_OF", weight: 0.7 },
  { source: "ancient_martian_civilization", target: "panspermia", relation: "SEEDED_EARTH_VIA", weight: 0.5 },

  // UFO / Roswell Cluster
  { source: "roswell_incident", target: "ufo_phenomenon", relation: "CATALYST_EVENT", weight: 0.9 },
  { source: "alien_autopsy", target: "roswell_incident", relation: "ALLEGED_AFTERMATH", weight: 0.8 },
  { source: "alien_abduction", target: "ufo_phenomenon", relation: "ASSOCIATED_WITH", weight: 0.9 },
  
  // Future Human Theory (The Bridge)
  { source: "future_human_theory", target: "ufo_phenomenon", relation: "REINTERPRETS", weight: 0.8 },
  { source: "future_human_theory", target: "ancient_astronaut_theory", relation: "CHALLENGES", weight: 0.7 },
  { source: "the_greys", target: "future_human_theory", relation: "IDENTIFIED_AS_HUMANS", weight: 0.9 },
  { source: "the_greys", target: "alien_abduction", relation: "PERPETRATORS_OF", weight: 0.8 },
  { source: "future_human_theory", target: "genetic_manipulation", relation: "SEEKS_TO_CORRECT", weight: 0.8 },
  
  // Cross-Pollination
  { source: "ufo_phenomenon", target: "ancient_aliens", relation: "MODERN_MANIFESTATION", weight: 0.6 }
];
