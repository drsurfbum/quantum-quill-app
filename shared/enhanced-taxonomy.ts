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