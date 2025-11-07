/**
 * fal.ai Serverless Proxy
 *
 * This proxy route is required for fal.ai to work properly in Vercel serverless environment
 * See: https://vercel.com/docs/ai/fal
 */

import { route } from '@fal-ai/serverless-proxy/nextjs';

export const { GET, POST } = route;
