export interface WeekCodeArtifact {
  id: string;
  label: string;
  downloadUrl: string;
}

export interface WeekVideo {
  id: string;
  title: string;
  order: number;
  videoWatchUrl: string;
  codeArtifacts: WeekCodeArtifact[];
}
