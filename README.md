# Cloudflare Durable Objects Performance Testing

```bash
# Server
cd doperf && bun install && bun run dev

# Client  
cd client/echoer && bun install
bun run index.ts --clients 5 --samples 50
```

**Data Collected:**
- RTT, processing time, uplink/downlink delays
- Client and server colo locations with airport names
- Regional distribution and likelihood data

Results saved to `results/results-<timestamp>.json`