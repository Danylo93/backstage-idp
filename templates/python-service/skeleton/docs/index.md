# ${{ values.name }}

${{ values.description }}

## Responsabilidade e contexto

- Owner: `${{ values.owner }}`
- System: `${{ values.system }}`
- Ciclo de vida: `${{ values.lifecycle }}`

## Caminho principal

- [x] Registro no catalogo via `catalog-info.yaml`
- [x] OpenAPI rastreada no Backstage
- [x] TechDocs habilitado com `mkdocs.yml`
- [x] Values do GitOps esperados em `gitops/apps/${{ values.tier }}/${{ values.name }}`

## Runtime

- Port: `8080`
- Endpoint de health: `/health`
- Endpoint de readiness: `/ready`
- Endpoint de metadata: `/info`

## Gates de qualidade

- mantenha `catalog-info.yaml`, `mkdocs.yml` e `openapi/openapi.yaml` versionados
- atualize runbook e SLOs antes de promover para producao
- conecte dashboards, tracing e alertas antes de habilitar autosync no Argo CD
