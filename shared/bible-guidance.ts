import { isBibleType, type BibleType } from "./bible-catalog";
import type { RelationshipType } from "./relationships";

// Presentation only. Keys refer to the existing catalog, editors and shared links;
// these prompts are never defaults, validation rules or stored entry values.
type GroupGuide = { title: string; prompt: string; start?: boolean };
type FieldGuide = { help: string; example?: string };
type TypeGuide = {
  purpose: string;
  examples: string;
  distinction?: string;
  groups: Record<string, GroupGuide>;
  fields: Record<string, FieldGuide>;
  connections: ReadonlyArray<{ kind: RelationshipType; label: string; reason: string }>;
};

export const BIBLE_GUIDES = {
  characters: {
    purpose: "A person or individual whose choices matter to the story.",
    examples: "A reluctant navigator, a rival detective, a sentient ship.",
    distinction: "Use Groups & Races for a community or species; use Characters for an individual.",
    groups: {
      backstory: { title: "Story notes", start: true, prompt: "Who are they, and what do they want? A sentence is enough for now. Keep backstory here as it grows." },
      basicInfo: { title: "Identity & role", prompt: "Add the facts you need to recognize this character. Age, gender and species can wait." },
      personality: { title: "Personality & motivations", prompt: "Explore what drives their choices and what gets in their way." },
      appearance: { title: "Appearance", prompt: "Record details the reader or another character would notice." },
      abilities: { title: "Abilities & skills", prompt: "What can they do, and when does it matter?" },
    },
    fields: {
      primaryRole: { help: "Their function in this story, rather than their job.", example: "A lighthouse keeper may be an ally, antagonist or protagonist." },
      origin: { help: "A written note about where they come from. Add a Home location connection when you want a linked place." },
      species: { help: "Their species in your own words. An affiliation can also connect them to a Groups & Races entry." },
      beliefs: { help: "What they believe about the world; it can be true, mistaken or unresolved.", example: "Keeping a secret is the only way to protect someone." },
      motivations: { help: "Why they act: the desire or pressure behind their choices.", example: "Find her brother before the next tide." },
      conflicts: { help: "What opposes that desire, inside or outside the character.", example: "Finding him means betraying the people who raised her." },
      category: { help: "Your own organizational label. It does not change this entry’s type." },
    },
    connections: [
      { kind: "affiliation", label: "Add an affiliation", reason: "Connect a faction, community or species they belong to." },
      { kind: "home", label: "Add a home location", reason: "Connect the place they call home." },
    ],
  },
  groups_races: {
    purpose: "People united by membership, culture, ancestry or a shared cause.",
    examples: "A navigators’ guild, a ruling family, a fictional species.",
    distinction: "Keep both groups and species here. Give individual members their own Character entries.",
    groups: {
      basicInfo: { title: "Group at a glance", start: true, prompt: "What unites them? Start with a short description; classification can wait." },
      hierarchy: { title: "Hierarchy & history dates", prompt: "Place this group inside a larger organization or record when it began." },
      leadership: { title: "Leadership & membership", prompt: "Describe how decisions are made and connect the people who make them." },
      attributes: { title: "Culture, purpose & traits", prompt: "Develop what makes this organization or species distinct. Use only the fields that fit." },
      history: { title: "History & events", prompt: "Record how the group became what it is. Link significant events when useful." },
      relationships: { title: "Alliances & rivalries", prompt: "Keep free-text notes here; use shared connections for links to actual groups." },
      notes: { title: "Development notes", prompt: "Keep questions and possibilities without treating them as settled story facts." },
    },
    fields: {
      groupCategory: { help: "What kind of group or species this is. The fields below adapt to this choice." },
      tagline: { help: "One sentence about what unites them; it need not be a literal motto.", example: "Navigators who control which islands appear on official charts." },
      category: { help: "An optional organizational label, separate from the group’s kind." },
      ideology: { help: "The beliefs this group promotes; individual members can disagree." },
      physiology: { help: "Physical characteristics of a species, when relevant. Skip for ordinary organizations." },
      eraEstablished: { help: "A date, approximate period or invented era is welcome." },
    },
    connections: [
      { kind: "member", label: "Add a member", reason: "Connect a character who belongs to this group." },
      { kind: "home", label: "Add a home location", reason: "Connect their base, homeland or homeworld." },
    ],
  },
  locations: {
    purpose: "A place where your story can happen, at any scale.",
    examples: "A harbor city, a room above a clock tower, a spaceship.",
    distinction: "Use World Elements for how a technology or phenomenon works; use Locations for a particular place.",
    groups: {
      coreInfo: { title: "Place at a glance", start: true, prompt: "What is this place, and why might a scene happen here? Start with a short description." },
      physical: { title: "Environment & physical features", prompt: "Add the sensory or practical details that affect a visit." },
      significance: { title: "Purpose & significance", prompt: "Explain what people do here and why the place matters." },
      history: { title: "History & dates", prompt: "Describe how this place changed; dates can use your world’s calendar." },
      relational: { title: "Nearby places & world connections", prompt: "Connect neighboring places and related world elements when you need them." },
      notes: { title: "Development notes", prompt: "Leave room for unanswered questions, possibilities and reminders." },
    },
    fields: {
      locationType: { help: "The kind of place. Some kinds reveal specialized fields; changing this does not convert the entry type." },
      tagline: { help: "A brief description that helps you recognize the place.", example: "A tidal port whose lighthouse has been dark for seventeen years." },
      category: { help: "An optional organizational label for browsing your library." },
      purpose: { help: "What people use this place for, separate from its physical appearance." },
      significance: { help: "Why this place matters to the story or its people." },
    },
    connections: [
      { kind: "inhabitant", label: "Add an inhabitant", reason: "Connect a person or group who lives here." },
      { kind: "parent", label: "Add a containing place", reason: "Place a room inside a building, or a city inside a region." },
    ],
  },
  events: {
    purpose: "Something that happens and changes the story or its history.",
    examples: "A treaty, a disappearance, the night every lighthouse went dark.",
    groups: {
      coreSummary: { title: "What happened", start: true, prompt: "Capture the change in one sentence. Participants and exact dates can come later." },
      narrative: { title: "Causes & story context", prompt: "Develop why it happened, what changed and whose account can be trusted." },
      dateEra: { title: "Date & era", prompt: "Add chronology when useful. Uncertain dates and fictional calendars are welcome." },
      notes: { title: "Writer’s notes & alternatives", prompt: "Keep secrets, possible versions and research questions separate from the event itself." },
    },
    fields: {
      fictionalDate: { help: "A date in your world’s own language; no real-world calendar is required.", example: "Third night of the winter turning, seventeen years ago." },
      shortSummary: { help: "The change that defines the event.", example: "Every lighthouse on the outer coast goes dark on the same night." },
      era: { help: "A broad period that gives this event context, even before you know its exact date." },
      hiddenDetails: { help: "Facts the writer knows but characters or readers may not. This does not change account permissions." },
      alternativeVersions: { help: "Possibilities you are considering, rather than additional events automatically added to the story." },
    },
    connections: [
      { kind: "participant", label: "Add a participant", reason: "Connect the characters or groups involved." },
      { kind: "occurs_at", label: "Add an event location", reason: "Connect where it happened." },
    ],
  },
  world_elements: {
    purpose: "An invented thing, system, belief or phenomenon that belongs to your world.",
    examples: "A tide-powered engine, a memory ritual, a chart that changes with the sea.",
    distinction: "World Elements holds what exists or works in the story. Details holds a writing note or clue; Research holds outside evidence and sources.",
    groups: {
      coreOverview: { title: "Element at a glance", start: true, prompt: "What is it, and what difference does it make? A short note is enough to begin." },
      categoryDetails: { title: "How it works", prompt: "Explore the fields for the selected category. Skip any that do not serve your story." },
      originsHistory: { title: "Origins & discovery", prompt: "Describe where it came from or who first understood it." },
      loreHooks: { title: "Lore & story possibilities", prompt: "Add rumors, sayings and details that can bring it into a scene." },
    },
    fields: {
      category: { help: "The kind of element. It reveals specialized prompts without changing this Story Bible type." },
      shortNotes: { help: "A one-line explanation of what it is or why it matters.", example: "A translucent chart that reveals routes ordinary ink cannot hold." },
      limitations: { help: "What it cannot do, or the cost of using it; useful boundaries for scenes." },
      discoveryOrigin: { help: "How it was discovered or invented, which may differ from its true origin." },
      loreHooks: { help: "Ways this element could create a question, choice or problem in a scene.", example: "The chart fills a blank margin only when someone names a forgotten island." },
      rumors: { help: "What people say about it; these claims need not be true." },
    },
    connections: [
      { kind: "used_by", label: "Add someone who uses it", reason: "Connect a character or group who uses this element." },
      { kind: "affects", label: "Add an affected place", reason: "Connect a location shaped by this element." },
    ],
  },
  details: {
    purpose: "A small writing note, clue, motif, quote or idea you want to keep track of.",
    examples: "A recurring unlit lantern, a clue to plant in chapter two, a line of dialogue.",
    distinction: "Use Details for how you might use an idea in the writing. Use World Elements for an in-world thing or rule, and Research for outside sources or factual investigation.",
    groups: {
      coreLink: { title: "Detail at a glance", start: true, prompt: "Give the note a short summary if useful. Type, status and connections can wait." },
      content: { title: "The note or idea", start: true, prompt: "Capture the useful part in your own words. It can be unfinished." },
      contextUsage: { title: "Context & intended use", prompt: "Decide where the idea might pay off without committing to it yet." },
      archiveResolution: { title: "Resolution notes", prompt: "Record what happened to the idea when it has been used, changed or set aside." },
    },
    fields: {
      shortSummary: { help: "A quick reminder of the note’s purpose.", example: "An unlit lantern marks a moment of withheld truth." },
      explanation: { help: "Where or when you might use this note in the manuscript.", example: "Bring it back when Mara finally chooses honesty." },
      visibility: { help: "A planning label retained from earlier forms. It does not share the entry or change account access." },
      status: { help: "Track this idea’s progress. Archiving is a separate explicit control." },
    },
    connections: [{ kind: "application", label: "Add where it applies", reason: "Connect the person, place, event or idea this note concerns." }],
  },
  research: {
    purpose: "Outside sources, observations and factual questions that inform your writing.",
    examples: "A navigation handbook, an interview, notes on tides to verify later.",
    distinction: "Keep evidence and source references here. Put established fictional rules in World Elements, and reminders about using them in Details.",
    groups: {
      coreInfo: { title: "Source & takeaway", start: true, prompt: "What did you find? Start with a takeaway; add a source reference when you have one." },
      detailedNotes: { title: "Evidence & detailed notes", prompt: "Keep useful facts, quotations and your own observations distinct." },
      tagsTopics: { title: "Topics & tags", prompt: "Organize this research when you need to find it again." },
      linkedApplications: { title: "Where it applies", prompt: "Connect the story elements informed by this source." },
      utilityActions: { title: "Next steps & writing plans", prompt: "Separate what needs checking from how you might use the findings." },
      teamNotes: { title: "Reminders & notes", prompt: "Keep questions and reminders here. This does not share the entry with other accounts." },
    },
    fields: {
      urlOrReference: { help: "A link, book and page number, interview date or another way to find the source again.", example: "Coastal Navigation Handbook, chapter 4, pages 52–57." },
      shortSummary: { help: "Your most useful takeaway; incomplete findings are welcome.", example: "Tide height and the direction of the current are different measurements." },
      nextSteps: { help: "What still needs verifying or investigating." },
      incorporationPlans: { help: "How the findings might affect the story; this does not insert anything into your manuscript." },
      status: { help: "The progress of your research, separate from archiving the entry." },
    },
    connections: [{ kind: "application", label: "Add where it applies", reason: "Connect the character, place or other entry this research informs." }],
  },
} satisfies Record<BibleType, TypeGuide>;

export function bibleGuide(type: string): TypeGuide | undefined {
  return isBibleType(type) ? BIBLE_GUIDES[type] : undefined;
}
