# ${{ values.name }}

${{ values.description }}

## Ownership

- Owner: `${{ values.owner }}`
- System: `${{ values.system }}`
- Lifecycle: `${{ values.lifecycle }}`

## Golden path

- [x] Catalog registration by `catalog-info.yaml`
- [x] OpenAPI tracked in Backstage
- [x] TechDocs enabled with `mkdocs.yml`
- [x] GitOps values expected under `gitops/apps/${{ values.tier }}/${{ values.name }}`

## Runtime

- Port: `8080`
- Health endpoint: `/health`
- Readiness endpoint: `/ready`
- Metadata endpoint: `/info`

## Quality gates

- keep `catalog-info.yaml`, `mkdocs.yml` and `openapi/openapi.yaml` versioned
- update runbook and SLOs before promoting to production
- wire dashboards, tracing and alerting before enabling autosync in Argo CD
