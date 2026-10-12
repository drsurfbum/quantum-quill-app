import { RelationshipSection } from "./relationships";
import { relationshipTypeFor } from "@shared/relationships";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X } from "lucide-react";
import { useStoryBibleEntries } from "@/hooks/use-story-bible";
import { 
  getEnhancedTaxonomyFields, 
  getCategorySpecificFields, 
  type TaxonomyField 
} from "@shared/enhanced-taxonomy";

interface DynamicFormFieldsProps {
  entryType: string;
  metadata: any;
  onMetadataChange: (metadata: any) => void;
  projectId: number;
  currentEntryId?: number;
  disabled?: boolean;
}

export function DynamicFormFields({
  entryType,
  metadata,
  onMetadataChange,
  projectId,
  currentEntryId,
  disabled = false
}: DynamicFormFieldsProps) {
  const { data: allEntries = [] } = useStoryBibleEntries(projectId);
  const entry = allEntries.find(item => item.id === currentEntryId);
  const [newMultiSelectValue, setNewMultiSelectValue] = useState<Record<string, string>>({});

  const taxonomyFields = getEnhancedTaxonomyFields(entryType);
  const categorySpecificFields = getCategorySpecificFields(entryType, metadata?.category);

  const updateMetadata = (fieldKey: string, value: any) => {
    onMetadataChange({ [fieldKey]: value });
  };

  const addMultiSelectValue = (fieldKey: string) => {
    const currentValue = newMultiSelectValue[fieldKey]?.trim();
    if (!currentValue) return;

    const currentValues = metadata[fieldKey] || [];
    if (!currentValues.includes(currentValue)) {
      updateMetadata(fieldKey, [...currentValues, currentValue]);
    }
    setNewMultiSelectValue({ ...newMultiSelectValue, [fieldKey]: "" });
  };

  const removeMultiSelectValue = (fieldKey: string, valueToRemove: string) => {
    const currentValues = metadata[fieldKey] || [];
    updateMetadata(fieldKey, currentValues.filter((v: string) => v !== valueToRemove));
  };

  const renderField = (fieldKey: string, field: TaxonomyField) => {
    const value = metadata[fieldKey];

    switch (field.type) {
      case "text":
        return (
          <Input
            aria-label={field.name}
            value={value || ""}
            onChange={(e) => updateMetadata(fieldKey, e.target.value)}
            disabled={disabled}
            placeholder={`Enter ${field.name.toLowerCase()}...`}
          />
        );

      case "textarea":
        return (
          <Textarea
            aria-label={field.name}
            value={value || ""}
            onChange={(e) => updateMetadata(fieldKey, e.target.value)}
            disabled={disabled}
            placeholder={`Enter ${field.name.toLowerCase()}...`}
            rows={3}
          />
        );

      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              aria-label={field.name}
              checked={value || false}
              onCheckedChange={(checked) => updateMetadata(fieldKey, checked === true)}
              disabled={disabled}
            />
            <Label className="text-sm">{field.name}</Label>
          </div>
        );

      case "single-select":
        return (
          <Select
            value={value || "__none__"}
            onValueChange={(newValue) => updateMetadata(fieldKey, newValue === "__none__" ? "" : newValue)}
            disabled={disabled}
          >
            <SelectTrigger aria-label={field.name}>
              <SelectValue placeholder={`Select ${field.name.toLowerCase()}...`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {(field.choices || field.options?.map(value => ({ value, label: value })))?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "multi-select":
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1 min-h-[2rem] p-2 border rounded-md">
              {(value || []).map((item: string) => (
                <Badge key={item} variant="secondary" className="gap-1">
                  {item}
                  {!disabled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeMultiSelectValue(fieldKey, item)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </Badge>
              ))}
            </div>
            {!disabled && field.options && field.options.filter(option => !(value || []).includes(option)).length > 0 && (
              <div className="flex gap-2">
                <Select
                  value="__add_option__"
                  onValueChange={(newValue) => {
                    if (newValue !== "__add_option__") {
                      const currentValues = value || [];
                      if (!currentValues.includes(newValue)) {
                        updateMetadata(fieldKey, [...currentValues, newValue]);
                      }
                    }
                  }}
                >
                  <SelectTrigger aria-label={field.name} className="flex-1">
                    <SelectValue placeholder={`Add ${field.name.toLowerCase()}...`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__add_option__" disabled>Add option...</SelectItem>
                    {(field.choices || field.options?.map(value => ({ value, label: value })))?.filter(option => !(value || []).includes(option.value)).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {!disabled && field.options && field.options.filter(option => !(value || []).includes(option)).length === 0 && field.options.length > 0 && (
              <div className="text-sm text-muted-foreground p-2 border rounded">
                All available options are already selected
              </div>
            )}
          </div>
        );

      case "single-select-linked":
      case "multi-select-linked":
        return entry ? <RelationshipSection entry={entry} title={field.name} kinds={[relationshipTypeFor(`metadata.${fieldKey}`, entryType)]} /> : <p className="text-sm text-muted-foreground">Save this entry first to add relationships.</p>;

      default:
        return <div className="text-sm text-muted-foreground">Unsupported field type: {field.type}</div>;
    }
  };

  const allFields = { ...taxonomyFields, ...categorySpecificFields };
  const fieldEntries = Object.entries(allFields);

  if (fieldEntries.length === 0) {
    return <div className="text-sm text-muted-foreground">No structured fields available for this entry type.</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Structured Fields</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fieldEntries.map(([fieldKey, field]) => (
            <div key={fieldKey} data-field={fieldKey} className="space-y-2">
              <Label className="text-sm font-medium">
                {field.name}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {renderField(fieldKey, field)}
            </div>
          ))}
        </CardContent>
      </Card>

      {Object.keys(categorySpecificFields).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Category-Specific Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-2">
              Additional fields for: {metadata?.category}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}