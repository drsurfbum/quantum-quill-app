export { BIBLE_TAXONOMY as ENHANCED_TAXONOMY } from "./bible-catalog";
export type { TaxonomyField, TaxonomyCategory } from "./bible-catalog";
import { BIBLE_TAXONOMY } from "./bible-catalog";
export const getEnhancedTaxonomyKeys = () => Object.keys(BIBLE_TAXONOMY);
export const getEnhancedTaxonomyByKey = (key: string) => BIBLE_TAXONOMY[key.toUpperCase()];
export const getEnhancedTaxonomyFields = (type: string) => getEnhancedTaxonomyByKey(type)?.fields || {};
export const getCategorySpecificFields = (type: string, category?: string) => category ? getEnhancedTaxonomyByKey(type)?.categoryFields?.[category] || {} : {};
export const getEntryTypeDisplayName = (key: string) => getEnhancedTaxonomyByKey(key)?.name || key;
