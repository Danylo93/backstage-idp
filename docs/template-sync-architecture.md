# Arquitetura de Sincronização de Templates

## Fluxo de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                     BACKSTAGE (Local)                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ templates/                                               │   │
│  │  ├── java-service/skeleton/                             │   │
│  │  ├── dotnet-service/skeleton/                           │   │
│  │  └── python-service/skeleton/                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           ↓ ↑                                    │
│                    [sync-templates.sh]                           │
│                    • pull/push                                   │
│                    • status/diff                                 │
└─────────────────────────────────────────────────────────────────┘
                             ↓ ↑
         ╔═══════════════════════════════════╗
         ║  .argo-code-sync/  (Local Cache)  ║
         ║  ├── templates/*/skeleton/        ║
         ║  └── .git/                        ║
         ╚═══════════════════════════════════╝
                             ↓ ↑
         ╔═══════════════════════════════════╗
         ║     ARGO-CODE (Remote Azure)      ║
         ║  dev.azure.com/.../argo-code     ║
         ║  ├── templates/*/skeleton/        ║
         ║  ├── base-argoit/                 ║
         ║  └── .git/                        ║
         ╚═══════════════════════════════════╝

Legenda:
  ↓   Pull (argo-code → Backstage)
  ↑   Push (Backstage → argo-code)
  ↓↑  Sincronização Bidirecional
```

## 3 Formas de Sincronizar

### 1. CLI Script (Direto)

```
Terminal/Shell
      ↓
./scripts/sync-templates.sh [pull|push|status|diff]
      ↓
Git Clone/Pull/Push
      ↓
Backstage Templates ↔ argo-code
```

### 2. Web UI (Fácil)

```
http://localhost:3000
      ↓
Scaffolder Templates → "Sincronizar Templates"
      ↓
Form: [direction] [templates] [commit message]
      ↓
Backend Action: shield:sync:templates
      ↓
Executa sync-templates.sh
      ↓
Backstage Templates ↔ argo-code
```

### 3. CI/CD Pipeline (Automático)

```
Git Push (templates edited)
      ↓
Azure Pipeline Trigger
      ↓
Job: "Sincronizar com argo-code"
      ↓
./scripts/sync-templates.sh push
      ↓
Auto Commit → argo-code
```

## Diagrama de Fluxo de Dados

```
┌─────────────────────────────────────────────────────────┐
│  USUARIO EDITA TEMPLATE NO BACKSTAGE                    │
│  (templates/java-service/skeleton/pom.xml)              │
└────────────┬────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────┐
│  OPCAO 1: CLI                                           │
│  $ ./scripts/sync-templates.sh push                     │
└────────────┬────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────┐
│  OPCAO 2: WEB UI                                        │
│  Scaffolder → Sincronizar Templates → Push             │
└────────────┬────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────┐
│  OPCAO 3: CI/CD                                         │
│  Git push → Azure Pipeline → Auto-sync                 │
└────────────┬────────────────────────────────────────────┘
             │
    ┌────────┴────────┐
    ↓                 ↓
PULL                 PUSH
    │                 │
    ↓                 ↓
.argo-code-sync/   .argo-code-sync/
  ├── Copia templates/  ├── Copia para argo-code/
  │   do argo-code      │   repositório local
  │                     │
  ↓                     ↓
Atualiza              git commit
Backstage             git push origin main
    │                 │
    └────────┬────────┘
             ↓
    Sincronizacao
     Concluída ✓
```

## Diferenças Entre Métodos

```
┌──────────────┬────────┬──────────┬──────────────┐
│  Método      │ Tempo  │ Fácil?   │ Automático?  │
├──────────────┼────────┼──────────┼──────────────┤
│ CLI Script   │ 10s    │ ⭐⭐⭐  │ ❌ Manual    │
│ Web UI       │ 30s    │ ⭐⭐⭐⭐ │ ❌ Manual    │
│ CI/CD        │ 1-2m   │ ⭐⭐⭐⭐⭐| ✅ Automático│
└──────────────┴────────┴──────────┴──────────────┘
```

## Arquitetura de Componentes (Backend)

```
Scaffolder Backend Module
    ├── shieldScaffolderModule.ts
    │   └── ├── shield:owner:resolve-system
    │       ├── azure:project:ensure-environments
    │       ├── azure:gitops:bootstrap
    │       ├── azure:repos:create-branches
    │       └── [NOVO] shield:sync:templates ← Você adiciona isso!
    │
    └── actions/
        └── syncTemplatesAction.ts
            ├── direction: 'pull' | 'push'
            ├── templates?: string[]
            └── Executa: ./scripts/sync-templates.sh
