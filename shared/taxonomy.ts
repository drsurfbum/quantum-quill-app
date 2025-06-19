// Story Bible Taxonomy - Comprehensive categorization system
// Based on user-provided organizational taxonomy

export const STORY_BIBLE_TAXONOMY = {
  CHARACTERS: {
    name: "Characters",
    key: "characters",
    description: "People, beings, and entities in your story",
    subcategories: {
      PROTAGONIST: "Protagonist",
      ANTAGONIST: "Antagonist", 
      SUPPORTING: "Supporting Character",
      MINOR: "Minor Character",
      CROWD: "Crowd Character",
      HISTORICAL: "Historical Figure",
      MYTHICAL: "Mythical Being"
    }
  },
  
  GROUPS_RACES: {
    name: "Groups & Races",
    key: "groups_races",
    description: "Species, races, organizations, and collective entities",
    subcategories: {
      SPECIES: "Species",
      RACE: "Race/Ethnicity",
      ORGANIZATION: "Organization",
      FACTION: "Faction",
      GUILD: "Guild",
      FAMILY: "Family/Clan",
      GOVERNMENT: "Government Body",
      MILITARY: "Military Unit",
      RELIGIOUS_ORDER: "Religious Order",
      SECRET_SOCIETY: "Secret Society"
    }
  },

  LOCATIONS: {
    name: "Locations",
    key: "locations", 
    description: "Places, settings, and geographical features",
    subcategories: {
      SETTLEMENT: "Settlement",
      BUILDING: "Building",
      ROOM: "Room/Interior",
      NATURAL: "Natural Feature",
      CELESTIAL: "Celestial Body",
      TRANSPORTATION: "Vehicle/Vessel",
      DIMENSION: "Dimension/Realm",
      REGION: "Region/Territory"
    }
  },

  EVENTS: {
    name: "Events",
    key: "events",
    description: "Historical events, battles, ceremonies, and occurrences",
    subcategories: {
      HISTORICAL: "Historical Event",
      BATTLE: "Battle/Conflict",
      CEREMONY: "Ceremony/Ritual",
      FESTIVAL: "Festival/Celebration",
      DISASTER: "Disaster/Catastrophe",
      DISCOVERY: "Discovery/Invention",
      POLITICAL: "Political Event",
      PERSONAL: "Personal Event"
    }
  },

  WORLD_ELEMENTS: {
    name: "World Elements",
    key: "world_elements",
    description: "Core elements that define your world",
    subcategories: {
      MAGIC_SYSTEM: "Magic System",
      TECHNOLOGY: "Technology",
      NATURAL_PHENOMENON: "Natural Phenomenon",
      CURRENCY: "Currency/Economy",
      TRANSPORTATION: "Transportation",
      COMMUNICATION: "Communication"
    }
  },

  FLORA: {
    name: "Flora",
    key: "flora",
    description: "Plants, trees, and vegetation",
    subcategories: {
      TREE: "Tree",
      FLOWER: "Flower",
      CROP: "Crop/Food Plant",
      HERB: "Herb/Medicine",
      FUNGUS: "Fungus/Mushroom",
      AQUATIC: "Aquatic Plant",
      MAGICAL: "Magical Plant",
      POISONOUS: "Poisonous Plant"
    }
  },

  FAUNA: {
    name: "Fauna", 
    key: "fauna",
    description: "Animals, creatures, and beasts",
    subcategories: {
      DOMESTIC: "Domestic Animal",
      WILD: "Wild Animal",
      PREDATOR: "Predator",
      MAGICAL: "Magical Creature",
      MYTHICAL: "Mythical Beast",
      AQUATIC: "Aquatic Creature",
      AERIAL: "Flying Creature",
      EXTINCT: "Extinct Species"
    }
  },

  RELIGION_RITUAL: {
    name: "Religion/Ritual",
    key: "religion_ritual", 
    description: "Religious beliefs, deities, and ceremonial practices",
    subcategories: {
      DEITY: "Deity/God",
      RELIGION: "Religion/Faith",
      RITUAL: "Ritual/Ceremony",
      HOLY_SITE: "Holy Site/Temple", 
      RELIGIOUS_TEXT: "Religious Text",
      AFTERLIFE: "Afterlife/Death Beliefs",
      PRAYER: "Prayer/Incantation",
      RELIGIOUS_ORDER: "Religious Order"
    }
  },

  MYTHOLOGY: {
    name: "Mythology",
    key: "mythology",
    description: "Myths, legends, and folklore",
    subcategories: {
      CREATION_MYTH: "Creation Myth",
      LEGEND: "Legend",
      FOLKTALE: "Folktale",
      PROPHECY: "Prophecy",
      CURSE: "Curse/Blessing",
      HERO_TALE: "Hero Tale",
      ORIGIN_STORY: "Origin Story"
    }
  },

  ITEM_ARTIFACT: {
    name: "Item/Artifact",
    key: "item_artifact",
    description: "Objects, tools, weapons, and artifacts",
    subcategories: {
      WEAPON: "Weapon",
      ARMOR: "Armor/Protection",
      TOOL: "Tool/Instrument",
      JEWELRY: "Jewelry/Accessory",
      BOOK: "Book/Document",
      MAGICAL_ITEM: "Magical Item",
      RELIC: "Relic/Artifact",
      EVERYDAY_OBJECT: "Everyday Object"
    }
  },

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

export function getAllSubcategories(entryType: string) {
  const taxonomy = getTaxonomyByKey(entryType.toUpperCase());
  return taxonomy ? Object.values(taxonomy.subcategories) : [];
}

export function getEntryTypeDisplayName(key: string) {
  const taxonomy = getTaxonomyByKey(key.toUpperCase());
  return taxonomy?.name || key;
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
  flora: STORY_BIBLE_TAXONOMY.FLORA,
  fauna: STORY_BIBLE_TAXONOMY.FAUNA,
  religion_ritual: STORY_BIBLE_TAXONOMY.RELIGION_RITUAL,
  mythology: STORY_BIBLE_TAXONOMY.MYTHOLOGY,
  item_artifact: STORY_BIBLE_TAXONOMY.ITEM_ARTIFACT,
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