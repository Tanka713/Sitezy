import type { GenerationStatus, Project, ProjectPage } from "@/types";

export function hasActiveGenerationJob(project?: Project | null): boolean {
  return project?.generationJob?.status === "queued" || project?.generationJob?.status === "running";
}

export function pageHasActiveGeneration(page?: ProjectPage | null): boolean {
  return page?.status === "pending" || page?.status === "generating";
}

export function projectHasActiveGeneration(
  project?: Project | null,
  generationStatus?: GenerationStatus | null
): boolean {
  return (
    generationStatus === "blueprint" ||
    generationStatus === "pages" ||
    generationStatus === "normalizing" ||
    hasActiveGenerationJob(project) ||
    project?.status === "generating" ||
    (project?.pages ?? []).some((page) => pageHasActiveGeneration(page))
  );
}
