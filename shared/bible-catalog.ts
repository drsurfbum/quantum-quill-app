// Enhanced Story Bible Taxonomy - Field-based structure
// Based on detailed taxonomy rules provided by user

export interface TaxonomyField {
  name: string;
  type: "text" | "textarea" | "single-select" | "multi-select" | "checkbox" | "single-select-linked" | "multi-select-linked";
  required: boolean;
  options?: string[];
  choices?: Array<{ value: string; label: string }>;
  linkedTo?: string;
}

export interface TaxonomyCategory {
  name: string;
  key: string;
  description: string;
  fields: Record<string, TaxonomyField>;
  categoryFields?: Record<string, Record<string, TaxonomyField>>;
}

export const BIBLE_TAXONOMY: Record<string, TaxonomyCategory> = {
  CHARACTERS: {
    name: "Characters",
    key: "characters",
    description: "People, beings, and entities in your story",
    fields: {
      primaryRole: {
        name: "Primary Role",
        type: "single-select",
        required: true,
        options: ["Protagonist", "Antagonist", "Supporting Character", "NPC / Minor Character", "Cameo / Background"]
      },
      affiliation: {
        name: "Affiliation / Faction",
        type: "multi-select-linked",
        linkedTo: "groups_races",
        required: false
      },
      archetype: {
        name: "Archetype / Profession",
        type: "multi-select",
        required: false,
        options: ["Pilot", "Scientist", "Merchant", "Warrior", "Scholar", "Healer", "Artist", "Leader", "Spy", "Criminal", "Noble", "Commoner"]
      },
      status: {
        name: "Status",
        type: "single-select",
        required: false,
        options: ["Alive", "Deceased", "Missing", "Unknown"]
      },
      era: {
        name: "Era / Timeline Period",
        type: "text",
        required: false
      },
      importance: {
        name: "Importance Level",
        type: "single-select",
        required: false,
        options: ["Main", "Secondary", "Tertiary"]
      }
    }
  },

  GROUPS_RACES: {
    name: "Groups & Races",
    key: "groups_races",
    description: "Species, races, organizations, and collective entities",
    fields: {
      category: {
        name: "Category",
        type: "single-select",
        required: true,
        options: ["Species / Race", "Organization / Faction", "Tribe / Clan", "Government / Political Body", "Company / Guild"]
      },
      parentGroup: {
        name: "Parent Group",
        type: "single-select-linked",
        linkedTo: "groups_races",
        required: false
      },
      status: {
        name: "Status",
        type: "single-select",
        required: false,
        options: ["Active", "Defunct", "Secret/Hidden"]
      },
      homeLocation: {
        name: "Home Location",
        type: "single-select-linked",
        linkedTo: "locations",
        required: false
      },
      notableMembers: {
        name: "Notable Members",
        type: "multi-select-linked",
        linkedTo: "characters",
        required: false
      },
      eraEstablished: {
        name: "Era Established",
        type: "text",
        required: false
      },
      eraDissolved: {
        name: "Era Dissolved",
        type: "text",
        required: false
      }
    }
  },

  LOCATIONS: {
    name: "Locations",
    key: "locations",
    description: "Places, settings, and geographical features",
    fields: {
      type: {
        name: "Type",
        type: "single-select",
        required: true,
        options: ["Planet", "Moon", "City / Settlement", "Building / Structure", "Region / Biome", "Station / Ship", "Dungeon / Ruin", "Other"]
      },
      parentLocation: {
        name: "Parent Location",
        type: "single-select-linked",
        linkedTo: "locations",
        required: false
      },
      environment: {
        name: "Environment / Biome",
        type: "multi-select",
        required: false,
        options: ["Desert", "Forest", "Ice", "Urban", "Underwater", "Mountain", "Plains", "Swamp", "Volcanic", "Space", "Underground"]
      },
      status: {
        name: "Status",
        type: "single-select",
        required: false,
        options: ["Inhabited", "Abandoned", "Ruined", "Under Construction"]
      },
      significance: {
        name: "Significance",
        type: "multi-select",
        required: false,
        options: ["Capital", "Trading Hub", "Military Base", "Sacred Site", "Research Facility", "Mining Colony", "Agricultural Center"]
      },
      coordinates: {
        name: "Coordinates / Map Reference",
        type: "text",
        required: false
      },
      era: {
        name: "Era / Timeline Relevance",
        type: "text",
        required: false
      }
    }
  },

  EVENTS: {
    name: "Events",
    key: "events",
    description: "Historical events, battles, ceremonies, and occurrences",
    fields: {
      type: {
        name: "Type",
        type: "single-select",
        required: true,
        options: ["Conflict / Battle", "Discovery / Invention", "Diplomacy / Treaty", "Personal Milestone", "Catastrophe / Disaster", "Festival / Ceremony", "Migration / Exploration", "Other"]
      },
      date: {
        name: "Date / Era",
        type: "text",
        required: false
      },
      approximateDate: {
        name: "Date is Approximate",
        type: "checkbox",
        required: false
      },
      locations: {
        name: "Location(s)",
        type: "multi-select-linked",
        linkedTo: "locations",
        required: false
      },
      charactersInvolved: {
        name: "Characters Involved",
        type: "multi-select-linked",
        linkedTo: "characters",
        required: false
      },
      groupsInvolved: {
        name: "Groups / Factions",
        type: "multi-select-linked",
        linkedTo: "groups_races",
        required: false
      },
      outcome: {
        name: "Outcome / Significance",
        type: "multi-select",
        required: false,
        options: ["Victory", "Defeat", "Alliance Formed", "Cataclysm", "Turning Point", "Discovery Made", "Treaty Signed"]
      },
      visibility: {
        name: "Visibility / Status",
        type: "single-select",
        required: false,
        options: ["Canonical", "Rumor/Legend", "Hypothetical"]
      }
    }
  },

  WORLD_ELEMENTS: {
    name: "World Elements",
    key: "world_elements",
    description: "Core elements that define your world",
    fields: {
      category: {
        name: "Category",
        type: "single-select",
        required: true,
        options: ["Flora", "Fauna", "Religion/Ritual", "Mythology", "Item/Artifact", "Language", "System", "Entertainment", "Clothing", "Food", "Disease/Medicine", "Law/Politics", "Professions", "Technology", "Astronomy", "Weather"]
      },
      subcategory: {
        name: "Subcategory / Specific Type",
        type: "text",
        required: false
      },
      parentElement: {
        name: "Parent Element",
        type: "single-select-linked",
        linkedTo: "world_elements",
        required: false
      },
      associatedLocations: {
        name: "Associated Locations",
        type: "multi-select-linked",
        linkedTo: "locations",
        required: false
      },
      associatedCharacters: {
        name: "Associated Characters",
        type: "multi-select-linked",
        linkedTo: "characters",
        required: false
      },
      associatedGroups: {
        name: "Associated Groups",
        type: "multi-select-linked",
        linkedTo: "groups_races",
        required: false
      },
      associatedEvents: {
        name: "Associated Events",
        type: "multi-select-linked",
        linkedTo: "events",
        required: false
      },
      status: {
        name: "Status",
        type: "single-select",
        required: false,
        options: ["Common", "Rare", "Extinct/Defunct", "Legendary"]
      }
    },
    categoryFields: {
      Flora: {
        habitat: { name: "Habitat", type: "text", required: false },
        growthBehavior: { name: "Growth Behavior", type: "text", required: false },
        uses: { name: "Uses", type: "multi-select", required: false, options: ["Edible", "Medicinal", "Material", "Decorative"] },
        threats: { name: "Threats", type: "text", required: false },
        lifecycle: { name: "Lifecycle", type: "text", required: false }
      },
      Fauna: {
        habitat: { name: "Habitat", type: "text", required: false },
        diet: { name: "Diet", type: "single-select", required: false, options: ["Carnivore", "Herbivore", "Omnivore", "Other"] },
        behavior: { name: "Behavior", type: "text", required: false },
        lifecycle: { name: "Lifecycle", type: "text", required: false },
        domestication: { name: "Domestication Status", type: "single-select", required: false, options: ["Wild", "Domestic", "Semi-domestic"] },
        threatLevel: { name: "Threat Level", type: "single-select", required: false, options: ["Harmless", "Low", "Moderate", "High", "Extreme"] }
      },
      Technology: {
        inventor: { name: "Inventor/Creator", type: "text", required: false },
        powerSource: { name: "Power Source", type: "text", required: false },
        functionalDescription: { name: "Functional Description", type: "textarea", required: false },
        limitations: { name: "Limitations", type: "text", required: false },
        adoptionLevel: { name: "Adoption Level", type: "single-select", required: false, options: ["Prototype", "Limited", "Common", "Universal"] }
      },
      "Religion/Ritual": {
        coreBeliefs: { name: "Core Beliefs", type: "textarea", required: false },
        deities: { name: "Deities", type: "text", required: false },
        followers: { name: "Followers", type: "text", required: false },
        ceremonies: { name: "Ceremonies", type: "textarea", required: false },
        taboos: { name: "Taboos", type: "text", required: false }
      },
      Mythology: {
        originStory: { name: "Origin Story", type: "textarea", required: false },
        majorMyths: { name: "Major Myths", type: "textarea", required: false },
        symbolism: { name: "Symbolism", type: "text", required: false },
        culturalImpact: { name: "Cultural Impact", type: "textarea", required: false }
      },
      "Item/Artifact": {
        creator: { name: "Creator/Origin", type: "text", required: false },
        materials: { name: "Materials", type: "text", required: false },
        powers: { name: "Powers/Abilities", type: "textarea", required: false },
        knownOwners: { name: "Known Owners", type: "text", required: false },
        currentLocation: { name: "Current Location", type: "text", required: false }
      },
      Language: {
        spokenWritten: { name: "Spoken/Written", type: "single-select", required: false, options: ["Spoken Only", "Written Only", "Both", "Sign Language"] },
        grammarNotes: { name: "Grammar Notes", type: "textarea", required: false },
        uniquePhrases: { name: "Unique Phrases", type: "textarea", required: false },
        scriptAppearance: { name: "Script Appearance", type: "text", required: false },
        region: { name: "Region", type: "text", required: false }
      },
      System: {
        purpose: { name: "Purpose", type: "textarea", required: false },
        keyComponents: { name: "Key Components", type: "textarea", required: false },
        participants: { name: "Participants", type: "text", required: false },
        societalEffects: { name: "Effects on Society", type: "textarea", required: false }
      },
      Entertainment: {
        type: { name: "Type", type: "single-select", required: false, options: ["Music", "Game", "Storytelling", "Performance", "Sport", "Other"] },
        culturalRole: { name: "Cultural Role", type: "textarea", required: false },
        popularity: { name: "Popularity", type: "single-select", required: false, options: ["Unknown", "Niche", "Regional", "Widespread", "Universal"] },
        history: { name: "History", type: "textarea", required: false }
      },
      Clothing: {
        materials: { name: "Materials", type: "text", required: false },
        designMotifs: { name: "Design Motifs", type: "text", required: false },
        occasion: { name: "Occasion", type: "text", required: false },
        socialSignificance: { name: "Social Significance", type: "textarea", required: false }
      },
      Food: {
        ingredients: { name: "Ingredients", type: "text", required: false },
        preparation: { name: "Preparation", type: "textarea", required: false },
        culturalSignificance: { name: "Cultural Significance", type: "textarea", required: false },
        availability: { name: "Availability", type: "single-select", required: false, options: ["Common", "Seasonal", "Rare", "Ceremonial Only"] }
      },
      "Disease/Medicine": {
        symptoms: { name: "Symptoms", type: "textarea", required: false },
        transmission: { name: "Transmission", type: "text", required: false },
        treatment: { name: "Cure/Treatment", type: "textarea", required: false },
        historicalOutbreaks: { name: "Historical Outbreaks", type: "textarea", required: false }
      },
      "Law/Politics": {
        governingBody: { name: "Governing Body", type: "text", required: false },
        legalCodes: { name: "Legal Codes", type: "textarea", required: false },
        enforcement: { name: "Enforcement", type: "text", required: false },
        historicalChanges: { name: "Historical Changes", type: "textarea", required: false }
      },
      Professions: {
        trainingRequirements: { name: "Training Requirements", type: "textarea", required: false },
        tools: { name: "Tools", type: "text", required: false },
        societalRole: { name: "Societal Role", type: "textarea", required: false },
        status: { name: "Status", type: "single-select", required: false, options: ["Low", "Common", "Respected", "Elite", "Forbidden"] }
      },
      Astronomy: {
        celestialType: { name: "Celestial Type", type: "single-select", required: false, options: ["Planet", "Star", "Moon", "Comet", "Constellation", "Other"] },
        observations: { name: "Observations", type: "textarea", required: false },
        mythologicalSignificance: { name: "Mythological Significance", type: "textarea", required: false },
        effects: { name: "Effects", type: "text", required: false }
      },
      Weather: {
        regionalPatterns: { name: "Regional Patterns", type: "textarea", required: false },
        seasonalVariations: { name: "Seasonal Variations", type: "textarea", required: false },
        populationEffects: { name: "Effects on Population/Environment", type: "textarea", required: false }
      }
    }
  },

  DETAILS: {
    name: "Details",
    key: "details",
    description: "Notes, quotes, ideas, and lore hooks linked to other elements",
    fields: {
      linkedElements: {
        name: "Linked Elements",
        type: "multi-select-linked",
        linkedTo: "any",
        required: true
      },
      type: {
        name: "Type",
        type: "single-select",
        required: false,
        options: ["Note", "Quote", "Idea", "Lore Hook", "Reminder"]
      },
      shortDescription: {
        name: "Short Description",
        type: "text",
        required: true
      },
      content: {
        name: "Content",
        type: "textarea",
        required: true
      },
      visibility: {
        name: "Visibility",
        type: "single-select",
        required: false,
        options: ["Public", "Private", "Draft"]
      }
    }
  },

  RESEARCH: {
    name: "Research",
    key: "research",
    description: "External research sources and references",
    fields: {
      title: {
        name: "Title",
        type: "text",
        required: true
      },
      sourceType: {
        name: "Source Type",
        type: "single-select",
        required: true,
        options: ["Article", "Book", "Video", "Image", "Website", "Map", "Interview", "Other"]
      },
      urlOrReference: {
        name: "URL or Reference",
        type: "text",
        required: false
      },
      linkedElements: {
        name: "Linked Elements",
        type: "multi-select-linked",
        linkedTo: "any",
        required: false
      },
      notesTaken: {
        name: "Notes Taken?",
        type: "checkbox",
        required: false
      },
      summary: {
        name: "Summary",
        type: "textarea",
        required: false
      },
      topic: {
        name: "Topic/Tags",
        type: "text",
        required: false
      }
    }
  }
};


