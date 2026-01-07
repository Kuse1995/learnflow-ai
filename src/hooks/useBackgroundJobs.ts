import { useState, useCallback, useEffect } from "react";
import type { BackgroundJobType, JobStatus } from "@/lib/performance-config";

export interface BackgroundJob {
  id: string;
  type: BackgroundJobType;
  status: JobStatus;
  progress: number;
  message: string;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
  retryCount: number;
}

interface JobStore {
  jobs: Map<string, BackgroundJob>;
  subscribers: Set<() => void>;
}

// Simple in-memory job store (persists across component re-renders)
const jobStore: JobStore = {
  jobs: new Map(),
  subscribers: new Set(),
};

function notifySubscribers() {
  jobStore.subscribers.forEach((callback) => callback());
}

/**
 * Hook for managing background jobs
 */
export function useBackgroundJobs() {
  const [, forceUpdate] = useState({});

  // Subscribe to job updates
  useEffect(() => {
    const callback = () => forceUpdate({});
    jobStore.subscribers.add(callback);
    return () => {
      jobStore.subscribers.delete(callback);
    };
  }, []);

  const jobs = Array.from(jobStore.jobs.values());
  const pendingJobs = jobs.filter((j) => j.status === "pending" || j.status === "processing");
  const failedJobs = jobs.filter((j) => j.status === "failed");

  const createJob = useCallback(
    (type: BackgroundJobType, message: string): string => {
      const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const job: BackgroundJob = {
        id,
        type,
        status: "pending",
        progress: 0,
        message,
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
        error: null,
        retryCount: 0,
      };
      jobStore.jobs.set(id, job);
      notifySubscribers();
      return id;
    },
    []
  );

  const updateJob = useCallback(
    (id: string, updates: Partial<Pick<BackgroundJob, "status" | "progress" | "message" | "error">>) => {
      const job = jobStore.jobs.get(id);
      if (!job) return;

      const updatedJob = { ...job, ...updates };
      
      if (updates.status === "processing" && !job.startedAt) {
        updatedJob.startedAt = new Date();
      }
      if (updates.status === "completed" || updates.status === "failed") {
        updatedJob.completedAt = new Date();
      }
      
      jobStore.jobs.set(id, updatedJob);
      notifySubscribers();
    },
    []
  );

  const retryJob = useCallback((id: string) => {
    const job = jobStore.jobs.get(id);
    if (!job || job.status !== "failed") return;

    jobStore.jobs.set(id, {
      ...job,
      status: "pending",
      progress: 0,
      error: null,
      retryCount: job.retryCount + 1,
      completedAt: null,
    });
    notifySubscribers();
  }, []);

  const cancelJob = useCallback((id: string) => {
    const job = jobStore.jobs.get(id);
    if (!job || (job.status !== "pending" && job.status !== "processing")) return;

    jobStore.jobs.set(id, {
      ...job,
      status: "cancelled",
      completedAt: new Date(),
    });
    notifySubscribers();
  }, []);

  const clearCompleted = useCallback(() => {
    const toRemove: string[] = [];
    jobStore.jobs.forEach((job, id) => {
      if (job.status === "completed" || job.status === "cancelled") {
        toRemove.push(id);
      }
    });
    toRemove.forEach((id) => jobStore.jobs.delete(id));
    notifySubscribers();
  }, []);

  const getJob = useCallback((id: string) => {
    return jobStore.jobs.get(id);
  }, []);

  return {
    jobs,
    pendingJobs,
    failedJobs,
    hasPendingJobs: pendingJobs.length > 0,
    hasFailedJobs: failedJobs.length > 0,
    createJob,
    updateJob,
    retryJob,
    cancelJob,
    clearCompleted,
    getJob,
  };
}

/**
 * Hook for running a background job with progress tracking
 */
export function useRunBackgroundJob() {
  const { createJob, updateJob } = useBackgroundJobs();

  const runJob = useCallback(
    async <T>(
      type: BackgroundJobType,
      message: string,
      task: (updateProgress: (progress: number, message?: string) => void) => Promise<T>
    ): Promise<{ success: boolean; result?: T; error?: string; jobId: string }> => {
      const jobId = createJob(type, message);

      try {
        updateJob(jobId, { status: "processing", progress: 0 });

        const result = await task((progress, msg) => {
          updateJob(jobId, { progress, message: msg || message });
        });

        updateJob(jobId, { status: "completed", progress: 100, message: "Completed" });
        return { success: true, result, jobId };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An error occurred";
        updateJob(jobId, { status: "failed", error: errorMessage });
        return { success: false, error: errorMessage, jobId };
      }
    },
    [createJob, updateJob]
  );

  return { runJob };
}
