# SHIELD Platform

Backstage implantado e customizado como plataforma interna de desenvolvedores do projeto SHIELD. Esta base substitui o portal React/Supabase anterior por um workspace oficial do Backstage, preservando a proposta de IDP sem recriar funcionalidades que o ecossistema ja entrega.

## O que esta habilitado

- Backstage oficial com `modules/app` e `modules/backend`
- Branding SHIELD Platform
- Catalog com entidades de exemplo reais
- Scaffolder com templates nativos
- TechDocs local
- Plugin Kubernetes habilitado
- Readiness para Azure DevOps, Argo CD e Terraform
- Sem Supabase

## Estrutura

- `modules/app`: frontend Backstage customizado
- `modules/backend`: backend Backstage com plugins oficiais
- `catalog/`: entities e exemplos do SHIELD Platform
- `templates/`: software templates do Scaffolder
- `docs/`: TechDocs e runbooks
- `assets/`: reservado para branding e material visual

## Rodando localmente

Prerequisitos:

- Node.js 24.14.0 (`.nvmrc`)
- Yarn 4 via release commitada em `.yarn/releases`
- Docker opcional para gerar TechDocs localmente com `techdocs.generator.runIn=docker`

Com `nvm`:

```bash
. ~/.nvm/nvm.sh
nvm use
export AZURE_DEVOPS_PAT=...
# opcional: usar token separado para o repo argo-gitops
export AZURE_DEVOPS_GITOPS_PAT=...
yarn install
yarn dev
```

