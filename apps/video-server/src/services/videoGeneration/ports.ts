export interface VideoGenerationStrategy<
  TJobInput = unknown,
  TDispatchResult = unknown
> {
  readonly name: string;
  canHandle(job: TJobInput): boolean;
  dispatch(job: TJobInput): Promise<TDispatchResult>;
}

export interface VideoGenerationFacade<
  TJobInput = unknown,
  TDispatchResult = unknown
> {
  dispatch(job: TJobInput): Promise<TDispatchResult>;
}
