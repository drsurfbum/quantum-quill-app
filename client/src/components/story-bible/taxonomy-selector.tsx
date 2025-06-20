import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { ENHANCED_TAXONOMY, getEnhancedTaxonomyByKey, getEnhancedTaxonomyFields } from "@shared/enhanced-taxonomy";

interface TaxonomySelectorProps {
  entryType: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  onEntryTypeChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSubcategoryChange: (value: string) => void;
  onTagsChange: (tags: string[]) => void;
  disabled?: boolean;
}

export function TaxonomySelector({
  entryType,
  category,
  subcategory,
  tags = [],
  onEntryTypeChange,
  onCategoryChange,
  onSubcategoryChange,
  onTagsChange,
  disabled = false
}: TaxonomySelectorProps) {
  const [newTag, setNewTag] = useState("");

  const taxonomy = getEnhancedTaxonomyByKey(entryType?.toUpperCase());
  const subcategories = taxonomy?.categoryFields ? Object.keys(taxonomy.categoryFields) : [];

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      onTagsChange([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleEntryTypeChange = (value: string) => {
    onEntryTypeChange(value);
    // Reset category and subcategory when entry type changes
    onCategoryChange("");
    onSubcategoryChange("");
  };

  return (
    <div className="space-y-4">
      {/* Entry Type Selection */}
      <div className="space-y-2">
        <Label htmlFor="entry-type">Entry Type *</Label>
        <Select 
          value={entryType} 
          onValueChange={handleEntryTypeChange}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select entry type..." />
          </SelectTrigger>
          <SelectContent>
            {Object.values(ENHANCED_TAXONOMY).map((tax) => (
              <SelectItem key={tax.key} value={tax.key}>
                <div className="flex flex-col">
                  <span className="font-medium">{tax.name}</span>
                  <span className="text-xs text-muted-foreground">{tax.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category Selection */}
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <div className="space-y-2">
          {/* Free-text category input */}
          <Input
            value={category || ""}
            onChange={(e) => onCategoryChange(e.target.value)}
            placeholder="Enter custom category (e.g., Main Characters, Villains, etc.)"
            disabled={disabled}
          />
          
          {/* Predefined categories if available */}
          {taxonomy && subcategories.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Suggested categories:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {subcategories.map((subcat: string) => (
                  <Button
                    key={subcat}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => onCategoryChange(subcat)}
                    disabled={disabled}
                  >
                    {subcat}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subcategory (Custom) */}
      <div className="space-y-2">
        <Label htmlFor="subcategory">Subcategory (Optional)</Label>
        <Input
          value={subcategory || ""}
          onChange={(e) => onSubcategoryChange(e.target.value)}
          placeholder="Custom subcategory..."
          disabled={disabled}
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-1 min-h-[2rem] p-2 border rounded-md">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              {!disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleRemoveTag(tag)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </Badge>
          ))}
        </div>
        {!disabled && (
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add tag..."
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddTag}
              disabled={!newTag.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Taxonomy Info */}
      {taxonomy && (
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          <strong>{taxonomy.name}:</strong> {taxonomy.description}
        </div>
      )}
    </div>
  );
}