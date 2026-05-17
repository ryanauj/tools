# speedtest

In-browser speedtest and network info viewer. Pure HTML/CSS/JS, no build step.

## What it shows

- **Network info** — public IP, ASN/ISP, Cloudflare colo + approximate location, browser-reported connection type, user agent.
- **Ping & jitter** — RTT to the nearest Cloudflare edge, median of 12 samples.
- **Download** — bytes/sec from 4 parallel HTTPS streams, time-boxed at 8s.
- **Upload** — bytes/sec from 3 parallel POSTs, time-boxed at 8s.

## How it works

Latency, download, and upload all hit [speed.cloudflare.com](https://speed.cloudflare.com/) endpoints (`__down`, `__up`, `meta`) — they're CORS-enabled, so we can use them straight from a static page. Nothing is sent to any server we operate.

## Local preview

```
python3 -m http.server --directory ../ 8000
# then open http://localhost:8000/speedtest/
```

## Caveats

- A single browser tab over a small number of parallel HTTPS connections won't always saturate a fast link — treat numbers as a lower bound.
- Results vary with distance to the nearest Cloudflare colo, server load, and intermediate caches/proxies.
