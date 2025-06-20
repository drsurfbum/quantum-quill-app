// Enhanced Story Bible Taxonomy - Field-based structure
// Based on detailed taxonomy rules provided by user

export interface TaxonomyField {
  name: string;
  type: "text" | "textarea" | "single-select" | "multi-select" | "checkbox" | "single-select-linked" | "multi-select-linked";
  required: boolean;
  options?: string[];
  linkedTo?: string;
}

export interface TaxonomyCategory {
  name: string;
  key: string;
  description: string;
  fields: Record<string, TaxonomyField>;
  categoryFields?: Record<string, Record<string, TaxonomyField>>;
}

export const ENHANCED_TAXONOMY: Record<string, TaxonomyCategory> = {
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
      eraDisolved: {
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

// Helper functions
export function getEnhancedTaxonomyKeys() {
  return Object.keys(ENHANCED_TAXONOMY);
}

export function getEnhancedTaxonomyByKey(key: string) {
  return ENHANCED_TAXONOMY[key.toUpperCase()];
}

export function getEnhancedTaxonomyFields(entryType: string) {
  const taxonomy = getEnhancedTaxonomyByKey(entryType);
  return taxonomy?.fields || {};
}

export function getCategorySpecificFields(entryType: string, category?: string) {
  const taxonomy = getEnhancedTaxonomyByKey(entryType);
  if (taxonomy?.categoryFields && category) {
    return taxonomy.categoryFields[category] || {};
  }
  return {};
}

export function getEntryTypeDisplayName(key: string) {
  const taxonomy = getEnhancedTaxonomyByKey(key);
  return taxonomy?.name || key;
}