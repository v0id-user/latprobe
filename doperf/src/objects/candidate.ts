import { DurableObject } from "cloudflare:workers";
import { PERF_TYPE } from "shared";
import { parseEchoer } from "shared";
import { type } from "arktype";
import { executeWorkloads } from "./workloads";
const validPerfTypes = Object.values(PERF_TYPE);

export class Candidate extends DurableObject<Env> {
	/**
	 * The constructor is invoked once upon creation of the Durable Object, i.e. the first call to
	 * 	`DurableObjectStub::get` for a given identifier (no-op constructors can be omitted)
	 *
	 * @param ctx - The interface for interacting with Durable Object state
	 * @param env - The interface to reference bindings declared in wrangler.jsonc
	 */
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
	}



	async fetch(request: Request): Promise<Response> {
		// Validate the request is a WebSocket upgrade request
		if (request.headers.get("upgrade") !== "websocket") {
			return new Response(JSON.stringify({ error: "not a WebSocket upgrade request" }), { status: 400 });
		}

		// Extract the perf type form the request url
		const rawUrl = request.url;
		const url = new URL(rawUrl);
		const perfType = url.searchParams.get("perfType");
		if (!perfType) {
			console.error("[Candidate] perfType is required");
			return new Response(JSON.stringify({ error: "perfType is required" }), { status: 400 });
		}
		if (!validPerfTypes.includes(perfType as PERF_TYPE)) {
			console.error("[Candidate] invalid perfType");
			return new Response(JSON.stringify({ error: "invalid perfType" }), { status: 400 });
		}
		// Upgrade the request to a WebSocket
		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);
		this.ctx.acceptWebSocket(server);
		// Attach the perf type as a tag to the websocket
		server.serializeAttachment(perfType);
		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}

	async webSocketMessage(ws: WebSocket, data: string): Promise<void> {
		// Extract the perf type attached to this WebSocket session
		const perfType = ws.deserializeAttachment();
		if (!perfType) {
			// Log moved to end to reduce overhead during message processing
			const errorMsg = "[Candidate] No perfType attached to WebSocket session.";
			console.error(errorMsg);
			return;
		}

		const t_rx_epoch = Date.now();

		switch (perfType) {
			case PERF_TYPE.EchoerProcessing:
			case PERF_TYPE.Echoer: {
				// Validate and parse the incoming message
				const parsed = parseEchoer(data);

				if (parsed instanceof type.errors) {
					// Log moved to end to reduce overhead during message processing
					const warningMsg = `[Echoer] Parse error: ${parsed.summary ?? parsed}`;
					console.warn(warningMsg);
					ws.close(4001, parsed.summary);
					return;
				}

				// Attach remote receive timestamp
				parsed.t_rx_epoch = t_rx_epoch;

				if (perfType === PERF_TYPE.EchoerProcessing) {
					// Execute various workloads with timing controls
					await executeWorkloads(this.ctx, parsed);
				}

				// Attach server transmit timestamp
				parsed.t_tx2_epoch = Date.now();

				// Echo back
				ws.send(JSON.stringify(parsed));

				// Log at the end to reduce overhead during message processing
				console.debug(`[Echoer] Received message @${t_rx_epoch}:`, data.slice(0, 100) + (data.length > 100 ? "..." : ""), "bytes", data.length);
				console.debug(`[Echoer] Echoing back with t_rx_epoch=${parsed.t_rx_epoch}  @t_tx2_epoch=${parsed.t_tx2_epoch}`);
				return;
			}
			default:
				// Log moved to end to reduce overhead during message processing
				const errorMsg2 = `[Candidate] Invalid perfType on WebSocket: ${perfType}`;
				console.error(errorMsg2);
				ws.close(4001, "Invalid perf type");
				return;
		}
	}
}