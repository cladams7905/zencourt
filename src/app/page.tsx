import { getUserProjects } from "@/db/actions/projects";
import { HomeClient } from "@/components/HomeClient";
import type { Project } from "@/types/schema";
import { fal } from "@fal-ai/client";

fal.config({
  proxyUrl: "/api/fal/proxy"
});

export default async function Home() {
  let projects: Project[] = [];
  try {
    projects = await getUserProjects();
  } catch (error) {
    console.log("No authenticated user or error fetching projects:", error);
  }
  return <HomeClient initialProjects={projects} />;
}
