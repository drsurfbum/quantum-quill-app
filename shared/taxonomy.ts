// Compatibility import path. All live taxonomy definitions live in bible-catalog.
export { BIBLE_TAXONOMY as STORY_BIBLE_TAXONOMY, BIBLE_TYPES as VALID_ENTRY_TYPES } from "./bible-catalog";
export { getEnhancedTaxonomyKeys as getTaxonomyKeys, getEnhancedTaxonomyByKey as getTaxonomyByKey, getEnhancedTaxonomyFields as getTaxonomyFields, getCategorySpecificFields, getEntryTypeDisplayName } from "./enhanced-taxonomy";
import { BIBLE_TAXONOMY } from "./bible-catalog";
export const ENTRY_TYPE_SCHEMA = Object.fromEntries(Object.values(BIBLE_TAXONOMY).map(item => [item.key, item]));
export const getTaxonomySubcategories = (type: string) => Object.fromEntries(Object.keys(ENTRY_TYPE_SCHEMA[type]?.categoryFields || {}).map(key => [key, key]));
export const getAllSubcategories = () => Object.assign({}, ...Object.keys(ENTRY_TYPE_SCHEMA).map(getTaxonomySubcategories));
