// Story Bible Taxonomy - Comprehensive categorization system
// Based on user-provided detailed taxonomy rules

export const STORY_BIBLE_TAXONOMY = {
  CHARACTERS: {
    name: "Characters",
    key: "characters",
    description: "People, beings, and entities in your story",
    fields: {
      primaryRole: {
        name: "Primary Role",
        type: "single-select",
        required: true,
        options: [
          "Protagonist",
          "Antagonist", 
          "Supporting Character",
          "NPC / Minor Character",
          "Cameo / Background"
        ]
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
        options: [
          "Pilot", "Scientist", "Merchant", "Warrior", "Scholar", "Healer",
          "Artist", "Leader", "Spy", "Criminal", "Noble", "Commoner"
        ]
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
        options: [
          "Species / Race",
          "Organization / Faction",
          "Tribe / Clan",
          "Government / Political Body",
          "Company / Guild"
        ]
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
        options: [
          "Planet",
          "Moon",
          "City / Settlement",
          "Building / Structure",
          "Region / Biome",
          "Station / Ship",
          "Dungeon / Ruin",
          "Other"
        ]
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
        options: [
          "Desert", "Forest", "Ice", "Urban", "Underwater", "Mountain",
          "Plains", "Swamp", "Volcanic", "Space", "Underground"
        ]
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
        options: [
          "Capital", "Trading Hub", "Military Base", "Sacred Site",
          "Research Facility", "Mining Colony", "Agricultural Center"
        ]
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
        options: [
          "Conflict / Battle",
          "Discovery / Invention",
          "Diplomacy / Treaty",
          "Personal Milestone",
          "Catastrophe / Disaster",
          "Festival / Ceremony",
          "Migration / Exploration",
          "Other"
        ]
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
        options: [
          "Victory", "Defeat", "Alliance Formed", "Cataclysm", 
          "Turning Point", "Discovery Made", "Treaty Signed"
        ]
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
        options: [
          "Flora", "Fauna", "Religion/Ritual", "Mythology", "Item/Artifact",
          "Language", "System", "Entertainment", "Clothing", "Food",
          "Disease/Medicine", "Law/Politics", "Professions", "Technology",
          "Astronomy", "Weather"
        ]
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
        habitat: { name: "Habitat", type: "text" },
        growthBehavior: { name: "Growth Behavior", type: "text" },
        uses: { name: "Uses", type: "multi-select", options: ["Edible", "Medicinal", "Material", "Decorative"] },
        threats: { name: "Threats", type: "text" },
        lifecycle: { name: "Lifecycle", type: "text" }
      },
      Fauna: {
        habitat: { name: "Habitat", type: "text" },
        diet: { name: "Diet", type: "single-select", options: ["Carnivore", "Herbivore", "Omnivore", "Other"] },
        behavior: { name: "Behavior", type: "text" },
        lifecycle: { name: "Lifecycle", type: "text" },
        domestication: { name: "Domestication Status", type: "single-select", options: ["Wild", "Domestic", "Semi-domestic"] },
        threatLevel: { name: "Threat Level", type: "single-select", options: ["Harmless", "Low", "Moderate", "High", "Extreme"] }
      },
      Technology: {
        inventor: { name: "Inventor/Creator", type: "text" },
        powerSource: { name: "Power Source", type: "text" },
        functionalDescription: { name: "Functional Description", type: "textarea" },
        limitations: { name: "Limitations", type: "text" },
        adoptionLevel: { name: "Adoption Level", type: "single-select", options: ["Prototype", "Limited", "Common", "Universal"] }
      }
    }
  },

  // Note: Flora, Fauna, Religion/Ritual, Mythology, Item/Artifact are handled as World Elements subcategories

  LANGUAGE: {
    name: "Language",
    key: "language",
    description: "Languages, dialects, and communication systems",
    subcategories: {
      SPOKEN: "Spoken Language",
      WRITTEN: "Written Script",
      SIGN: "Sign Language",
      ANCIENT: "Ancient/Dead Language",
      DIALECT: "Dialect/Accent", 
      CODE: "Code/Cipher",
      MAGICAL: "Magical Language"
    }
  },

  SYSTEM: {
    name: "System",
    key: "system",
    description: "Organizational systems and structures",
    subcategories: {
      GOVERNMENT: "Government System",
      LEGAL: "Legal System",
      EDUCATION: "Education System",
      ECONOMIC: "Economic System",
      SOCIAL: "Social System",
      MILITARY: "Military System",
      MAGICAL: "Magical System"
    }
  },

  ENTERTAINMENT: {
    name: "Entertainment", 
    key: "entertainment",
    description: "Games, sports, arts, and recreational activities",
    subcategories: {
      SPORT: "Sport/Game",
      MUSIC: "Music/Song",
      DANCE: "Dance/Performance",
      ART: "Art/Craft",
      LITERATURE: "Literature/Poetry",
      THEATER: "Theater/Drama",
      FESTIVAL: "Festival/Celebration"
    }
  },

  CLOTHING: {
    name: "Clothing",
    key: "clothing",
    description: "Garments, fashion, and attire",
    subcategories: {
      EVERYDAY: "Everyday Wear",
      FORMAL: "Formal/Ceremonial",
      UNIFORM: "Uniform/Professional",
      ARMOR: "Protective Clothing",
      CULTURAL: "Cultural/Traditional",
      SEASONAL: "Seasonal Wear",
      ACCESSORY: "Accessory/Jewelry"
    }
  },

  FOOD: {
    name: "Food",
    key: "food", 
    description: "Cuisine, dishes, and culinary traditions",
    subcategories: {
      STAPLE: "Staple Food",
      DELICACY: "Delicacy/Specialty",
      BEVERAGE: "Beverage/Drink",
      SPICE: "Spice/Seasoning",
      PRESERVED: "Preserved Food",
      CEREMONIAL: "Ceremonial Food",
      STREET_FOOD: "Street Food",
      FOREIGN: "Foreign Cuisine"
    }
  },

  DISEASE_MEDICINE: {
    name: "Disease/Medicine",
    key: "disease_medicine",
    description: "Illnesses, treatments, and medical practices",
    subcategories: {
      DISEASE: "Disease/Illness",
      CURE: "Cure/Treatment",
      HERB: "Medicinal Herb",
      PRACTICE: "Medical Practice",
      HEALER: "Healer/Physician Type",
      EPIDEMIC: "Epidemic/Plague",
      INJURY: "Injury/Wound Type"
    }
  },

  LAW_POLITICS: {
    name: "Law/Politics",
    key: "law_politics",
    description: "Legal codes, political structures, and governance",
    subcategories: {
      LAW: "Law/Statute",
      COURT: "Court/Legal Process",
      PUNISHMENT: "Punishment/Penalty",
      POLITICAL_STRUCTURE: "Political Structure",
      TREATY: "Treaty/Agreement",
      ELECTION: "Election/Selection",
      POLICY: "Policy/Decree"
    }
  },

  PROFESSIONS: {
    name: "Professions",
    key: "professions",
    description: "Jobs, trades, and occupations",
    subcategories: {
      ARTISAN: "Artisan/Craftsperson",
      MERCHANT: "Merchant/Trader",
      SCHOLAR: "Scholar/Academic",
      WARRIOR: "Warrior/Soldier",
      SERVANT: "Servant/Laborer",
      ENTERTAINER: "Entertainer/Artist",
      RELIGIOUS: "Religious Professional",
      MAGICAL: "Magical Professional"
    }
  },

  TECHNOLOGY: {
    name: "Technology",
    key: "technology",
    description: "Technological innovations and scientific advances",  
    subcategories: {
      TRANSPORTATION: "Transportation",
      COMMUNICATION: "Communication",
      WEAPON: "Weapon Technology",
      CONSTRUCTION: "Construction/Architecture",
      MANUFACTURING: "Manufacturing/Industry",
      ENERGY: "Energy/Power",
      MEDICAL: "Medical Technology"
    }
  },

  ASTRONOMY: {
    name: "Astronomy",
    key: "astronomy",
    description: "Celestial bodies, cosmic phenomena, and space",
    subcategories: {
      STAR: "Star/Sun",
      PLANET: "Planet",
      MOON: "Moon/Satellite", 
      CONSTELLATION: "Constellation",
      COSMIC_EVENT: "Cosmic Event",
      CALENDAR: "Calendar/Time System",
      NAVIGATION: "Celestial Navigation"
    }
  },

  WEATHER: {
    name: "Weather",
    key: "weather",
    description: "Climate patterns, weather phenomena, and atmospheric conditions",
    subcategories: {
      SEASON: "Season/Climate",
      STORM: "Storm/Severe Weather",
      PHENOMENON: "Weather Phenomenon", 
      MAGICAL_WEATHER: "Magical Weather",
      REGIONAL_CLIMATE: "Regional Climate"
    }
  },

  DETAILS: {
    name: "Details",
    key: "details",
    description: "Miscellaneous notes and observations",
    subcategories: {
      NOTE: "General Note",
      OBSERVATION: "Observation", 
      REMINDER: "Reminder",
      INSPIRATION: "Inspiration",
      QUESTION: "Question/Plot Hole"
    }
  },

  RESEARCH: {
    name: "Research",
    key: "research",
    description: "External references, sources, and research materials",
    subcategories: {
      ARTICLE: "Article",
      BOOK: "Book/Publication",
      VIDEO: "Video/Documentary",
      IMAGE: "Image/Visual Reference",
      MAP: "Map/Diagram",
      INTERVIEW: "Interview/Conversation",
      DOCUMENT: "Document/Archive",
      WEBSITE: "Website/Online Resource",
      ACADEMIC: "Academic Paper"
    }
  }
} as const;

