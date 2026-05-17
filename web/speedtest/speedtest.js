// In-browser speedtest using speed.cloudflare.com (CORS-enabled).
// Measures latency, download, and upload from the page, no server of our own.

const META_URL = "https://speed.cloudflare.com/meta";
const DOWN_URL = "https://speed.cloudflare.com/__down";
const UP_URL = "https://speed.cloudflare.com/__up";

const els = {
  startBtn: document.getElementById("start-btn"),
  status: document.getElementById("status"),
  progress: document.getElementById("progress-bar"),
  net: document.getElementById("network-panel"),
  readout: {
    ping: document.querySelector('[data-readout="ping"]'),
    pingNum: document.querySelector('[data-readout="ping"] .num'),
    jitter: document.querySelector('[data-readout="jitter"]'),
    download: document.querySelector('[data-readout="download"]'),
    downloadNum: document.querySelector('[data-readout="download"] .num'),
    downloadSub: document.querySelector('[data-readout="download-sub"]'),
    upload: document.querySelector('[data-readout="upload"]'),
    uploadNum: document.querySelector('[data-readout="upload"] .num'),
    uploadSub: document.querySelector('[data-readout="upload-sub"]'),
  },
};

function setField(name, value) {
  const el = els.net.querySelector(`[data-field="${name}"]`);
  if (el) el.textContent = value;
}

function setStatus(msg) {
  els.status.textContent = msg;
}

function setProgress(p) {
  els.progress.style.width = `${Math.min(100, Math.max(0, p * 100))}%`;
}

function fmtMbps(bps) {
  const mbps = bps / 1_000_000;
  if (mbps >= 100) return mbps.toFixed(0);
  if (mbps >= 10) return mbps.toFixed(1);
  return mbps.toFixed(2);
}