// Current specialized choices and historical labels are reconciled here.
const EVENT_TYPES = [
  'Battle', 'Discovery', 'Treaty', 'Meeting', 'Birth', 'Death', 'Collapse', 'Formation',
  'Arrival', 'Departure', 'Betrayal', 'Alliance', 'Conflict', 'Resolution',
  'Revelation', 'Transformation', 'Ceremony', 'Disaster', 'Victory', 'Defeat',
  'Negotiation', 'War', 'Peace', 'Rebellion', 'Other'
];
const EVENT_STATUS_OPTIONS = [
  'Canonical', 'Rumor', 'Historical', 'Speculative', 'Unverified', 'Planned', 'Draft'
];
const CHARACTER_ROLES = [
  'Leader', 'Victim', 'Witness', 'Participant', 'Instigator', 'Bystander', 'Hero', 'Villain'
];
const OUTCOME_TYPES = [
  'Victory', 'Defeat', 'Alliance Formed', 'Cataclysm', 'Treaty Signed', 'War Declared',
  'Discovery Made', 'Secret Revealed', 'Betrayal', 'Sacrifice', 'Transformation', 'Other'
];
const DETAIL_TYPES = [
  'Note', 'Quote', 'Idea', 'Reminder', 'Foreshadow', 'Plot Hook', 'Character Note', 
  'World Note', 'Research', 'Continuity Check', 'Other'
];
const DETAIL_STATUS = [
  'Open', 'In Progress', 'Resolved', 'Archived', 'On Hold'
];
const VISIBILITY_OPTIONS = [
  'Internal Only', 'Visible to Collaborators', 'Public Notes'
];
const SOURCE_TYPES = [
  'Article', 'Book', 'Video', 'Map', 'Website', 'Interview', 'Documentary', 
  'Academic Paper', 'Blog Post', 'Podcast', 'News Report', 'Database', 'Other'
];
const RESEARCH_STATUS = [
  'To Review', 'In Progress', 'Reviewed', 'Applied', 'Archived', 'Outdated'
];
const TOPIC_CATEGORIES = [
  'Engineering', 'Cultural Customs', 'Biology', 'History', 'Geography', 
  'Technology', 'Politics', 'Economics', 'Science', 'Sociology', 'Language',
  'Religion', 'Military', 'Architecture', 'Art', 'Other'
];
const WORLD_ELEMENT_CATEGORIES = [
  'Flora', 'Fauna', 'Technology', 'Religion/Ritual', 'Mythology', 'Magic System', 
  'Language', 'Currency', 'Art/Culture', 'Transportation', 'Weapon/Tool', 
  'Material/Resource', 'Food/Drink', 'Medicine', 'Architecture', 'Other'
];
const WORLD_ELEMENT_STATUS = [
  'Common', 'Uncommon', 'Rare', 'Very Rare', 'Extinct', 'Legendary', 'Mythical', 'Unknown'
];

