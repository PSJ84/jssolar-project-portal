"use client";

import { useState } from "react";
import { ConstructionScheduleEditor, ConstructionPhase } from "./ConstructionScheduleEditor";
import { ConstructionChart } from "./ConstructionChart";

interface ConstructionSectionProps {
  projectId: string;
  initialPhases: ConstructionPhase[];
  isAdmin?: boolean;
}

export function ConstructionSection({
  projectId,
  initialPhases,
  isAdmin = false,
}: ConstructionSectionProps) {
  const [phases, setPhases] = useState<ConstructionPhase[]>(initialPhases);

  return (
    <div className="space-y-6">
      <ConstructionChart phases={phases} />
      {isAdmin && (
        <ConstructionScheduleEditor
          projectId={projectId}
          initialPhases={phases}
          onPhasesChange={setPhases}
        />
      )}
    </div>
  );
}
