# Azure DevOps Readiness

## Escopo atual

Esta implantacao nao adiciona uma integracao fake ou paralela. O Backstage foi preparado para evoluir para Azure DevOps em cima do Catalog e do Scaffolder, usando o fluxo real:

- repositorio de templates: `https://dev.azure.com/argosolutions/Root%20Cause/_git/poc-argo-code`
- base compartilhada de pipeline: `base-argoit/*`
- repositorio GitOps: `https://dev.azure.com/argosolutions/Root%20Cause/_git/poc-argo-gitops`

## Pontos de extensao definidos

- Anotacoes por entidade:
  - `dev.azure.com/project-repo`
  - `dev.azure.com/pipeline`
  - `shield.io/gitops-values-path`
- Configuracao reservada em `app-config.yaml`:
  - `shield.integrations.azureDevOps`
  - `integrations.azure`
- Backend com `@backstage/plugin-scaffolder-backend-module-azure`
- Action `publish:azure` habilitada no Scaffolder
- Action `azure:gitops:bootstrap` para criar `gitops/apps/<tier>/<servico>/<ambiente>/values.yaml`
- Action `shield:gitops:update-backend-applications` para registrar servicos backend em `gitops/application/backend/backend-apps-*.yaml`
- `azure:gitops:bootstrap` criando branch `feature/<servico>` e abrindo PR para `main`
- Templates `java-service`, `dotnet-service` e `python-service` com `azure-pipelines.yml` consumindo `poc-argo-code/base-argoit` e `base-argoit/variables/global.yml`.

## Seguranca

PAT nao deve ser salvo em `template.yaml`, `azure-pipelines.yml`, `catalog-info.yaml` ou no repositorio gerado.

O ambiente do pipeline gerado e resolvido pelo `base-argoit/variables/global.yml`, seguindo o branch source:

- `main` -> `prd`
- `release/*` e `hotfix/*` -> `rc`
- `feature/*` e `develop` -> `dev`

Use:

- variavel de ambiente no processo do backend:

```bash
export AZURE_DEVOPS_PAT=...
export AZURE_DEVOPS_GITOPS_PAT=...
```

- variable group secreta
- service connection
- Azure DevOps Library com segredo

## Proximo passo recomendado

1. Registrar provider de descoberta para Azure Repos.
2. Expor pipelines e status diretamente na pagina da entidade.
3. Enriquecer o bootstrap GitOps com convencoes adicionais de namespace, secret e ingress por contexto da Argo.
