import { getUserProjects } from "../server/actions/db/projects";
import { HomeClient } from "../components/HomeClient";
import type { Project } from "../types/schema";

export default async function Home() {
  let projects: Project[] = [];
  try {
    projects = await getUserProjects();
  } catch (error) {
    console.log("No authenticated user or error fetching projects:", error);
  }
  return <HomeClient initialProjects={projects} />;
}
