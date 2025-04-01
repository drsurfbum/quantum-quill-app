import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreVertical, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlotStructure } from '@shared/schema';

interface PlotStructureCardProps {
  structure: PlotStructure;
  onSelectStructure: (id: number) => void;
  onDeleteStructure: (id: number) => void;
}

export default function PlotStructureCard({ structure, onSelectStructure, onDeleteStructure }: PlotStructureCardProps) {
  return (
    <Card className="border border-border flex flex-col w-full h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start w-full">
          <CardTitle className="flex-1 pr-4">{structure.name}</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => onDeleteStructure(structure.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {structure.description && (
          <CardDescription className="w-full">{structure.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pb-2 flex-grow">
        <p className="text-sm text-muted-foreground w-full overflow-hidden">
          Click to view and edit this plot structure.
        </p>
      </CardContent>
      <CardFooter className="mt-auto">
        <Button 
          variant="outline" 
          onClick={() => onSelectStructure(structure.id)}
          className="w-full"
        >
          View Structure
        </Button>
      </CardFooter>
    </Card>
  );
}