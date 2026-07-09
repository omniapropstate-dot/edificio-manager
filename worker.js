export default {
  async fetch(request, env) {
    try {
      const resp = await env.ASSETS.fetch(request);
      if (resp.status === 404) {
        const indexReq = new Request(new URL("/index.html", request.url).href, request);
        return env.ASSETS.fetch(indexReq);
      }
      return resp;
    } catch {
      const indexReq = new Request(new URL("/index.html", request.url).href, request);
      return env.ASSETS.fetch(indexReq);
    }
  }
};
