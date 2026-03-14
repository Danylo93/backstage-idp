# Operations

## Runbook

1. Validate pipeline status in Azure DevOps.
2. Confirm GitOps values under `gitops/apps/${{ values.tier }}/${{ values.name }}`.
3. Verify Argo CD sync and health before promoting environments.

## SLO placeholders

- Availability: `99.5%`
- P95 latency: `TBD`
- Error budget policy: `TBD`

## Observability

- define dashboards for request rate, error rate and latency
- expose traces and logs with service name `${{ values.name }}`
- link alerts to the squad channel responsible for `${{ values.owner }}`
