import { Candidate } from "./objects/candidate";

export default {
    /**
     * This is the standard fetch handler for a Cloudflare Worker
     *
     * @param request - The request submitted to the Worker from the client
     * @param env - The interface to reference bindings declared in wrangler.jsonc
     * @returns The response to be sent back to the client
     */
    async fetch(request, env): Promise<Response> {
        /*
        *
        * Supported locations
        *
        * | Parameter | Location                |
        * |-----------|-------------------------|
        * | wnam      | Western North America   |
        * | enam      | Eastern North America   |
        * | sam       | South America 2         |
        * | weur      | Western Europe          |
        * | eeur      | Eastern Europe          |
        * | apac      | Asia-Pacific            |
        * | oc        | Oceania                 |
        * | afr       | Africa 2                |
        * | me        | Middle East 2           |
        *
        * 1. Dynamic relocation of existing Durable Objects is planned for the future.
        *
        * 2. Durable Objects currently do not spawn in this location. Instead, the Durable Object will spawn in a nearby 
        *    location which does support Durable Objects. For example, Durable Objects hinted to South America spawn in Eastern North America instead.
        *
        */

        const url = new URL(request.url);
        const locationHintParam = url.searchParams.get("locationHint");
        if (!locationHintParam) {
            console.error("[Worker] locationHint is required");
            return new Response(JSON.stringify({ error: "locationHint is required" }), { status: 400 });
        }

        const location = locationHintParam as DurableObjectLocationHint;

        const stub = env.CANDIDATE.getByName("candidate", {
            locationHint: location,
        });

        return await stub.fetch(request);
    },
} satisfies ExportedHandler<Env>;

export { Candidate };