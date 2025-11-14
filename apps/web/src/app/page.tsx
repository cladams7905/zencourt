import { getUserProjects } from "../server/actions/db/projects";
import { HomeClient } from "../components/HomeClient";
import { DBProject } from "@shared/types/models";

export const dynamic = "force-dynamic";

export default async function Home() {
  let projects: DBProject[] = [];
  try {
    projects = await getUserProjects();
  } catch (error) {
    console.error("No authenticated user or error fetching projects:", error);
  }
  return <HomeClient initialProjects={projects} />;
}
