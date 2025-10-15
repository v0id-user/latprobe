import { parseEchoer, PERF_TYPE, type EchoerSchema } from "shared";
import { type } from "arktype";
import { mean } from "simple-statistics";
import type { DurableObjectLocationHint, EchoSample, EchoerResults } from "./types";

function deriveSample(T1: number, T2: number, T3: number, T4: number, cgiTrace: any): EchoSample {
    const proc = T3 - T2;

    // NTP math
    const theta = ((T2 - T1) + (T3 - T4)) / 2;                       // offset
    const delta = (T4 - T1) - (T3 - T2);                             // true RTT

    // skew-corrected one-way legs
    const uplink = (T2 - T1) - theta;
    const downlink = (T4 - T3) + theta;

    return { rtt: delta, proc, uplink, downlink, offset: theta, cgiTrace };
}

export class Echoer {
    ws: WebSocket;
    url: string;
    samples: number;
    processing: boolean;
    results: EchoSample[] = [];
    private completionPromise: Promise<EchoerResults>;
    private resolveCompletion!: (results: EchoerResults) => void;
    private rejectCompletion!: (error: Error) => void;
    clientId: number;

    constructor(url: string, samples = 5, processing = false, locationHint: DurableObjectLocationHint, clientId = 1) {
        this.processing = processing;
        this.url = url;
        this.samples = samples;
        this.clientId = clientId;
        
        // Create a promise that resolves when all samples are collected
        this.completionPromise = new Promise<EchoerResults>((resolve, reject) => {
            this.resolveCompletion = resolve;
            this.rejectCompletion = reject;
        });
        
        this.ws = new WebSocket(`${url}?perfType=${processing ? PERF_TYPE.EchoerProcessing : PERF_TYPE.Echoer}&locationHint=${locationHint}`);
        this.ws.onopen = this.handleOpen;
        this.ws.onmessage = this.handleMessage;
        this.ws.onerror = this.handleError;
        this.ws.onclose = this.handleClose;
    }
    
    // Wait for all samples to be collected
    async waitForCompletion(): Promise<EchoerResults> {
        return this.completionPromise;
    }

    private handleOpen = () => {
        console.log(`[Echoer #${this.clientId}] Connected → ${this.url}`);
        this.sendPing();
    };

    private sendPing = () => {
        const packet: EchoerSchema = {
            blob: crypto.randomUUID(),
            t_tx_epoch: Date.now(),
            t_rx_epoch: null,
            t_tx2_epoch: null,
            t_rx2_epoch: null,
            cgiTrace: {
                fl: null,
                h: null,
                ip: null,
                ts: null,
                visit_scheme: null,
                uag: null,
                colo: null,
                sliver: null,
                http: null,
                loc: null,
                tls: null,
                sni: null,
                warp: null,
                gateway: null,
                rbi: null,
                kex: null,
            },
        };
        this.ws.send(JSON.stringify(packet));
    };

    private handleMessage = (event: MessageEvent) => {
        const parsed = parseEchoer(event.data);
        if (parsed instanceof type.errors) return console.error("[Echoer] Parse error:", parsed.summary);

        // Attach client receive timestamp
        parsed.t_rx2_epoch = Date.now();

        const { t_tx_epoch: T1, t_rx_epoch: T2, t_tx2_epoch: T3, t_rx2_epoch: T4, cgiTrace } = parsed;

        // Validate timestamps
        if (T1 == null || T2 == null || T3 == null || T4 == null) {
            console.warn("[Echoer] Incomplete packet:", parsed);
            return;
        }

        // Use NTP-style calculations with skew correction
        const sample = deriveSample(T1, T2, T3, T4, cgiTrace);

        // Store results
        this.results.push(sample);

        console.log(`[Echoer #${this.clientId}] Sample ${this.results.length}/${this.samples} - RTT: ${sample.rtt.toFixed(2)}ms`);

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

        const averages = {
            rtt: mean(rtts),
            proc: mean(procs),
            uplink: mean(uplinks),
            downlink: mean(downlinks),
            offset: mean(offsets)
        };

        // Close the WebSocket connection
        this.ws.close();

        // Resolve the completion promise with results
        this.resolveCompletion({
            samples: this.results,
            averages
        });
    }


    private handleError = (err: Event) => {
        console.error(`[Echoer #${this.clientId}] WebSocket error:`, err);
        this.rejectCompletion(new Error("WebSocket error occurred"));
    };

    private handleClose = (event: CloseEvent) => {
        if (!event.wasClean) {
            console.warn(`[Echoer #${this.clientId}] Closed unexpectedly (code ${event.code})`);
            if (this.results.length < this.samples) {
                this.rejectCompletion(new Error(`Connection closed before collecting all samples (${this.results.length}/${this.samples})`));
            }
        } else {
            console.log(`[Echoer #${this.clientId}] Connection closed cleanly.`);
        }
    };
}
