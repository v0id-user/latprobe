// Type for Durable Object location hints
export type DurableObjectLocationHint = "wnam" | "enam" | "sam" | "weur" | "eeur" | "apac" | "oc" | "afr" | "me";

// CLI Configuration
export interface CliConfig {
    clients: number;
    samples: number;
    url: string;
    location: DurableObjectLocationHint;
    processing: boolean;
}

// Sample metrics
export interface EchoSample {
    rtt: number;        // δ (true RTT after skew correction)
    proc: number;       // server processing time (T3 - T2)
    uplink: number;     // skew-corrected client → server delay
    downlink: number;   // skew-corrected server → client delay
    offset: number;     // θ (clock offset)
}

// Echoer results structure
export interface EchoerResults {
    samples: EchoSample[];
    averages: {
        rtt: number;
        proc: number;
        uplink: number;
        downlink: number;
        offset: number;
    };
}

// Metric statistics
export interface MetricStats {
    mean: number;
    min: number;
    max: number;
    stdDev: number;
}

// JSON export output structure
export interface JsonOutput {
    timestamp: string;
    configuration: {
        clients: number;
        samples: number;
        url: string;
        location: string;
        processing: boolean;
    };
    clients: Array<{
        clientId: number;
        samples: EchoSample[];
        averages: {
            rtt: number;
            proc: number;
            uplink: number;
            downlink: number;
            offset: number;
        };
    }>;
    aggregated: {
        totalSamples: number;
        statistics: {
            rtt: MetricStats;
            proc: MetricStats;
            uplink: MetricStats;
            downlink: MetricStats;
            offset: MetricStats;
        };
    };
}

