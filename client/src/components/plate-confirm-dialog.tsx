import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, Edit2 } from "lucide-react";
import { displayPlate, getPlateExamples } from "@/lib/plate-utils";
import type { CountryHint } from "@shared/schema";

interface PlateCandidate {
  plate: string;
  confidence: number;
}

interface PlateConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: PlateCandidate[];
  capturedImage?: string;
  onConfirm: (plate: string, countryHint: CountryHint) => void;
}

export function PlateConfirmDialog({ 
  open, 
  onOpenChange, 
  candidates, 
  capturedImage,
  onConfirm 
}: PlateConfirmDialogProps) {
  const [selectedPlate, setSelectedPlate] = useState(candidates[0]?.plate || "");
  const [isEditing, setIsEditing] = useState(candidates.length === 0);
  const [countryHint, setCountryHint] = useState<CountryHint>("OTHER");

  const handleConfirm = () => {
    const plate = displayPlate(selectedPlate);
    if (plate.trim()) {
      onConfirm(plate, countryHint);
    }
  };

  const isValid = selectedPlate.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm License Plate</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {capturedImage && (
            <div className="aspect-[3/1] bg-muted rounded-lg overflow-hidden">
              <img 
                src={capturedImage} 
                alt="Captured plate" 
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {candidates.length > 0 && !isEditing && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Detected plates (tap to select)</Label>
              <div className="flex flex-wrap gap-2">
                {candidates.map((candidate) => (
                  <Badge
                    key={candidate.plate}
                    variant={selectedPlate === candidate.plate ? "default" : "outline"}
                    className="cursor-pointer text-base px-3 py-2 font-mono hover-elevate"
                    onClick={() => setSelectedPlate(candidate.plate)}
                    data-testid={`badge-plate-candidate-${candidate.plate}`}
                  >
                    {displayPlate(candidate.plate)}
                    {candidate.confidence > 0 && (
                      <span className="ml-2 text-xs opacity-70">
                        {Math.round(candidate.confidence * 100)}%
                      </span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="plate-input">License Plate</Label>
              {candidates.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsEditing(!isEditing)}
                  data-testid="button-toggle-edit"
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  {isEditing ? "Select" : "Edit"}
                </Button>
              )}
            </div>
            <Input
              id="plate-input"
              value={selectedPlate}
              onChange={(e) => setSelectedPlate(e.target.value.toUpperCase())}
              placeholder={getPlateExamples(countryHint)}
              className="font-mono text-lg tracking-wider"
              autoFocus={isEditing || candidates.length === 0}
              data-testid="input-plate"
            />
          </div>

          <div className="space-y-2">
            <Label>Country Hint (optional)</Label>
            <Select value={countryHint} onValueChange={(v) => setCountryHint(v as CountryHint)}>
              <SelectTrigger data-testid="select-country-hint">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FR">France</SelectItem>
                <SelectItem value="ZA">South Africa</SelectItem>
                <SelectItem value="CD">DRC (Congo)</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Helps with formatting suggestions, but does not reject plates.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-plate"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!isValid}
            data-testid="button-confirm-plate"
          >
            <Check className="mr-2 h-4 w-4" />
            Confirm Plate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
