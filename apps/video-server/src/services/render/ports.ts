import type { RenderJobData } from "./types";

export interface RenderProviderStrategy<TResult = unknown> {
  readonly name: string;
  render(data: RenderJobData): Promise<TResult>;
}

export interface RenderProviderFacade<TResult = unknown> {
  render(data: RenderJobData): Promise<TResult>;
}
