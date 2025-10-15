import { type } from "arktype";

export enum PERF_TYPE {
    Echoer = "echoer",
    EchoerProcessing = "echoer-processing"
}

const echoerSchema = type({
    blob: "string",
    // T1, T2
    t_tx_epoch: "number.epoch | null",          // client transmit time
    t_rx_epoch: "number.epoch | null",   // server receive time
    // T3, T4
    t_tx2_epoch: "number.epoch | null",  // server transmit time
    t_rx2_epoch: "number.epoch | null"   // client receive time
});

export const parseEchoer = type("string.json.parse").to(echoerSchema);

export type EchoerSchema = typeof echoerSchema.infer;