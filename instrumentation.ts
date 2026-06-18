export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
    const { getNodeAutoInstrumentations } = await import(
      '@opentelemetry/auto-instrumentations-node'
    );

    // OTLPTraceExporter reads OTEL_EXPORTER_OTLP_ENDPOINT (appends /v1/traces) and
    // OTEL_EXPORTER_OTLP_HEADERS from env automatically, with correct base64-safe parsing.
    const sdk = new NodeSDK({
      traceExporter: new OTLPTraceExporter(),
      instrumentations: [getNodeAutoInstrumentations()],
    });

    sdk.start();
  }
}