Aplicacao:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:7007`

## Scripts principais

```bash
yarn dev
yarn test
yarn build:all
yarn build:backend
```

## Catalog

Entidades carregadas por padrao:

- `catalog-info.yaml`: a propria plataforma SHIELD
- `catalog/all.yaml`: domains, systems, APIs, resources e locations
- `catalog/org.yaml`: users e groups
- `catalog/components/*/catalog-info.yaml`: componentes de exemplo e TechDocs locais

Para registrar um novo servico:

1. Crie o servico por um template do SHIELD.
2. O template gera `catalog-info.yaml`, `mkdocs.yml` e `docs/` dentro do repositorio criado.
3. O Scaffolder registra automaticamente o `catalog-info.yaml` publicado no Azure Repos.
4. Use ownership, system e anotacoes recomendadas.

Anotacoes recomendadas:

- `backstage.io/techdocs-ref`
- `backstage.io/kubernetes-label-selector`
- `dev.azure.com/project-repo`
- `dev.azure.com/pipeline`
- `shield.io/argocd-app-name`
- `shield.io/argocd-project`
- `shield.io/deployment-environments`

## Templates

Templates iniciais em `templates/`:

- `java-service`
- `dotnet-service`
- `python-service`

Cada template gera pelo menos:

- estrutura inicial do projeto
- `catalog-info.yaml`
- `mkdocs.yml`
- `docs/`
- `Dockerfile`
- pipeline YAML
- `openapi/openapi.yaml`
- `src/` com bootstrap minimo por linguagem

Fluxo atual:

- o Scaffolder renderiza a estrutura usando `fetch:template`
- o backend usa o modulo oficial `publish:azure` do Backstage para criar o repo no Azure Repos e fazer o push inicial
- o repo do servico nasce com `developer` como branch padrao e com as branches-semente `main`, `feature/bootstrap` e `release/bootstrap`
- os templates de servico executam a action `azure:gitops:bootstrap` para criar `gitops/apps/<tier>/<servico>/{dev,rc,stg,prd}/values.yaml` no repo `argo-gitops`
- o bootstrap GitOps cria uma branch `feature/<servico>`, faz o commit nessa branch e abre um PR para `main`
- o fluxo GitOps nao cria `Application`, `ApplicationSet` nem altera `gitops/application/*`; ele escreve apenas os `values.yaml` em `gitops/apps/*`
- o repo gerado recebe `catalog-info.yaml`, `mkdocs.yml` e TechDocs basico como parte do golden path
- o registro no Catalog usa `catalog:register` apontando para o `catalog-info.yaml` do repositorio publicado
- para `java-service`, `dotnet-service` e `python-service`, o `azure-pipelines.yml` gerado aponta para `Devops/argo-code` em `base-argoit/*`
- os formularios pedem owner, system, lifecycle e projeto Azure DevOps
- os formularios usam as versoes atuais por padrao: Java 25, .NET 10 e Python 3.14
- o caminho GitOps esperado fica anotado em `shield.io/gitops-values-path`
- o PAT fica no ambiente do backend, nao nos templates

Estrutura GitOps criada por template:

- `gitops/apps/<tier>/<servico>/dev/values.yaml`
- `gitops/apps/<tier>/<servico>/rc/values.yaml`
- `gitops/apps/<tier>/<servico>/stg/values.yaml`
- `gitops/apps/<tier>/<servico>/prd/values.yaml`

Padrao inicial de `values.yaml`:

- `image.repository` apontando para `acrwakandause2hubiszw.azurecr.io/<servico>`
- `image.tag: bootstrap`
- `labels.owner`, `labels.team`, `labels.department`, `labels.app`, `labels.env`
- `podAnnotations` com a annotation de OpenTelemetry esperada para o template escolhido
- `ingress` interno em `*-api-aks.argoit.net.br`
- `ExternalSecret` e `env` com placeholders iniciais usando o `Produto/Contexto` selecionado no formulario
- `service.port`, `resources`, `nodeSelector` e `tolerations`

Para adicionar um novo template:

1. Crie `templates/<nome>/template.yaml`.
2. Adicione `templates/<nome>/skeleton/` com os arquivos renderizados.
3. Registre o arquivo em `app-config.yaml` dentro de `catalog.locations`.
4. Use apenas actions nativas do Backstage ou modulos oficiais do backend.

## TechDocs

Em desenvolvimento:

- `builder: local`
- `publisher: local`
- `generator.runIn: docker`

Em producao:

- `builder: external`
- `publisher: azureBlobStorage`
- pipeline preparada para gerar e publicar docs fora do runtime do Backstage

Documentacao disponivel:

- onboarding da plataforma
- arquitetura da implantacao
- padroes e anotacoes
- readiness para Azure DevOps, Argo CD, Kubernetes e Terraform
- runbooks e blueprint existentes do repositório

Para adicionar docs em um servico:

1. Crie `mkdocs.yml`.
2. Adicione a pasta `docs/`.
3. Configure `backstage.io/techdocs-ref: dir:.`.

## Azure Repos e Azure Pipelines

O projeto foi preparado para evoluir sem criar integracao fake:

- configuracao reservada em `shield.integrations.azureDevOps`
- `integrations.azure` com token via ambiente do backend
- anotacoes `dev.azure.com/*` nas entidades
- anotacao `shield.io/gitops-values-path`
- templates Java/.NET/Python com `azure-pipelines.yml` apontando para `argo-code/base-argoit`
- scaffolder publicando em Azure Repos com `publish:azure`
- scaffolder bootstrapando `argo-gitops` com a action `azure:gitops:bootstrap`
- bootstrap GitOps abrindo PR automatico a partir de `feature/<servico>`

Repositorios reais usados no fluxo:

- templates de pipeline: `https://dev.azure.com/argosolutions/Devops/_git/argo-code`
- values GitOps: `https://dev.azure.com/argosolutions/Devops/_git/argo-gitops`

Onde colocar o PAT:

```bash
export AZURE_DEVOPS_PAT=...
# opcional, se quiser separar credenciais do repo GitOps
export AZURE_DEVOPS_GITOPS_PAT=...
```

O token deve ficar no processo do backend do Backstage, ou depois em secret store / container env do deploy. Nao deve entrar em `template.yaml`, `azure-pipelines.yml` ou no repositorio gerado.

Passos futuros recomendados:

1. Criar provider de descoberta para catalog entities a partir do Azure DevOps.
2. Exibir status de pipelines na pagina da entidade.
3. Enriquecer o bootstrap GitOps com mais campos especificos de namespace, secrets e ingress por squad ou sistema.

## Argo CD

A base atual prepara a integracao com Argo CD sem UI paralela:

- anotacoes `shield.io/argocd-*`
- anotacao `shield.io/gitops-values-path`
- `customResources` do plugin Kubernetes para `applications.argoproj.io`
- blueprints preservados em `docs/argocd-blueprint/`
- links diretos de Argo CD e GitOps na entity page
- integracao pensada para ler o estado desejado a partir de `gitops/apps/*`, sem recriar `ApplicationSet`

Passos futuros recomendados:

1. Configurar plugin ou proxy oficial/aproveitavel do ecossistema Backstage.
2. Mapear `sync status`, `health status` e `environment` para a entity page.
3. Conectar descoberta GitOps e/ou dados do Argo CD.

## Terraform

Terraform continua em modo readiness da plataforma, mas o template dedicado foi removido desta fase para manter o Scaffolder focado apenas em `java`, `dotnet` e `python`.

## Kubernetes

O plugin Kubernetes oficial ja esta habilitado. O ponto de partida para conectar clusters reais agora fica em:

- `app-config.local.yaml`: exemplo comentado de `clusterLocatorMethods`
- `docs/integrations/kubernetes.md`: passo a passo para conectar AKS e validar discovery

O modo atual e `multiTenant`, com discovery por `backstage.io/kubernetes-label-selector`.

## Decisoes tomadas

- O portal antigo foi removido porque duplicava catalogo, templates, docs e operacao que o Backstage resolve melhor.
- Supabase foi removido por completo.
- Foram mantidos apenas plugins e dependencias alinhados ao objetivo atual.
- Azure DevOps e Argo CD ficaram em modo readiness, sem simulacoes desnecessarias.
- O branding foi aplicado sem recriar o frontend inteiro.
