# ArgoCD Blueprint (Shield OpenChoreo Model)

Este blueprint define como usar ArgoCD como runtime plane para os clusters:

- `gondor` (dev)
- `sokovia` (rc)
- `wakanda` (hub)
- `asgard` (stg/prd)

## Fluxo alvo

1. IDP cria/atualiza `values.yaml` no repo GitOps.
2. `ApplicationSet` detecta o app na lista `elements`.
3. ArgoCD cria/atualiza `Application`.
4. ArgoCD sincroniza no cluster correto.
5. Status GitOps (`Synced/OutOfSync/Healthy`) volta para o IDP.

## Convenção de paths (repo argo-gitops)

```text
gitops/apps/backend/<app>/dev/values.yaml
gitops/apps/backend/<app>/rc/values.yaml
gitops/apps/backend/<app>/stg/values.yaml
gitops/apps/backend/<app>/prd/values.yaml
gitops/apps/platform/<app>/hub/values.yaml
```

## ApplicationSets

- `backend-apps-autosync-dev.yaml`: deploy automático em `gondor`.
- `backend-apps-manual-rc.yaml`: deploy manual em `sokovia`.
- `backend-apps-manual-stg.yaml`: deploy manual em `asgard`.
- `backend-apps-manual-prd.yaml`: deploy manual em `asgard`.
- `platform-apps-manual-hub.yaml`: apps de plataforma no `wakanda`.

## Pré-requisitos no ArgoCD

1. Registrar os 4 clusters no ArgoCD.
2. Garantir `AppProject` `shield-backend` e `shield-platform`.
3. Ajustar `repoURL` nos manifests para seu repo GitOps.
4. Ajustar `destination.server` para os clusters reais no ArgoCD.

## Integração com fluxo atual do IDP

Hoje o IDP já atualiza arquivos em:

- `/gitops/apps/backend/<service>/<env>/values.yaml`
- listas em `/gitops/application/backend/*.yaml`

Para adotar este blueprint sem quebrar:

1. Mantenha a estrutura `gitops/apps/backend/...`.
2. Troque/alimente os YAMLs de `ApplicationSet` da pasta `gitops/application/backend/`.
3. Garanta que os nomes de ambiente usados no IDP coincidam com os nomes dos arquivos do ApplicationSet.
