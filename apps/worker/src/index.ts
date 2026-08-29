import { createApp } from './routes';
import { StreamRoom } from './room';
import type { Env } from './types';

export { StreamRoom };

const app = createApp();

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/ws' || url.pathname.startsWith('/ws')) {
      const streamId = url.searchParams.get('streamId') || 'default';
      const id = env.STREAM_ROOM.idFromName(streamId);
      const stub = env.STREAM_ROOM.get(id);
      return stub.fetch(request);
    }

    if (url.pathname.startsWith('/api')) {
      return app.fetch(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
