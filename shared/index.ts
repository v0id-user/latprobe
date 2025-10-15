import { type } from "arktype";

export enum PERF_TYPE {
    Echoer = "echoer",
    EchoerProcessing = "echoer-processing"
}

/**
 * Cloudflare Common Gateway Interface (CGI) trace data schema
 * Contains information about the Durable Object's location and network details
 */
export const cgiTraceSchema = type({
	/** Flight ID */
	fl: "string | null",
	/** Host */
	h: "string | null",
	/** IP address */
	ip: "string | null",
	/** Timestamp */
	ts: "string | null",
	/** Visit scheme */
	visit_scheme: "string | null",
	/** User agent */
	uag: "string | null",
	/** Colo (data center location) */
	colo: "string | null",
	/** Sliver */
	sliver: "string | null",
	/** HTTP version */
	http: "string | null",
	/** Location */
	loc: "string | null",
	/** TLS version */
	tls: "string | null",
	/** SNI (Server Name Indication) */
	sni: "string | null",
	/** WARP status */
	warp: "string | null",
	/** Gateway */
	gateway: "string | null",
	/** RBI */
	rbi: "string | null",
	/** KEX */
	kex: "string | null",
});

export type CgiTrace = typeof cgiTraceSchema.infer;

const echoerSchema = type({
    // Any random stream of data
	blob: "string",
    
	// T1, T2 | Uplink = t2(server) - t1(client)
    t_tx_epoch: "number.epoch | null",   // client transmit time (client → server)
    t_rx_epoch: "number.epoch | null",   // server receive time (server → client)

    // T3, T4 | Downlink = t4(client) - t3(server)
    t_tx2_epoch: "number.epoch | null",  // server transmit time (server → client)
    t_rx2_epoch: "number.epoch | null",   // client receive time (server → client)

    // Durable Object metadata
    cgiTrace: cgiTraceSchema,
});

export const parseEchoer = type("string.json.parse").to(echoerSchema);

export type EchoerSchema = typeof echoerSchema.infer;