export const BIBLE_TYPES = ["characters", "groups_races", "locations", "events", "world_elements", "details", "research"] as const;
export type BibleType = typeof BIBLE_TYPES[number];
export const isBibleType = (value: string): value is BibleType => (BIBLE_TYPES as readonly string[]).includes(value);
const specialized: Record<string, Record<string, string[]>> = {
  events: { eventType: EVENT_TYPES, status: EVENT_STATUS_OPTIONS, participantRole: CHARACTER_ROLES, outcomeType: OUTCOME_TYPES },
  details: { type: DETAIL_TYPES, status: DETAIL_STATUS, visibility: VISIBILITY_OPTIONS },
  research: { sourceType: SOURCE_TYPES, status: RESEARCH_STATUS, topics: TOPIC_CATEGORIES },
  world_elements: { category: WORLD_ELEMENT_CATEGORIES, status: WORLD_ELEMENT_STATUS },
};
const valued: Record<string, Record<string, Array<{ value: string; label: string }>>> = {
  characters: {
    primaryRole: [{"value": "protagonist", "label": "Protagonist"}, {"value": "antagonist", "label": "Antagonist"}, {"value": "supporting", "label": "Supporting Character"}, {"value": "minor", "label": "Minor Character"}, {"value": "cameo", "label": "Cameo/Background"}],
  },
  groups_races: {
    status: [{"value": "active", "label": "Active"}, {"value": "defunct", "label": "Defunct"}, {"value": "secret", "label": "Secret/Hidden"}],
    groupCategory: [{"value": "species", "label": "Species/Race"}, {"value": "faction", "label": "Faction/Organization"}, {"value": "clan", "label": "Tribe/Clan"}, {"value": "government", "label": "Government/Political Body"}, {"value": "guild", "label": "Company/Guild"}],
  },
  locations: {
    environment: [{"value": "desert", "label": "Desert"}, {"value": "forest", "label": "Forest"}, {"value": "ice", "label": "Ice/Arctic"}, {"value": "ocean", "label": "Ocean/Aquatic"}, {"value": "volcanic", "label": "Volcanic"}, {"value": "urban", "label": "Urban"}, {"value": "industrial", "label": "Industrial"}, {"value": "space", "label": "Space/Void"}, {"value": "underground", "label": "Underground"}, {"value": "mountain", "label": "Mountain/Highland"}, {"value": "tropical", "label": "Tropical"}, {"value": "artificial", "label": "Artificial"}],
    status: [{"value": "inhabited", "label": "Inhabited"}, {"value": "abandoned", "label": "Abandoned"}, {"value": "destroyed", "label": "Destroyed"}, {"value": "hidden", "label": "Hidden/Secret"}, {"value": "construction", "label": "Under Construction"}],
    locationType: [{"value": "planet", "label": "Planet"}, {"value": "moon", "label": "Moon"}, {"value": "asteroid", "label": "Asteroid"}, {"value": "city", "label": "City"}, {"value": "station", "label": "Station"}, {"value": "structure", "label": "Structure/Building"}, {"value": "region", "label": "Region/Territory"}, {"value": "dimension", "label": "Dimension/Realm"}],
  },
};
// Aliases have the same meaning. Ambiguous labels remain separate choices.
const fieldAliases: Record<string, Record<string, string>> = { groups_races: { category: "groupCategory" }, locations: { type: "locationType" }, events: { type: "eventType", outcome: "outcomeType" } };
const choiceAliases: Record<string, Record<string, string>> = {
  "characters.primaryRole": { "NPC / Minor Character": "minor", "Cameo / Background": "cameo" },
  "groups_races.groupCategory": { "Species / Race": "species", "Organization / Faction": "faction", "Tribe / Clan": "clan", "Government / Political Body": "government", "Company / Guild": "guild" },
  "locations.locationType": { "City / Settlement": "city", "Building / Structure": "structure", "Region / Biome": "region" },
};
for (const taxonomy of Object.values(BIBLE_TAXONOMY)) {
  const aliases = fieldAliases[taxonomy.key] || {};
  for (const [from, to] of Object.entries(aliases)) {
    if (taxonomy.fields[from]) { taxonomy.fields[to] = taxonomy.fields[from]; delete taxonomy.fields[from]; }
  }
  const names = new Set([...Object.keys(taxonomy.fields), ...Object.keys(specialized[taxonomy.key] || {}), ...Object.keys(valued[taxonomy.key] || {})]);
  for (const name of names) {
    const field = taxonomy.fields[name] ||= { name, type: "single-select", required: false };
    const choices = [...(valued[taxonomy.key]?.[name] || []), ...(specialized[taxonomy.key]?.[name] || []).map(value => ({ value, label: value }))];
    for (const label of field.options || []) {
      const alias = choiceAliases[`${taxonomy.key}.${name}`]?.[label];
      if (!choices.some(item => item.value === (alias || label) || item.label.toLowerCase() === label.toLowerCase())) choices.push({ value: alias || label, label });
    }
    if (choices.length) { field.choices = choices; field.options = choices.map(item => item.value); }
  }
}
export function fieldChoices(type: string, field: string) { return BIBLE_TAXONOMY[type.toUpperCase()]?.fields[field]?.choices || []; }
export function fieldOptions(type: string, field: string) { return fieldChoices(type, field).map(option => option.value); }
export function canonicalChoice(type: string, field: string, value: unknown) {
  if (typeof value !== "string") return value;
  return choiceAliases[`${type}.${field}`]?.[value] || fieldChoices(type, field).find(item => item.value === value || item.label.toLowerCase() === value.toLowerCase())?.value || value;
}
