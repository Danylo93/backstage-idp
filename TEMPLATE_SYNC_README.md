# 🔄 Sincronização de Templates: Solução Implementada

## 📋 Resumo

Você agora tem uma **solução completa e bidirecional** para criar e editar templates no Backstage enquanto mantém sincronização automática com o repositório `argo-code`.

### ✅ O que foi implementado

| Componente | Localização | Descrição |
|-----------|-------------|-----------|
| **Script Sync** | `scripts/sync-templates.sh` | Pull/Push/Status/Diff dos templates |
| **Ação Backend** | `modules/backend/src/modules/scaffolder/actions/syncTemplatesAction.ts` | Ação `shield:sync:templates` integrada |
| **Template Web UI** | `templates/sync-templates/template.yaml` | Interface no Scaffolder para sincronizar |
| **Configuração** | `app-config.yaml` | Seção `shield.integrations.templating` |
| **Pipeline CI/CD** | `azure-pipelines-sync-templates.yml` | Sincronização automática via Azure Pipeline |
| **Documentação** | `docs/template-sync-*.md` | 3 arquivos (setup, uso, arquitetura) |

## 🚀 Comece em 30 Segundos

```bash
# 1. Preparar o script
chmod +x scripts/sync-templates.sh

# 2. Inicializar
./scripts/sync-templates.sh init

# 3. Ver status
./scripts/sync-templates.sh status
```

## 📚 Leitura Recomendada

1. **Primeira vez?** → Leia `docs/template-sync-setup.md` (5 min)
2. **Entender fluxo?** → Leia `docs/template-synchronization.md` (10 min)
3. **Ver diagramas?** → Leia `docs/template-sync-architecture.md` (visual)
4. **Quick reference?** → Veja `QUICK_START_TEMPLATE_SYNC.sh`

## 🎯 3 Formas de Sincronizar

### 1️⃣ CLI Script (Mais Rápido)

```bash
# Pull: Trazer mudanças do argo-code
./scripts/sync-templates.sh pull

# Push: Enviar mudanças para argo-code
./scripts/sync-templates.sh push

# Status: Ver sincronização
./scripts/sync-templates.sh status

# Diff: Comparar templates
./scripts/sync-templates.sh diff java-service
```

### 2️⃣ Web UI (Mais Fácil)

1. Abrir Backstage: http://localhost:3000
2. Criar → "Sincronizar Templates"
3. Preencher e executar

Nenhuma linha de comando necessária!

### 3️⃣ CI/CD (Totalmente Automático)

Use `azure-pipelines-sync-templates.yml` para fazer push automático sempre que templates são editados. Configure no seu Azure Pipeline e ficará tudo automático!

## 🔄 Fluxo de Trabalho Típico

### Editar Um Template

```bash
# 1. Editar arquivo
vim templates/java-service/skeleton/pom.xml

# 2. Sincronizar
./scripts/sync-templates.sh push

# 3. Fazer commit
git add templates/ && git commit -m "feat: atualizar template" && git push
```

### Atualizar Do argo-code

```bash
# 1. Pull
./scripts/sync-templates.sh pull

# 2. Revisar
git diff templates/

# 3. Fazer commit
git add templates/ && git commit -m "chore: sincronizar do argo-code" && git push
```

## 📊 Estrutura de Arquivos

```
📁 backstage/
├── 📄 scripts/sync-templates.sh           ← Script principal
├── 📁 modules/backend/src/.../
│   └── actions/syncTemplatesAction.ts    ← Ação Scaffolder
├── 📁 templates/
│   ├── java-service/skeleton/            ← Sincroniza
│   ├── dotnet-service/skeleton/          ← Sincroniza
│   ├── python-service/skeleton/          ← Sincroniza
│   └── sync-templates/template.yaml      ← Web UI
├── 📁 docs/
│   ├── template-sync-setup.md            ← Setup
│   ├── template-synchronization.md       ← Guia completo
│   └── template-sync-architecture.md     ← Diagramas
├── 📄 app-config.yaml                     ← Config
├── 📄 azure-pipelines-sync-templates.yml  ← CI/CD
├── 📄 QUICK_START_TEMPLATE_SYNC.sh        ← Quick ref
└── 📁 .argo-code-sync/                    ← Cache (criado auto)
```

## 🔐 Segurança

- **Local**: Usar `AZURE_DEVOPS_PAT` em variáveis de ambiente
- **CI/CD**: Usar Secret Variables no Azure Pipeline
- **Recomendado**: Service Principal para CI/CD automático

```bash
# Para desenvolvimento local
export AZURE_DEVOPS_PAT="seu-token-aqui"
./scripts/sync-templates.sh push
```

## ✨ Principais Características

✅ **Bidirecional** - Pull de argo-code OU push para argo-code  
✅ **Múltiplos Templates** - Java, .NET, Python  
✅ **Status & Diff** - Ver o que mudou  
✅ **Web UI** - Não precisa de terminal  
✅ **CI/CD Ready** - Automático no pipeline  
✅ **Bem Documentado** - 3 docs + quick start  
✅ **Fácil Setup** - 30 segundos  

## 🎓 Aprenda Mais

| Tópico | Onde Ler |
|--------|----------|
| Como instalar | `docs/template-sync-setup.md` |
| Como usar | `docs/template-synchronization.md` |
| Diagramas | `docs/template-sync-architecture.md` |
| Comandos | `QUICK_START_TEMPLATE_SYNC.sh` ou `./scripts/sync-templates.sh help` |
| Troubleshooting | `docs/template-synchronization.md#-solução-de-problemas` |

## 🐛 Problema? Solução Rápida

| Erro | Solução |
|------|---------|
| "Permission denied" | `chmod +x scripts/sync-templates.sh` |
| "Repository not found" | `./scripts/sync-templates.sh init` |
| "Authentication failed" | Configurar `AZURE_DEVOPS_PAT` |
| "Script not found" | Verificar que está em `./` do Backstage |
| Não vê ação no Scaffolder | Compilar Backend TypeScript |

## 🔗 Próximas Etapas Opcionais

1. **Automatizar 100%** - Ativar `azure-pipelines-sync-templates.yml`
2. **Colaboração** - Documentar processo para o time
3. **Versionamento** - Controlar versões com Git tags
4. **Webhooks** - Sincronizar quando argo-code é atualizado

## 💡 Casos de Uso

- ✅ Editar templates do Backstage e sincronizar com argo-code
- ✅ Receber atualizações do argo-code no Backstage
- ✅ Revisar diferenças antes de sincronizar
- ✅ Manter git history sincronizado
- ✅ Automatizar sincronização em CI/CD

## 📞 Precisa de Ajuda?

1. Verificar `docs/template-sync-setup.md` (setup inicial)
2. Verificar `docs/template-synchronization.md` (casos e troubleshooting)
3. Rodar `./scripts/sync-templates.sh help`
4. Consultar equipe DevOps

---

**Status**: ✅ Implementação Concluída e Testada  
**Última Atualização**: March 17, 2026  
**Autor**: SHIELD DevOps Team
