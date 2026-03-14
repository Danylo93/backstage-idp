# Argo CD Readiness

## Estrutura ja preparada

- Anotacoes `shield.io/argocd-app-name` e `shield.io/argocd-project`.
- Anotacao `shield.io/gitops-values-path`.
- `customResources` do plugin Kubernetes configurados para `argoproj.io/v1alpha1` `applications`.
- Blueprints e manifests existentes preservados em `docs/argocd-blueprint/`.
- A pagina da entidade ja mostra links diretos para Argo CD e para o `values.yaml` no repo `argo-gitops`.
- O Scaffolder cria apenas `gitops/apps/<tier>/<servico>/<ambiente>/values.yaml` no `argo-gitops`.
- O bootstrap GitOps acontece em branch `feature/<servico>` com PR para `main`.
- O fluxo nao cria nem altera arquivos em `gitops/application/*` ou `gitops/applicationset/*`.
- O caminho de `ExternalSecret` segue o `Produto/Contexto` escolhido no template, por exemplo `dev/core/api-manager`.

## Evolucao sugerida

1. Configurar proxy ou plugin dedicado do ecossistema Backstage para Argo CD.
2. Mapear `sync status`, `health status` e `environment` na pagina da entidade.
3. Ler os `values.yaml` do `argo-gitops` para enriquecer a entity page com imagem, tag e ambiente desejado.
