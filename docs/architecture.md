# Architecture

## Base oficial

O SHIELD Platform usa o monorepo padrao do Backstage:

- `modules/app`: frontend Backstage customizado com branding SHIELD.
- `modules/backend`: backend Backstage com plugins oficiais necessarios.
- `catalog/`: entidades e exemplos reais.
- `templates/`: software templates nativos do Scaffolder.
- `docs/`: conteudo TechDocs.

## Decisoes principais

- `Catalog`, `Scaffolder`, `TechDocs` e `Kubernetes` permanecem nativos do Backstage.
- Nenhum motor proprio de scaffolding foi criado.
- Azure DevOps e Argo CD foram preparados via convencoes, anotacoes e pontos de extensao, sem simular integracoes complexas.
- O registro de componentes gerados acontece pelo `catalog-info.yaml` publicado em cada repositorio, e nao por escrita local no filesystem do Backstage.
- O projeto atual preserva os blueprints de Argo CD e os runbooks operacionais como documentacao viva.
