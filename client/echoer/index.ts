import { parseEchoer, PERF_TYPE, type EchoerSchema } from "shared";
import { type } from "arktype";
import { mean } from "simple-statistics";

// Exported from doperf/src/worker-configuration.d.ts
type DurableObjectLocationHint = "wnam" | "enam" | "sam" | "weur" | "eeur" | "apac" | "oc" | "afr" | "me";

type EchoSample = {
    rtt: number;        // δ (true RTT after skew correction)
    proc: number;       // server processing time (T3 - T2)
    uplink: number;     // skew-corrected client → server delay
    downlink: number;   // skew-corrected server → client delay
    offset: number;     // θ (clock offset)
};

function deriveSample(T1: number, T2: number, T3: number, T4: number): EchoSample {
    const proc = T3 - T2;

    // NTP math
    const theta = ((T2 - T1) + (T3 - T4)) / 2;                       // offset
    const delta = (T4 - T1) - (T3 - T2);                             // true RTT

    // skew-corrected one-way legs
    const uplink = (T2 - T1) - theta;
    const downlink = (T4 - T3) + theta;

    return { rtt: delta, proc, uplink, downlink, offset: theta };
}


class Echoer {
    ws: WebSocket;
    url: string;
    samples: number;
    processing: boolean;
    results: EchoSample[] = [];

    constructor(url: string, samples = 5, processing = false, locationHint: DurableObjectLocationHint) {
        this.processing = processing;
        this.url = url;
        this.samples = samples;
        this.ws = new WebSocket(`${url}?perfType=${processing ? PERF_TYPE.EchoerProcessing : PERF_TYPE.Echoer}&locationHint=${locationHint}`);
        this.ws.onopen = this.handleOpen;
        this.ws.onmessage = this.handleMessage;
        this.ws.onerror = this.handleError;
        this.ws.onclose = this.handleClose;
    }

    private handleOpen = () => {
        console.log(`[Echoer] Connected → ${this.url}`);
        this.sendPing();
    };

    private sendPing = () => {
        const packet: EchoerSchema = {
            blob: crypto.randomUUID(),
            t_tx_epoch: Date.now(),
            t_rx_epoch: null,
            t_tx2_epoch: null,
            t_rx2_epoch: null,
        };
        this.ws.send(JSON.stringify(packet));
    };

    private handleMessage = (event: MessageEvent) => {
        const parsed = parseEchoer(event.data);
        if (parsed instanceof type.errors) return console.error("[Echoer] Parse error:", parsed.summary);

        // Attach client receive timestamp
        parsed.t_rx2_epoch = Date.now();

        const { t_tx_epoch: T1, t_rx_epoch: T2, t_tx2_epoch: T3, t_rx2_epoch: T4 } = parsed;

        // Validate timestamps
        if (T1 == null || T2 == null || T3 == null || T4 == null) {
            console.warn("[Echoer] Incomplete packet:", parsed);
            return;
        }

        // Use NTP-style calculations with skew correction
        const sample = deriveSample(T1, T2, T3, T4);

        // Store results
        this.results.push(sample);

        console.table({ rtt: sample.rtt, proc: sample.proc, uplink: sample.uplink, downlink: sample.downlink, offset: sample.offset });

        if (this.results.length < this.samples) {
            // Bug: higher timeout ms causes some sort of jitter in the results for some reason
            //      it causes +1ms jitter in the RTT results
            setTimeout(this.sendPing, 10);
        } else {
            this.summarize();
        }
    };

    private summarize() {
        const rtts = this.results.map(r => r.rtt);
        const procs = this.results.map(r => r.proc);
        const uplinks = this.results.map(r => r.uplink);
        const downlinks = this.results.map(r => r.downlink);
        const offsets = this.results.map(r => r.offset);

        console.log("\n====== Echoer Results ======");
        console.log(`Total Samples Collected: ${this.results.length}`);
        console.log(
            `Server Mode: ${this.processing ? "Baseline Echo (no additional processing)" : "Processing Enabled (includes SQLite and computations)"}`
        );
        console.log(`Average RTT:      ${mean(rtts).toFixed(2)} ms`);
        console.log(`Average Server Processing: ${mean(procs).toFixed(2)} ms`);
        console.log(`Average Uplink:   ${mean(uplinks).toFixed(2)} ms`);
        console.log(`Average Downlink: ${mean(downlinks).toFixed(2)} ms`);
        console.log(`Average Clock Offset: ${mean(offsets).toFixed(2)} ms`);
        console.log("===========================\n");
    }


    private handleError = (err: Event) => {
        console.error("[Echoer] WebSocket error:", err);
    };

    private handleClose = (event: CloseEvent) => {
        if (!event.wasClean) {
            console.warn(`[Echoer] Closed unexpectedly (code ${event.code})`);
        } else {
            console.log("[Echoer] Connection closed cleanly.");
        }
    };
}

const DEPLOYED_VERSION = "wss://doperf.cloudflare-c49.workers.dev/"
const LOCAL_DEPLOY_VERSION = "ws://localhost:8787/"
// me = Middle East
new Echoer(DEPLOYED_VERSION, 100, true, "me");
