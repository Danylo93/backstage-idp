# ${{ values.name }}

${{ values.description }}

## Estrutura

- `src/`: codigo-fonte Python
- `docs/`: documentacao operacional inicial
- `mkdocs.yml`: configuracao do TechDocs
- `openapi/`: contrato OpenAPI do servico
- `.deepsource.toml`: analise estatica
- `azure-pipelines.yml`: pipeline baseada em `argo-code/base-argoit`
- `Dockerfile`: imagem de runtime

## Golden path SHIELD

- ownership, system e lifecycle registrados no catalogo
- contrato OpenAPI publicado no Backstage
- TechDocs versionado junto do codigo
- bootstrap GitOps com values por ambiente
- pipeline, branch policies e links operacionais prontos para observabilidade
