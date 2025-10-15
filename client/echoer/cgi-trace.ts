import type { CgiTrace } from "shared";
/**
 * Extract info about the Durable Object from the Cloudflare Common Gateway Interface (CGI) trace
 *
 * Example response (actual values replaced with *):
 * fl=*
 * h=*
 * ip=*
 * ts=*
 * visit_scheme=*
 * uag=*
 * colo=*
 * sliver=*
 * http=*
 * loc=*
 * tls=*
 * sni=*
 * warp=*
 * gateway=*
 * rbi=*
 * kex=*
 */
export async function cgiTrace(): Promise<CgiTrace> {
    const traceText = await (await fetch("https://www.cloudflare.com/cdn-cgi/trace")).text();
    const result: Record<string, string> = {};
    for (const line of traceText.split("\n")) {
        const [key, ...rest] = line.split("=");
        if (key && rest.length) {
            result[key] = rest.join("=");
        }
    }
    return result as CgiTrace;
}