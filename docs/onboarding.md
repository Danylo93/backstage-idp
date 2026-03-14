# Onboarding

## Fluxo recomendado

1. Registrar o time em `catalog/org.yaml`.
2. Criar ou ajustar `System`, `Domain` e `Resource` no catalogo.
3. Gerar uma base com um template em `/create`.
4. Confirmar o `catalog-info.yaml`, `mkdocs.yml` e `docs/` gerados no repositorio.
5. Publicar o codigo no Azure Repos.
6. Conectar Azure Pipelines e validar as anotacoes `dev.azure.com/*` e `shield.io/*`.
7. Declarar deployment GitOps, ajustar anotacoes do plugin Kubernetes e publicar TechDocs.

## Convencoes

- Ownership sempre por `group`.
- `System` representa o fluxo de negocio ou capability.
- `Domain` organiza a cadeia de valor.
- `Resource` representa clusters, projetos Azure, registries e control planes compartilhados.
