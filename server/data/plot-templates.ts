import { InsertPlotStructureTemplate } from '@shared/schema';

/**
 * Default plot structure templates
 * These will be inserted into the database on first run
 */

export const plotTemplates: InsertPlotStructureTemplate[] = [
  // 1. Freytag's Pyramid
  {
    templateType: 'freytag',
    name: "Freytag's Pyramid",
    description: "A five-act dramatic structure that includes exposition, rising action, climax, falling action, and resolution.",
    sections: JSON.stringify([
      {
        key: 'exposition',
        title: 'Exposition',
        description: 'Introduce the setting, characters, and the basic conflict. Set the stage for what follows.',
        order: 1
      },
      {
        key: 'rising_action',
        title: 'Rising Action',
        description: 'Series of events that build up tension and complications, leading toward the climax.',
        order: 2
      },
      {
        key: 'climax',
        title: 'Climax',
        description: 'The turning point and moment of highest tension in the story. The protagonist faces the central conflict directly.',
        order: 3
      },
      {
        key: 'falling_action',
        title: 'Falling Action',
        description: 'Events following the climax that show the consequences of decisions made during the climactic moment.',
        order: 4
      },
      {
        key: 'resolution',
        title: 'Resolution (Dénouement)',
        description: 'Final resolution of the story\'s conflicts. Loose ends are tied up and a new normal is established.',
        order: 5
      }
    ]),
    isDefault: true
  },

  // 2. The Hero's Journey
  {
    templateType: 'hero_journey',
    name: "The Hero's Journey",
    description: "Joseph Campbell's monomyth structure featuring a hero who goes on an adventure, faces challenges, wins victory, and returns transformed.",
    sections: JSON.stringify([
      {
        key: 'ordinary_world',
        title: 'Ordinary World',
        description: 'The hero\'s normal world before the adventure begins. Establishes the character\'s normal life and limitations.',
        order: 1
      },
      {
        key: 'call_to_adventure',
        title: 'Call to Adventure',
        description: 'The hero is presented with a challenge, problem, or adventure to undertake.',
        order: 2
      },
      {
        key: 'refusal_of_call',
        title: 'Refusal of the Call',
        description: 'The hero initially refuses the call due to fear, insecurity, or other obligations.',
        order: 3
      },
      {
        key: 'meeting_the_mentor',
        title: 'Meeting the Mentor',
        description: 'The hero encounters a mentor figure who provides guidance, wisdom, or magical aid.',
        order: 4
      },
      {
        key: 'crossing_threshold',
        title: 'Crossing the First Threshold',
        description: 'The hero commits to the adventure and crosses into the special world where the rules are different.',
        order: 5
      },
      {
        key: 'tests_allies_enemies',
        title: 'Tests, Allies, and Enemies',
        description: 'The hero faces tests, makes allies, and confronts enemies in the special world.',
        order: 6
      },
      {
        key: 'approach_inmost_cave',
        title: 'Approach to the Inmost Cave',
        description: 'The hero prepares for the major challenge ahead, often involving introspection or preparation.',
        order: 7
      },
      {
        key: 'ordeal',
        title: 'The Ordeal',
        description: 'The hero faces their greatest fear or challenge, a moment of "death and rebirth."',
        order: 8
      },
      {
        key: 'reward',
        title: 'Reward (Seizing the Sword)',
        description: 'The hero obtains what they sought, be it a physical object, knowledge, or reconciliation.',
        order: 9
      },
      {
        key: 'road_back',
        title: 'The Road Back',
        description: 'The hero begins the journey back to the ordinary world, often pursued by remaining threats.',
        order: 10
      },
      {
        key: 'resurrection',
        title: 'Resurrection',
        description: 'The hero faces a final test, using all they\'ve learned to overcome the ultimate challenge.',
        order: 11
      },
      {
        key: 'return_with_elixir',
        title: 'Return with the Elixir',
        description: 'The hero returns to the ordinary world with something that can benefit others (insight, treasure, or love).',
        order: 12
      }
    ]),
    isDefault: true
  },

  // 3. Three Act Structure
  {
    templateType: 'three_act',
    name: "Three Act Structure",
    description: "A traditional storytelling approach divided into beginning (setup), middle (confrontation), and end (resolution).",
    sections: JSON.stringify([
      {
        key: 'act1_setup',
        title: 'Act 1: Setup',
        description: 'Introduce the main characters, setting, and the central conflict. Ends with an inciting incident that launches the main storyline.',
        order: 1
      },
      {
        key: 'act1_inciting_incident',
        title: 'Inciting Incident',
        description: 'The event that sets the story in motion and disrupts the protagonist\'s normal life.',
        order: 2
      },
      {
        key: 'act1_turning_point',
        title: 'First Plot Point',
        description: 'The protagonist commits to addressing the central conflict, transitioning into Act 2.',
        order: 3
      },
      {
        key: 'act2_confrontation',
        title: 'Act 2: Confrontation',
        description: 'The protagonist faces obstacles while trying to resolve the central problem. Tension escalates.',
        order: 4
      },
      {
        key: 'act2_midpoint',
        title: 'Midpoint',
        description: 'A significant event that changes the protagonist\'s perspective or approach to their goal.',
        order: 5
      },
      {
        key: 'act2_turning_point',
        title: 'Second Plot Point',
        description: 'A major setback or revelation that propels the story into the final act.',
        order: 6
      },
      {
        key: 'act3_resolution',
        title: 'Act 3: Resolution',
        description: 'The central conflict reaches its climax and is resolved. The story concludes with a new equilibrium.',
        order: 7
      },
      {
        key: 'act3_climax',
        title: 'Climax',
        description: 'The final confrontation where the protagonist faces the antagonist or main challenge.',
        order: 8
      },
      {
        key: 'act3_denouement',
        title: 'Denouement',
        description: 'Loose ends are tied up and we see how characters have changed. The new normal is established.',
        order: 9
      }
    ]),
    isDefault: true
  },

  // 4. Dan Harmon's Story Circle
  {
    templateType: 'story_circle',
    name: "Dan Harmon's Story Circle",
    description: "An eight-step storytelling structure derived from Joseph Campbell's Hero's Journey but simplified for modern storytelling.",
    sections: JSON.stringify([
      {
        key: 'you',
        title: '1. You (A character is in a zone of comfort)',
        description: 'Establish the protagonist in their familiar environment and normal life.',
        order: 1
      },
      {
        key: 'need',
        title: '2. Need (But they want something)',
        description: 'The protagonist develops a conscious or unconscious desire for something.',
        order: 2
      },
      {
        key: 'go',
        title: '3. Go (They enter an unfamiliar situation)',
        description: 'The protagonist leaves their comfort zone and enters a new, unfamiliar situation.',
        order: 3
      },
      {
        key: 'search',
        title: '4. Search (Adapt to it)',
        description: 'The protagonist searches for what they need while adapting to the new situation.',
        order: 4
      },
      {
        key: 'find',
        title: '5. Find (Find what they wanted)',
        description: 'The protagonist gets what they were looking for, but it comes with complications.',
        order: 5
      },
      {
        key: 'take',
        title: '6. Take (Pay a heavy price for it)',
        description: 'The protagonist pays a price for getting what they wanted and faces consequences.',
        order: 6
      },
      {
        key: 'return',
        title: '7. Return (And go back to where they started)',
        description: 'The protagonist returns to their familiar situation, bringing with them new knowledge or power.',
        order: 7
      },
      {
        key: 'change',
        title: '8. Change (Having changed)',
        description: 'The protagonist has fundamentally changed as a result of their journey.',
        order: 8
      }
    ]),
    isDefault: true
  },

  // 5. Fichtean Curve
  {
    templateType: 'fichtean_curve',
    name: "Fichtean Curve",
    description: "A story structure focused on a series of rising crises that build to a major climax, with little to no falling action or resolution.",
    sections: JSON.stringify([
      {
        key: 'introduction',
        title: 'Introduction',
        description: 'Brief introduction of the character and situation, immediately leading into action.',
        order: 1
      },
      {
        key: 'crisis_1',
        title: 'First Crisis',
        description: 'The first major obstacle or challenge the protagonist faces.',
        order: 2
      },
      {
        key: 'crisis_2',
        title: 'Second Crisis',
        description: 'A more significant challenge that builds on the first crisis.',
        order: 3
      },
      {
        key: 'crisis_3',
        title: 'Third Crisis',
        description: 'An even more significant challenge that continues to raise the stakes.',
        order: 4
      },
      {
        key: 'crisis_4',
        title: 'Fourth Crisis',
        description: 'The tension continues to build with increasingly difficult obstacles.',
        order: 5
      },
      {
        key: 'final_crisis',
        title: 'Final Crisis',
        description: 'The ultimate challenge where the protagonist must use everything they\'ve learned.',
        order: 6
      },
      {
        key: 'climax',
        title: 'Climax',
        description: 'The highest point of tension and the moment of truth where the main conflict is resolved.',
        order: 7
      },
      {
        key: 'brief_resolution',
        title: 'Brief Resolution',
        description: 'A very brief conclusion showing the aftermath of the climactic moment.',
        order: 8
      }
    ]),
    isDefault: true
  },

  // 6. Save the Cat Beat Sheet
  {
    templateType: 'save_the_cat',
    name: "Save the Cat Beat Sheet",
    description: "Blake Snyder's 15-beat story structure popularly used in screenwriting but applicable to novels as well.",
    sections: JSON.stringify([
      {
        key: 'opening_image',
        title: '1. Opening Image',
        description: 'A snapshot of the main character and their world before the story begins. Sets the tone and mood.',
        order: 1
      },
      {
        key: 'theme_stated',
        title: '2. Theme Stated',
        description: 'Someone states (often indirectly) what the story is thematically about.',
        order: 2
      },
      {
        key: 'setup',
        title: '3. Setup',
        description: 'Introduce the main characters and their world, showing what needs fixing in the hero\'s life.',
        order: 3
      },
      {
        key: 'catalyst',
        title: '4. Catalyst',
        description: 'The inciting incident that sets the story in motion and disrupts the status quo.',
        order: 4
      },
      {
        key: 'debate',
        title: '5. Debate',
        description: 'The hero initially resists the call to change, weighing options and considering risks.',
        order: 5
      },
      {
        key: 'break_into_two',
        title: '6. Break into Two',
        description: 'The hero decides to accept the challenge and enters a new world or situation.',
        order: 6
      },
      {
        key: 'b_story',
        title: '7. B Story',
        description: 'A secondary story (often a love story) that carries the theme and helps the hero solve the main problem.',
        order: 7
      },
      {
        key: 'fun_and_games',
        title: '8. Fun and Games',
        description: 'The "promise of the premise" where we see the hero in their new world, exploring the concept.',
        order: 8
      },
      {
        key: 'midpoint',
        title: '9. Midpoint',
        description: 'A false victory (or false defeat) that raises the stakes and pushes the hero in a new direction.',
        order: 9
      },
      {
        key: 'bad_guys_close_in',
        title: '10. Bad Guys Close In',
        description: 'External pressures mount and internal doubts increase as enemies regroup after the midpoint.',
        order: 10
      },
      {
        key: 'all_is_lost',
        title: '11. All Is Lost',
        description: 'The opposite of the midpoint: a false defeat (or false victory) where things are at their worst.',
        order: 11
      },
      {
        key: 'dark_night_of_soul',
        title: '12. Dark Night of the Soul',
        description: 'The hero\'s darkest moment where they must dig deep to find a solution.',
        order: 12
      },
      {
        key: 'break_into_three',
        title: '13. Break into Three',
        description: 'The hero figures out a solution, often by combining A and B stories, and heads to the finale.',
        order: 13
      },
      {
        key: 'finale',
        title: '14. Finale',
        description: 'The hero executes their plan, overcomes obstacles, and resolves the central problem.',
        order: 14
      },
      {
        key: 'final_image',
        title: '15. Final Image',
        description: 'A mirror to the opening image, showing how the world and character have changed.',
        order: 15
      }
    ]),
    isDefault: true
  },

  // 7. Seven-Point Story Structure
  {
    templateType: 'seven_point',
    name: "Seven-Point Story Structure",
    description: "A story framework with seven key story points: hook, plot turn 1, pinch 1, midpoint, pinch 2, plot turn 2, and resolution.",
    sections: JSON.stringify([
      {
        key: 'hook',
        title: '1. Hook',
        description: 'The starting point that draws readers in. Establishes the character in their normal world.',
        order: 1
      },
      {
        key: 'plot_turn_1',
        title: '2. Plot Turn 1',
        description: 'The event that sets the story in motion. The protagonist leaves their comfort zone.',
        order: 2
      },
      {
        key: 'pinch_1',
        title: '3. Pinch 1',
        description: 'The first major obstacle that applies pressure to the protagonist and raises the stakes.',
        order: 3
      },
      {
        key: 'midpoint',
        title: '4. Midpoint',
        description: 'The protagonist moves from reaction to action. A turning point where they change their approach.',
        order: 4
      },
      {
        key: 'pinch_2',
        title: '5. Pinch 2',
        description: 'A second, more significant obstacle that forces the protagonist to commit fully to their goal.',
        order: 5
      },
      {
        key: 'plot_turn_2',
        title: '6. Plot Turn 2',
        description: 'The protagonist obtains the final piece of information or tool needed to resolve the central conflict.',
        order: 6
      },
      {
        key: 'resolution',
        title: '7. Resolution',
        description: 'The protagonist confronts the antagonist or problem and resolves the central conflict.',
        order: 7
      }
    ]),
    isDefault: true
  },

  // 8. Freeform Structure (Customizable)
  {
    templateType: 'freeform',
    name: "Freeform Structure",
    description: "A completely customizable story structure where you define your own sections and organization.",
    sections: JSON.stringify([
      {
        key: 'section_1',
        title: 'Section 1',
        description: 'Define your own structure and organization here.',
        order: 1
      },
      {
        key: 'section_2',
        title: 'Section 2',
        description: 'Add as many sections as needed for your story.',
        order: 2
      },
      {
        key: 'section_3',
        title: 'Section 3',
        description: 'Customize titles and descriptions to fit your specific storytelling needs.',
        order: 3
      }
    ]),
    isDefault: true
  }
];