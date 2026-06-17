# Service Level Objectives (SLOs)

## Service: noteflow

### SLO 1 — Availability

| | |
|---|---|
| **SLI** | Proportion of HTTP requests that return a non-5xx response |
| **Target** | 99.5% over a rolling 30-day window |
| **Error budget** | 0.5% = ~3.6 hours of downtime per month |
| **Measurement** | `1 - (rate(http_requests_total{status=~"5.."}[30d]) / rate(http_requests_total[30d]))` |

### SLO 2 — Latency

| | |
|---|---|
| **SLI** | p99 HTTP request duration |
| **Target** | < 500ms for 99% of requests over a rolling 7-day window |
| **Measurement** | `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[7d]))` |

---

## Alerts

| Alert | Condition | Severity | Notification |
|---|---|---|---|
| High error rate | Error rate > 5% for 5 minutes | Critical | Email |
| High p99 latency | p99 > 500ms for 5 minutes | Warning | Email |

---

## Dashboards

Grafana Cloud dashboard panels:
- Request rate: `rate(http_requests_total[5m])`
- Error rate: `rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])`
- p99 latency: `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))`
- DB query p95: `histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))`

---

## Error budget policy

- **> 50% budget remaining:** normal development velocity
- **25–50% remaining:** review recent changes for reliability impact
- **< 25% remaining:** freeze non-critical feature work; prioritise reliability fixes
- **Budget exhausted:** incident review required before resuming feature work
