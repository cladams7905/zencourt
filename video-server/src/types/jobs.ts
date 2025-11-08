import { VideoCompositionSettings } from './requests';

/**
 * Type definitions for video processing jobs
 */

export interface VideoJob {
  jobId: string;
  projectId: string;
  userId: string;
  roomVideoUrls: string[];
  compositionSettings: VideoCompositionSettings;
  webhookUrl: string;
  webhookSecret: string;
}

export interface VideoJobResult {
  jobId: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  status: 'completed' | 'failed';
  error?: string;
}

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface JobProgress {
  jobId: string;
  status: JobStatus;
  progress: number; // 0-100
  message?: string;
}
