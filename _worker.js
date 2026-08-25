import { handleRequest as handleV1Request } from './workers/ophthasearch-ai/worker.js';
import { handleResearchRequest } from './workers/ophthasearch-v2/pipeline.js';

export * from './workers/ophthasearch-ai/worker.js';

export async function handleRequest(request, env, ctx, deps = {}) {
  const url = new URL(request.url);
  if (url.pathname === '/v2/research') return handleResearchRequest(request, env, ctx, deps);
  if (url.pathname === '/v1/synthesize') return handleV1Request(request, env, ctx, deps);
  if (env?.ASSETS?.fetch) return env.ASSETS.fetch(request);
  return new Response('Not found', { status: 404 });
}

export default {
  fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  }
};
