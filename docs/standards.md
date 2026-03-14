# Standards

## Anotacoes recomendadas

- `backstage.io/techdocs-ref`
- `backstage.io/kubernetes-label-selector` ou `backstage.io/kubernetes-id`
- `dev.azure.com/project-repo`
- `dev.azure.com/pipeline`
- `shield.io/argocd-app-name`
- `shield.io/argocd-project`
- `shield.io/deployment-environments`
- `shield.io/gitops-values-path`

## Estrutura minima por servico

Cada bootstrap gerado pelos templates inclui:

- `catalog-info.yaml`
- `Dockerfile`
- YAML de pipeline
- chart Helm ou manifests base
- documentacao inicial em Markdown

## Ownership

- `Domain`: capability organizacional.
- `System`: produto ou fluxo de negocio.
- `Component`: servico, website ou job.
- `Resource`: infraestrutura e plataformas compartilhadas.
