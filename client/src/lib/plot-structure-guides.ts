export interface PlotStructureGuide {
  bestFit: string;
  title: string;
  teacher: string;
  videoId: string;
  duration: string;
  note?: string;
}

// Editorial provenance and verification: docs/PLOT_STRUCTURE_GUIDES.md.
// Use stable template types, never database IDs or editable display names.
export const plotStructureGuides: Readonly<Record<string, PlotStructureGuide>> = {
  freytag: {
    bestFit: "A dramatic rise, a decisive turning point, and room to explore the consequences. Especially useful for tragedy.",
    title: "Plotting a Novel with Freytag's Pyramid",
    teacher: "Reedsy",
    videoId: "Xi-gjqz-4eA",
    duration: "7 min",
    note: "The lesson explains the original tragic arc. QQ uses a broader resolution section; your ending need not be tragic.",
  },
  hero_journey: {
    bestFit: "A character leaves familiar life, faces trials, and returns transformed. Useful for quests and stories of personal growth.",
    title: "12 Stages Of The Hero's Journey - Christopher Vogler",
    teacher: "Christopher Vogler · Film Courage",
    videoId: "oNNaMuBOxv4",
    duration: "23 min",
    note: "Vogler explains the 12-stage adaptation used by this template.",
  },
  three_act: {
    bestFit: "A flexible starting point when you know the central conflict and want to shape its setup, escalation, and payoff.",
    title: "Three Act Structure Explained — The Secret to Telling a Great Story",
    teacher: "K.M. Weiland · StudioBinder",
    videoId: "tvqjp1CxxD8",
    duration: "27 min",
  },
  story_circle: {
    bestFit: "A character wants something, leaves their comfort zone, pays a price, and changes. Useful for compact, character-focused arcs.",
    title: "Dan Harmon Story Circle: 8 Proven Steps to Better Stories",
    teacher: "StudioBinder",
    videoId: "-XGUVkOmPTA",
    duration: "9 min",
  },
  fichtean_curve: {
    bestFit: "A fast-moving story driven by one crisis after another. Useful for suspense when you want to reveal background as the action unfolds.",
    title: "How to Structure a Book with the Fichtean Curve",
    teacher: "Reedsy",
    videoId: "EyO6E1ggR2o",
    duration: "8 min",
  },
  save_the_cat: {
    bestFit: "A detailed roadmap for pacing and character change. Useful when you want specific checkpoints while outlining or revising a novel.",
    title: "How to Write a Novel in 15 Steps with the Save the Cat! Beat Sheet",
    teacher: "Jessica Brody",
    videoId: "k8EfEEjbwGk",
    duration: "11 min",
  },
  seven_point: {
    bestFit: "You know the ending and want to work backward through major turns and pressure points, leaving room between them.",
    title: "Dan Wells on Story Structure",
    teacher: "Dan Wells · NarraVerso com Felipe Rocha",
    videoId: "iCfd8K5PAnc",
    duration: "46 min",
    note: "Full lecture, assembled from the original five recordings. Older audio includes music between parts.",
  },
  freeform: {
    bestFit: "You want to invent your own sections, combine approaches, or discover the shape of the story as you write.",
    title: "Planners & Pantsers (Gardener & Architect) | Brandon Sanderson",
    teacher: "Brandon Sanderson",
    videoId: "2EwI90ZOGRk",
    duration: "8 min",
    note: "Related lesson on writing process: Freeform has no fixed beats, and this is not a walkthrough of QQ.",
  },
};

export function getPlotStructureGuide(templateType: string): PlotStructureGuide | undefined {
  return Object.hasOwn(plotStructureGuides, templateType) ? plotStructureGuides[templateType] : undefined;
}
