export interface Comment {
  id: string;
  submissionId: string;
  authorId: string;
  authorName: string;
  message: string;
  createdAt: string;
  filePath: string | null;
  lineStart: number | null;
  lineEnd: number | null;
}
