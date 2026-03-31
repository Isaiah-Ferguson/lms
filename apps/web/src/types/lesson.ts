export interface LessonArtifact {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  downloadUrl: string;
}

export interface LessonResponse {
  id: string;
  moduleId: string;
  title: string;
  order: number;
  lessonType: string;
  videoUrl: string | null;
  createdAt: string;
  artifacts: LessonArtifact[];
}

export interface CreateLessonRequest {
  moduleId: string;
  title: string;
  order: number;
  videoUrl?: string;
}

export interface UpdateLessonRequest {
  title: string;
  videoUrl?: string | null;
}