function fmtBytes(bytes) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${bytes} B`;
}

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function jitterOf(xs) {
  if (xs.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < xs.length; i++) total += Math.abs(xs[i] - xs[i - 1]);
  return total / (xs.length - 1);
}

async function loadNetworkInfo() {
  // Browser-local bits first; they always work.
  setField("ua", navigator.userAgent);
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (c) {
    setField("conn", c.type || "unknown");
    setField("effective", `${c.effectiveType || "?"} (~${c.downlink ?? "?"} Mbps down, ${c.rtt ?? "?"} ms rtt)`);
    setField("savedata", c.saveData ? "on" : "off");
  } else {
    setField("conn", "unavailable");
    setField("effective", "unavailable");
    setField("savedata", "unavailable");
  }

  try {
    const r = await fetch(META_URL, { cache: "no-store" });
    const m = await r.json();
    setField("ip", m.clientIp || "—");
    const loc = [m.city, m.region, m.country].filter(Boolean).join(", ");
    setField("loc", loc ? `${loc} (colo ${m.colo || "?"})` : `colo ${m.colo || "?"}`);
    setField("asn", `AS${m.asn} ${m.asOrganization || ""}`.trim());
  } catch (err) {
    setField("ip", "lookup failed");
    setField("loc", "lookup failed");
    setField("asn", "lookup failed");
    console.error(err);
  }
}

async function measureLatency(samples = 12) {
  const times = [];
  // First request often pays for connection setup; do a throwaway warmup.
  await fetch(`${DOWN_URL}?bytes=0`, { cache: "no-store" });
  for (let i = 0; i < samples; i++) {
    const t0 = performance.now();
    await fetch(`${DOWN_URL}?bytes=0`, { cache: "no-store" });
    times.push(performance.now() - t0);
    setProgress((i + 1) / samples);
  }
  return { latency: median(times), jitter: jitterOf(times), samples: times };
}

// Streams a single download and reports cumulative bytes through onChunk.
async function downloadOne(bytes, onChunk, signal) {
  const r = await fetch(`${DOWN_URL}?bytes=${bytes}`, { cache: "no-store", signal });
  const reader = r.body.getReader();
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    onChunk(value.byteLength);
  }
  return received;
}

async function measureDownload({ bytesPerStream, parallel, durationMs }) {
  const ctl = new AbortController();
  let total = 0;
  let lastSampleTime = performance.now();
  let lastSampleBytes = 0;
  const t0 = performance.now();
  let stopRequested = false;

  const tick = () => {
    const elapsed = (performance.now() - t0) / 1000;
    const bps = (total * 8) / Math.max(elapsed, 0.001);
    els.readout.downloadNum.textContent = fmtMbps(bps);
    els.readout.downloadSub.textContent = `${fmtBytes(total)} in ${elapsed.toFixed(1)}s`;
    setProgress(Math.min(1, (performance.now() - t0) / durationMs));
    lastSampleTime = performance.now();
    lastSampleBytes = total;
  };
  const interval = setInterval(tick, 120);

  const timeout = setTimeout(() => {
    stopRequested = true;
    ctl.abort();
  }, durationMs);

  const onChunk = (n) => { total += n; };
  const runners = [];
  const runOne = async () => {
    while (!stopRequested) {
      try {
        await downloadOne(bytesPerStream, onChunk, ctl.signal);
      } catch (e) {
        if (e.name === "AbortError") return;
        throw e;
      }
    }
  };
  for (let i = 0; i < parallel; i++) runners.push(runOne());
  await Promise.allSettled(runners);
  clearTimeout(timeout);
  clearInterval(interval);
  tick();

  const elapsed = (performance.now() - t0) / 1000;
  return { bps: (total * 8) / Math.max(elapsed, 0.001), bytes: total, seconds: elapsed };
}

async function uploadOne(payload, signal) {
  await fetch(UP_URL, {
    method: "POST",
    body: payload,
    signal,
    // tell the server not to bother with a meaningful response
    headers: { "Content-Type": "application/octet-stream" },
  });
  return payload.byteLength;
}

async function measureUpload({ bytesPerRequest, parallel, durationMs }) {
  const payload = new Uint8Array(bytesPerRequest);
  // Fill with non-zero to defeat any compression on the wire.
  for (let i = 0; i < payload.length; i += 4096) payload[i] = (i * 37) & 0xff;

  const ctl = new AbortController();
  let total = 0;
  const t0 = performance.now();
  let stopRequested = false;

  const tick = () => {
    const elapsed = (performance.now() - t0) / 1000;
    const bps = (total * 8) / Math.max(elapsed, 0.001);
    els.readout.uploadNum.textContent = fmtMbps(bps);
    els.readout.uploadSub.textContent = `${fmtBytes(total)} in ${elapsed.toFixed(1)}s`;
    setProgress(Math.min(1, (performance.now() - t0) / durationMs));
  };
  const interval = setInterval(tick, 120);
  const timeout = setTimeout(() => {
    stopRequested = true;
    ctl.abort();
  }, durationMs);

  const runOne = async () => {
    while (!stopRequested) {
      try {
        const sent = await uploadOne(payload, ctl.signal);
        total += sent;
      } catch (e) {
        if (e.name === "AbortError") return;
        throw e;
      }
    }
  };
  const runners = [];
  for (let i = 0; i < parallel; i++) runners.push(runOne());
  await Promise.allSettled(runners);
  clearTimeout(timeout);
  clearInterval(interval);
  tick();

  const elapsed = (performance.now() - t0) / 1000;
  return { bps: (total * 8) / Math.max(elapsed, 0.001), bytes: total, seconds: elapsed };
}

function resetReadouts() {
  for (const key of ["ping", "download", "upload"]) {
    els.readout[key].classList.remove("active", "done");
  }
  els.readout.pingNum.textContent = "—";
  els.readout.downloadNum.textContent = "—";
  els.readout.uploadNum.textContent = "—";
  els.readout.jitter.textContent = "jitter —";
  els.readout.downloadSub.textContent = "—";
  els.readout.uploadSub.textContent = "—";
  setProgress(0);
}

async function runTest() {
  els.startBtn.disabled = true;
  resetReadouts();

  try {
    els.readout.ping.classList.add("active");
    setStatus("Measuring latency…");
    const { latency, jitter } = await measureLatency(12);
    els.readout.pingNum.textContent = latency.toFixed(1);
    els.readout.jitter.textContent = `jitter ${jitter.toFixed(1)} ms`;
    els.readout.ping.classList.remove("active");
    els.readout.ping.classList.add("done");

    els.readout.download.classList.add("active");
    setStatus("Measuring download…");
    setProgress(0);
    await measureDownload({ bytesPerStream: 25_000_000, parallel: 4, durationMs: 8000 });
    els.readout.download.classList.remove("active");
    els.readout.download.classList.add("done");

    els.readout.upload.classList.add("active");
    setStatus("Measuring upload…");
    setProgress(0);
    await measureUpload({ bytesPerRequest: 4_000_000, parallel: 3, durationMs: 8000 });
    els.readout.upload.classList.remove("active");
    els.readout.upload.classList.add("done");

    setStatus("Done.");
    setProgress(1);
  } catch (err) {
    console.error(err);
    setStatus(`Failed: ${err.message || err}`);
  } finally {
    els.startBtn.disabled = false;
  }
}

els.startBtn.addEventListener("click", runTest);
loadNetworkInfo();
