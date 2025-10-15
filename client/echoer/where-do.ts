import Bun from "bun";
export interface WhereDoApiV3 {
    hourly: number; // How many Durable Objects have been spawned in the last hour to power WDOL.
    coverage: number; // Percentage of Cloudflare Colos that support hosting Durable Objects, out of 1.
    colos: {
        [coloId: string]: {
            hosts: {
                [hostColo: string]: {
                    likelihood: number; // Likelihood that a Durable Object will spawn here if requested from the given Worker colo, out of 1.
                    latency: number; // Latency in milliseconds from the given Worker colo to this Durable Object colo.
                };
            };
            nearestRegion: "wnam" | "enam" | "sam" | "weur" | "eeur" | "apac" | "oc" | "afr" | "me";
            regions: {
                wnam: number;
                enam: number;
                sam: number;
                weur: number;
                eeur: number;
                apac: number;
                oc: number;
                afr: number;
                me: number;
            };
        };
    };
}


/**
 * To not DDoS the nice folks at where.durableobjects.live!
 * Their data updates every 5 minutes, we'll only refresh 
 * our local cache at most once every 5 minutes. If you really need
 * the latest scoop NOW, delete `where-do-api-v3.json` and try again.
 */

const CACHE_FILE = "where-do-api-v3.json";
const CACHE_MS = 5 * 60 * 1000; // 5 minutes

export async function getCachedWhereDoApiV3(): Promise<WhereDoApiV3 | null> {
    try {
        const file = Bun.file(CACHE_FILE);
        if (!(await file.exists())) return null;
        const stat = await file.stat();
        const now = Date.now();
        const mtime = stat.mtime.getTime();
        // Check if cache is fresh
        if (now - mtime > CACHE_MS) return null;
        const cached = await file.json();
        if (!cached) return null;
        return cached as WhereDoApiV3;
    } catch {
        return null;
    }
}

export async function cacheWhereDoApiV3(data: WhereDoApiV3): Promise<void> {
    await Bun.write(CACHE_FILE, JSON.stringify(data, null, 2));
}

export async function getWhereDoApiV3(): Promise<WhereDoApiV3> {
    const cached = await getCachedWhereDoApiV3();
    if (cached) return cached;
    const response = await fetch("https://where.durableobjects.live/api/v3/data.json");
    if (!response.ok) throw new Error("Failed to fetch WhereDoApiV3 data");
    const data = await response.json() as WhereDoApiV3;
    await cacheWhereDoApiV3(data);
    return data;
}