```

## Fluxo de Pull Detalhado

```
START: Pull Templates da argo-code
  │
  ├─► Clone/Atualiza .argo-code-sync/
  │     └─ git clone argo-code → .argo-code-sync
  │
  ├─► Para cada template (java, dotnet, python):
  │     └─ cp .argo-code-sync/templates/*/skeleton/
  │        →  templates/*/skeleton/
  │
  ├─► Comparar template.yaml
  │     └─ Avisar se há diferenças (review manual)
  │
  ├┬─► Status Git
  │└─ git status mostra mudanças em templates/
  │
  └─► CONCLUÍDO ✓
      Próximo: git add, commit, push
```

## Fluxo de Push Detalhado

```
START: Push Templates para argo-code
  │
  ├─► Clone/Atualiza .argo-code-sync/
  │     └─ git clone argo-code → .argo-code-sync
  │
  ├─► Para cada template (java, dotnet, python):
  │     ├─ cp templates/*/skeleton/
  │     │  →  .argo-code-sync/templates/*/skeleton/
  │     │
  │     └─ cp templates/*/template.yaml
  │        →  .argo-code-sync/templates/*/template.yaml
  │
  ├─► No .argo-code-sync/:
  │     ├─ git add templates/
  │     ├─ git commit -m "chore(templates): sync from Backstage"
  │     └─ git push origin main
  │
  └─► CONCLUÍDO ✓
      argo-code está atualizado!
```

## Gestão de Branches

```
BACKSTAGE REPO
    │
    ├── main ← sempre atualizado
    │
    ├── feature/templates-update ← edições pessoais
    │      ↓
    │      └─► Pull Request
    │         └─► Merge para main
    │            └─► CI/CD Trigger
    │               └─► Auto Push para argo-code
    │
    └── develop ← sincronizado periodicamente

ARGO-CODE REPO
    │
    ├── main ← recebe pushes do Backstage
    │
    ├── develop ← pode ter mudanças paralelas
    │
    └── feature/new-pipeline-base ← mudanças do DevOps
           ↓
           PR → main
           └─► Pull para Backstage (manual)
```

## Configuração de Permissões

```
Quem pode fazer o quê:

┌──────────────┬────────────┬────────────┐
│ Role         │ Pull       │ Push       │
├──────────────┼────────────┼────────────┤
│ Developer    │ ✅ Sim     │❌ Não      │
│ Team Lead    │ ✅ Sim     │ ✅ Sim     │
│ DevOps       │ ✅ Sim     │ ✅ Sim     │
│ CI/CD Bot    │ ✅ Sim     │ ✅ Sim*    │
└──────────────┴────────────┴────────────┘
  * Apenas via Azure Pipeline com PAT configurado
```

## Estado da Sincronização

```
./scripts/sync-templates.sh status

  java-service:    [SINCRONIZADO] ✓
  dotnet-service:  [DIFERENÇAS] ⚠
  python-service:  [SINCRONIZADO] ✓

  Interpretação:
  - ✓ Sincronizado: Argo-code == Backstage
  - ⚠ Diferenças: Mudanças encontradas, revise!
  - ❌ Não existe: Template não encontrado em um dos lados
```

## Ciclo de Vida Completo

```
Dia 1: Setup Inicial
  │
  ├─► Clonar repositório Backstage
  ├─► chmod +x scripts/sync-templates.sh
  ├─► ./scripts/sync-templates.sh init
  └─► Testar: status, diff, pull
        Duration: 5 minutos

Dia N: Editar Templates
  │
  ├─► vim templates/java-service/skeleton/Dockerfile
  ├─► yarn dev (testar)
  ├─► git add, commit, push (Backstage)
  ├─► ./scripts/sync-templates.sh push (→ argo-code)
  └─ Ou: Usar Web UI / CI/CD automático
        Duration: 2 minutos

Futuro: Atualizar do argo-code
  │
  ├─► Devops faz mudança em argo-code
  ├─► ./scripts/sync-templates.sh pull
  ├─► git add, commit, push (Backstage)
  └─► Usar novo modelo no Scaffolder
        Duration: 3 minutos
```

## Segurança & Autorização

```
┌──────────────────────────────────────────┐
│  AUTENTICAÇÃO & SEGURANÇA               │
├──────────────────────────────────────────┤
│ Local:                                  │
│  - Git credentials (local-dev-secret)   │
│  - AZURE_DEVOPS_PAT (env var)          │
│                                         │
│ CI/CD (Azure Pipeline):                │
│  - PAT via Secret Variables             │
│  - Service Principal (recomendado)      │
│  - RBAC no Azure DevOps                 │
│                                         │
│ Boas Práticas:                          │
│  ✓ Nunca fazer commit de tokens        │
│  ✓ Usar Secrets no Pipeline             │
│  ✓ Rotacionar PAT periodicamente        │
│  ✓ Usar Service Principal para CI/CD    │
└──────────────────────────────────────────┘
```
