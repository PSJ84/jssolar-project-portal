import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Project, ProjectPhase } from "@prisma/client";
import { MapPin, Zap } from "lucide-react";

const phaseLabels: Record<ProjectPhase, string> = {
  CONTRACT: "계약",
  PERMIT: "인허가",
  DESIGN: "설계",
  CONSTRUCTION: "시공",
  COMPLETION: "준공",
};

const phaseColors: Record<ProjectPhase, string> = {
  CONTRACT: "bg-blue-500",
  PERMIT: "bg-yellow-500",
  DESIGN: "bg-purple-500",
  CONSTRUCTION: "bg-orange-500",
  COMPLETION: "bg-green-500",
};

interface ProjectCardProps {
  project: Project;
  href: string;
}

export function ProjectCard({ project, href }: ProjectCardProps) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{project.name}</CardTitle>
            <Badge className={phaseColors[project.currentPhase]}>
              {phaseLabels[project.currentPhase]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {project.location && (
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mr-2" />
              {project.location}
            </div>
          )}
          {project.capacityKw && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Zap className="h-4 w-4 mr-2" />
              {project.capacityKw.toLocaleString()} kW
            </div>
          )}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">진행률</span>
              <span className="font-medium">{project.progressPercent}%</span>
            </div>
            <Progress value={project.progressPercent} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
