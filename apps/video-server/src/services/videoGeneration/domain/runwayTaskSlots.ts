type Deferred = {
  resolve: () => void;
};

export type RunwayTaskLease = {
  bind: (taskId: string) => void;
  release: () => void;
};

export class RunwayTaskSlots {
  private active = 0;
  private readonly queue: Deferred[] = [];
  private readonly releaseByTaskIdMap = new Map<string, () => void>();

  constructor(private readonly limit: number) {}

  async acquire(): Promise<RunwayTaskLease> {
    if (this.active < this.limit) {
      this.active += 1;
    } else {
      await new Promise<void>((resolve) => {
        this.queue.push({ resolve });
      });
    }

    let released = false;
    let boundTaskId: string | null = null;

    const release = () => {
      if (released) return;
      released = true;

      if (boundTaskId) {
        this.releaseByTaskIdMap.delete(boundTaskId);
      }

      const next = this.queue.shift();
      if (next) {
        next.resolve();
        return;
      }

      this.active = Math.max(0, this.active - 1);
    };

    return {
      bind: (taskId: string) => {
        if (released) return;

        if (boundTaskId && boundTaskId !== taskId) {
          this.releaseByTaskIdMap.delete(boundTaskId);
        }

        boundTaskId = taskId;
        this.releaseByTaskIdMap.set(taskId, release);
      },
      release
    };
  }

  releaseByTaskId(taskId: string): void {
    this.releaseByTaskIdMap.get(taskId)?.();
  }
}

export function createRunwayTaskSlots(limit: number): RunwayTaskSlots {
  return new RunwayTaskSlots(Math.max(1, limit));
}

export const runwayTaskSlots = createRunwayTaskSlots(
  Number(process.env.RUNWAY_MAX_ACTIVE_TASKS) || 3
);
