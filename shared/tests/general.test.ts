import { test, expect } from "bun:test";
import { parseEchoer, type EchoerSchema } from "../index";

test("parseEchoerMessage", () => {
    const now = Date.now();

    const message: EchoerSchema = {
        blob: "test",
        t_tx_epoch: now,
        t_rx_epoch: null,
        t_tx2_epoch: null,
        t_rx2_epoch: null,
    };

    const parsed = parseEchoer(JSON.stringify(message));
    expect(parsed).toEqual(message);
});