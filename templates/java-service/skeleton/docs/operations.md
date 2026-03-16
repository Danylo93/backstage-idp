# Operacoes

## Runbook

1. Valide o status da pipeline no Azure DevOps.
2. Confirme os values do GitOps em `gitops/apps/${{ values.tier }}/${{ values.name }}`.
3. Verifique sync e health no Argo CD antes de promover ambientes.

## Marcadores de SLO

- Disponibilidade: `99.5%`
- P95 latency: `TBD`
- Politica de error budget: `TBD`

## Observabilidade

- defina dashboards para taxa de requisicoes, taxa de erro e latencia
- exponha traces e logs com o nome de servico `${{ values.name }}`
- vincule alertas ao canal da squad responsavel por `${{ values.owner }}`
