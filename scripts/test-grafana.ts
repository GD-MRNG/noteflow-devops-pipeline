/**
 * Grafana Cloud connectivity test script.
 * Tests Loki (logs), Tempo traces via OTLP gateway, and Prometheus (metrics).
 *
 * Usage (PowerShell):
 *   $env:GRAFANA_API_KEY="glc_..."          # shared key for Loki + Prometheus
 *   $env:GRAFANA_OTLP_HEADERS="Authorization=Basic <base64>"  # from Grafana Cloud → Connections → OpenTelemetry
 *   bun scripts/test-grafana.ts
 */

export {};

const API_KEY = process.env.GRAFANA_API_KEY ?? '';
if (!API_KEY) {
  console.error('Set $env:GRAFANA_API_KEY before running.');
  process.exit(1);
}

// Full "Authorization=Basic <base64>" header string from Grafana Cloud
// → Connections → OpenTelemetry setup page
const OTLP_HEADERS = process.env.GRAFANA_OTLP_HEADERS ?? '';
if (!OTLP_HEADERS) {
  console.error('Set $env:GRAFANA_OTLP_HEADERS="Authorization=Basic <base64>" before running.');
  process.exit(1);
}

const LOKI = {
  pushUrl: 'https://logs-prod-020.grafana.net/loki/api/v1/push',
  user: '1652686',
};

// OTLP gateway — Grafana Cloud's single endpoint for all signals.
// Credentials come from GRAFANA_OTLP_HEADERS (separate from data source tokens).
const OTLP_GATEWAY = 'https://otlp-gateway-prod-ap-southeast-1.grafana.net/otlp';

const PROM = {
  // OTLP-compatible path on the Grafana Cloud Prometheus endpoint
  otlpUrl: 'https://prometheus-prod-37-prod-ap-southeast-1.grafana.net/api/prom/otlp/v1/metrics',
  user: '3314022',
};

function basicAuth(user: string, password: string) {
  return `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
}

// ─── 1. Loki ─────────────────────────────────────────────────────────────────

async function testLoki() {
  const nowNs = String(Date.now() * 1_000_000);
  const payload = {
    streams: [{
      stream: { app: 'noteflow', env: 'grafana-test' },
      values: [[nowNs, JSON.stringify({ level: 'info', msg: 'grafana connectivity test' })]],
    }],
  };

  const res = await fetch(LOKI.pushUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: basicAuth(LOKI.user, API_KEY),
    },
    body: JSON.stringify(payload),
  });

  const body = res.ok ? '' : ` — ${await res.text()}`;
  console.log(`${res.ok ? '✅' : '❌'} Loki   ${res.status} ${res.statusText}${body}`);
}

// ─── 2. Tempo — OTLP gateway with http/protobuf ──────────────────────────────

async function testTempo() {
  // SDK reads these env vars: endpoint (appends /v1/traces), headers, protocol
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT = OTLP_GATEWAY;
  process.env.OTEL_EXPORTER_OTLP_HEADERS = OTLP_HEADERS;
  process.env.OTEL_EXPORTER_OTLP_PROTOCOL = 'http/protobuf';
  process.env.OTEL_SERVICE_NAME = 'noteflow-test';

  const { NodeSDK } = await import('@opentelemetry/sdk-node');
  const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
  const { trace } = await import('@opentelemetry/api');

  const sdk = new NodeSDK({ traceExporter: new OTLPTraceExporter() });
  sdk.start();

  const tracer = trace.getTracer('noteflow-test');
  const span = tracer.startSpan('grafana-connectivity-test');
  span.setAttribute('test', 'true');
  span.end();

  try {
    await sdk.shutdown();
    console.log('✅ Tempo  span exported — check Grafana Cloud → Explore → Tempo, service=noteflow-test');
  } catch (err) {
    console.log(`❌ Tempo  export failed: ${err}`);
  }
}

// ─── 3. Prometheus ────────────────────────────────────────────────────────────

async function testPrometheus() {
  process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT = PROM.otlpUrl;
  process.env.OTEL_EXPORTER_OTLP_METRICS_HEADERS = `Authorization=${basicAuth(PROM.user, API_KEY)}`;

  const { MeterProvider, PeriodicExportingMetricReader } = await import('@opentelemetry/sdk-metrics');
  const { OTLPMetricExporter } = await import('@opentelemetry/exporter-metrics-otlp-http');

  const exporter = new OTLPMetricExporter();
  const provider = new MeterProvider({
    readers: [new PeriodicExportingMetricReader({ exporter, exportIntervalMillis: 500 })],
  });

  const meter = provider.getMeter('noteflow-test');
  meter.createCounter('noteflow_grafana_test_total', {
    description: 'Grafana connectivity test counter',
  }).add(1, { env: 'grafana-test' });

  try {
    await provider.forceFlush();
    await provider.shutdown();
    console.log('✅ Prom   metric exported — query noteflow_grafana_test_total in Grafana Explore');
  } catch (err) {
    console.log(`❌ Prom   export failed: ${err}`);
  }
}

// ─── Run ──────────────────────────────────────────────────────────────────────

console.log('Testing Grafana Cloud connectivity…\n');
await testLoki();
await testTempo();
await testPrometheus();
console.log('\nDone.');
