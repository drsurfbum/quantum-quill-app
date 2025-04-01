import { db } from './db';
import { plotTemplates } from './data/plot-templates';
import { plotStructureTemplates } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { log } from './vite';

/**
 * Initialize plot structure templates in the database if they don't exist
 */
export async function initPlotTemplates() {
  try {
    // Check if templates already exist
    const existingTemplates = await db.select().from(plotStructureTemplates);
    
    if (existingTemplates.length === 0) {
      log('No plot structure templates found, initializing...', 'init');
      
      // Insert all templates
      for (const template of plotTemplates) {
        await db.insert(plotStructureTemplates).values(template);
      }
      
      log(`Added ${plotTemplates.length} plot structure templates to the database`, 'init');
    } else {
      log(`Found ${existingTemplates.length} existing plot structure templates`, 'init');
    }
  } catch (error) {
    log(`Error initializing plot templates: ${error}`, 'init');
    console.error('Failed to initialize plot templates:', error);
  }
}