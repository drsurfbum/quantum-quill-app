import HelpMenu from "./tour/help-menu";
import { FeedbackButton } from "./feedback-dialog";
import { Link, useLocation } from "wouter";
import { BookOpen, Edit3, Feather, Grid, Home, ListTree } from "lucide-react";
import type { Project } from "@shared/schema";
import ThemeToggle from "./ui/theme-toggle";
import ExportModal from "./export-modal";
import { Button } from "./ui/button";
import RoadmapLink from "./roadmap-link";
export default function WorkspaceHeader({project}: {project:Project}) {
  const [location] = useLocation();
  const base = `/project/${project.id}`;
  return <>
    <header data-tour="workspace-ready" className="h-16 shrink-0 border-b flex items-center gap-2 sm:gap-4 px-3 sm:px-5 min-w-0">
      <Link href="/" className="flex items-center gap-2 shrink-0 font-serif font-semibold sm:text-lg" aria-label="Quantum Quill projects"><Feather className="h-5 w-5 text-violet-700 dark:text-violet-300"/><span className="hidden md:inline">Quantum Quill</span></Link>
      <span className="hidden sm:block h-6 border-l" />
      <Link href={base} className="font-medium truncate min-w-0 mr-auto" title={project.title}>{project.title}</Link>
      <div className="flex items-center shrink-0 gap-1"><HelpMenu /><ThemeToggle /><Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link href="/">Projects</Link></Button><ExportModal projectId={project.id} projectTitle={project.title} /><div className="hidden sm:block"><ExportModal projectId={project.id} projectTitle={project.title} preview /></div></div>
    </header>
    <div className="flex min-w-0 items-center border-b shrink-0 pr-3">
    <nav aria-label="Project workspace" className="flex min-w-0 flex-1 items-center gap-1 px-3 py-2 overflow-x-auto">
      {([{label:"Overview",path:"",icon:Home},{label:"Storyboard",path:"/storyboard",icon:Grid},{label:"Outline",path:"/outline",icon:ListTree},{label:"Write",path:"/write",icon:Edit3},{label:"Story Bible",path:"/story-bible",icon:BookOpen}]).map(({label,path,icon:Icon})=><Link key={label} data-tour={`nav${path.replace("/", "-") || "-overview"}`} href={base+path} aria-current={location===base+path ? "page" : undefined} className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm ${location===base+path ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-muted"}`}><Icon className="h-4 w-4"/>{label}</Link>)}
    </nav>
    <FeedbackButton /><RoadmapLink className="ml-2" />
    </div>
  </>;
}
