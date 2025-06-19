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
  disabled?: boolean;
}

export function DynamicFormFields({
  entryType,
  metadata,
  onMetadataChange,
  projectId,
  disabled = false
}: DynamicFormFieldsProps) {
  const { data: allEntries = [] } = useStoryBibleEntries(projectId);
  const [newMultiSelectValue, setNewMultiSelectValue] = useState<Record<string, string>>({});

  const taxonomyFields = getEnhancedTaxonomyFields(entryType);
  const categorySpecificFields = getCategorySpecificFields(entryType, metadata?.category);

  const updateMetadata = (fieldKey: string, value: any) => {
    const updatedMetadata = { ...metadata, [fieldKey]: value };
    onMetadataChange(updatedMetadata);
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

  const addLinkedValue = (fieldKey: string, entryId: string) => {
    const field = taxonomyFields[fieldKey] || categorySpecificFields[fieldKey];
    if (!field) return;

    const entryIdNum = parseInt(entryId);
    if (field.type === "multi-select-linked") {
      const currentValues = metadata[fieldKey] || [];
      if (!currentValues.includes(entryIdNum)) {
        updateMetadata(fieldKey, [...currentValues, entryIdNum]);
      }
    } else if (field.type === "single-select-linked") {
      updateMetadata(fieldKey, entryIdNum);
    }
  };

  const removeLinkedValue = (fieldKey: string, entryId: number) => {
    const currentValues = metadata[fieldKey] || [];
    updateMetadata(fieldKey, currentValues.filter((id: number) => id !== entryId));
  };

  const getLinkedEntries = (linkedTo: string) => {
    return allEntries.filter(entry => entry.entryType === linkedTo);
  };

  const getLinkedEntryById = (entryId: number) => {
    return allEntries.find(entry => entry.id === entryId);
  };

  const renderField = (fieldKey: string, field: TaxonomyField) => {
    const value = metadata[fieldKey];

    switch (field.type) {
      case "text":
        return (
          <Input
            value={value || ""}
            onChange={(e) => updateMetadata(fieldKey, e.target.value)}
            disabled={disabled}
            placeholder={`Enter ${field.name.toLowerCase()}...`}
          />
        );

      case "textarea":
        return (
          <Textarea
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
            value={value || ""}
            onValueChange={(newValue) => updateMetadata(fieldKey, newValue)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.name.toLowerCase()}...`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
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
            {!disabled && (
              <div className="flex gap-2">
                <Select
                  value={newMultiSelectValue[fieldKey] || ""}
                  onValueChange={(newValue) => {
                    if (newValue) {
                      const currentValues = value || [];
                      if (!currentValues.includes(newValue)) {
                        updateMetadata(fieldKey, [...currentValues, newValue]);
                      }
                    }
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={`Add ${field.name.toLowerCase()}...`} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.filter(option => !(value || []).includes(option)).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        );

      case "single-select-linked":
        const linkedEntries = getLinkedEntries(field.linkedTo!);
        const selectedEntry = value ? getLinkedEntryById(value) : null;
        
        return (
          <div className="space-y-2">
            {selectedEntry && (
              <div className="p-2 bg-muted rounded flex items-center justify-between">
                <span className="text-sm">{selectedEntry.title}</span>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateMetadata(fieldKey, null)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
            {!disabled && !selectedEntry && (
              <Select
                value=""
                onValueChange={(entryId) => addLinkedValue(fieldKey, entryId)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${field.name.toLowerCase()}...`} />
                </SelectTrigger>
                <SelectContent>
                  {linkedEntries.map((entry) => (
                    <SelectItem key={entry.id} value={entry.id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">{entry.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {entry.category || 'No category'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        );

      case "multi-select-linked":
        const linkedEntriesMulti = getLinkedEntries(field.linkedTo!);
        const selectedEntries = (value || []).map((id: number) => getLinkedEntryById(id)).filter(Boolean);
        
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1 min-h-[2rem] p-2 border rounded-md">
              {selectedEntries.map((entry) => (
                <Badge key={entry.id} variant="secondary" className="gap-1">
                  {entry.title}
                  {!disabled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeLinkedValue(fieldKey, entry.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </Badge>
              ))}
            </div>
            {!disabled && (
              <Select
                value=""
                onValueChange={(entryId) => addLinkedValue(fieldKey, entryId)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Add ${field.name.toLowerCase()}...`} />
                </SelectTrigger>
                <SelectContent>
                  {linkedEntriesMulti
                    .filter(entry => !(value || []).includes(entry.id))
                    .map((entry) => (
                      <SelectItem key={entry.id} value={entry.id.toString()}>
                        <div className="flex flex-col">
                          <span className="font-medium">{entry.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {entry.category || 'No category'}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>
        );

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
            <div key={fieldKey} className="space-y-2">
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