// Helper functions for taxonomy operations
export function getTaxonomyKeys() {
  return Object.keys(STORY_BIBLE_TAXONOMY) as Array<keyof typeof STORY_BIBLE_TAXONOMY>;
}

export function getTaxonomyByKey(key: string) {
  return STORY_BIBLE_TAXONOMY[key as keyof typeof STORY_BIBLE_TAXONOMY];
}

export function getTaxonomySubcategories(entryType: string) {
  const taxonomy = getTaxonomyByKey(entryType.toUpperCase());
  return (taxonomy && 'subcategories' in taxonomy) ? taxonomy.subcategories : {};
}

export function getAllSubcategories() {
  const allSubcategories: Record<string, string> = {};
  Object.values(STORY_BIBLE_TAXONOMY).forEach(taxonomy => {
    if ('subcategories' in taxonomy && taxonomy.subcategories) {
      Object.assign(allSubcategories, taxonomy.subcategories);
    }
  });
  return allSubcategories;
}

export function getEntryTypeDisplayName(key: string) {
  const taxonomy = getTaxonomyByKey(key.toUpperCase());
  return taxonomy?.name || key;
}

export function getTaxonomyFields(entryType: string) {
  const taxonomy = getTaxonomyByKey(entryType.toUpperCase());
  return (taxonomy && 'fields' in taxonomy) ? taxonomy.fields : {};
}

export function getCategorySpecificFields(entryType: string, category?: string) {
  const taxonomy = getTaxonomyByKey(entryType.toUpperCase());
  if (taxonomy && 'categoryFields' in taxonomy && category) {
    return (taxonomy as any).categoryFields[category] || {};
  }
  return {};
}

// Validation schemas
export const VALID_ENTRY_TYPES = getTaxonomyKeys().map(key => 
  STORY_BIBLE_TAXONOMY[key].key
);

export const ENTRY_TYPE_SCHEMA = {
  characters: STORY_BIBLE_TAXONOMY.CHARACTERS,
  groups_races: STORY_BIBLE_TAXONOMY.GROUPS_RACES,
  locations: STORY_BIBLE_TAXONOMY.LOCATIONS,
  events: STORY_BIBLE_TAXONOMY.EVENTS,
  world_elements: STORY_BIBLE_TAXONOMY.WORLD_ELEMENTS,

  language: STORY_BIBLE_TAXONOMY.LANGUAGE,
  system: STORY_BIBLE_TAXONOMY.SYSTEM,
  entertainment: STORY_BIBLE_TAXONOMY.ENTERTAINMENT,
  clothing: STORY_BIBLE_TAXONOMY.CLOTHING,
  food: STORY_BIBLE_TAXONOMY.FOOD,
  disease_medicine: STORY_BIBLE_TAXONOMY.DISEASE_MEDICINE,
  law_politics: STORY_BIBLE_TAXONOMY.LAW_POLITICS,
  professions: STORY_BIBLE_TAXONOMY.PROFESSIONS,
  technology: STORY_BIBLE_TAXONOMY.TECHNOLOGY,
  astronomy: STORY_BIBLE_TAXONOMY.ASTRONOMY,
  weather: STORY_BIBLE_TAXONOMY.WEATHER,
  details: STORY_BIBLE_TAXONOMY.DETAILS,
  research: STORY_BIBLE_TAXONOMY.RESEARCH,
} as const;