# Sincronização de Templates: Guia de Setup

Este guia orienta você passo a passo para configurar a sincronização de templates entre Backstage e argo-code.

## 🎯 O que foi implementado

1. **Script de sincronização** (`scripts/sync-templates.sh`)
   - Bidirecional: pull e push
   - Múltiplos templates
   - Status e diff

2. **Ação Scaffolder** (`shield:sync:templates`)
   - Integrada ao Backstage
   - Pode ser usada em templates personalizados
   - Sincroniza via interface Web

3. **Template Web UI** (`templates/sync-templates/`)
   - Interface para sincronizar via Backstage
   - Escolher direção (pull/push)
   - Selecionar templates específicos

4. **Pipeline Automático** (`azure-pipelines-sync-templates.yml`)
   - Faz push automático quando templates são editados
   - Executado em CI/CD

5. **Documentação Completa** (`docs/template-synchronization.md`)
   - Casos de uso
   - Troubleshooting
   - Exemplos práticos

## 🚀 Setup Inicial (5 minutos)

### 1. Preparar o ambiente

```bash
cd /home/danylo/devops/backstage

# Dar permissão de execução ao script
chmod +x scripts/sync-templates.sh

# Configurar Git
git config --global user.email "seu-email@useargo.com"
git config --global user.name "Seu Nome"
```

### 2. Testar o script

```bash
# Inicializar (clona argo-code)
./scripts/sync-templates.sh init

# Ver status
./scripts/sync-templates.sh status

# Ver diferenças de um template
./scripts/sync-templates.sh diff java-service
```

### 3. Configurar variáveis no Azure DevOps

Para CI/CD automático, adicone no seu Azure Pipeline:

```yaml
variables:
  ARGO_CODE_URL: 'https://dev.azure.com/argosolutions/Devops/_git/argo-code'
  AZURE_DEVOPS_PAT: $(System.AccessToken)  # ou seu PAT
```

### 4. Verificar configuração

No `app-config.yaml`, confirme que existe:

```yaml
shield:
  integrations:
    templating:
      syncRepository:
        enabled: true
        url: https://dev.azure.com/argosolutions/Devops/_git/argo-code
```

## 📖 Usando no Dia a Dia

### Opção 1: Script CLI (Mais Direto)

```bash
# Trazer mudanças do argo-code
./scripts/sync-templates.sh pull
git add templates/
git commit -m "chore(templates): atualizar do argo-code"
git push

# OU enviar mudanças para argo-code
./scripts/sync-templates.sh push
```

### Opção 2: Web UI (Mais Fácil)

1. Abrir Backstage: `http://localhost:3000`
2. Ir para "Create" (canto superior esquerdo)
3. Buscar por "Sincronizar Templates"
4. Preencher o formulário (pull/push, templates)
5. Executar

### Opção 3: Automático (Hands-Free)

1. Configurar pipeline: `azure-pipelines-sync-templates.yml`
2. Sempre que editar templates, o push é automático

## 🔄 Fluxo de Trabalho Completo

### Editando um template

```bash
# 1. Editar arquivo do skeleton
vim templates/java-service/skeleton/pom.xml

# 2. Testar localmente (opcional)
yarn dev

# 3. Sincronizar com argo-code
./scripts/sync-templates.sh push

# 4. Commit as mudanças no Backstage
git add templates/
git commit -m "feat: atualizar template java-service"
git push
```

### Atualizando a partir do argo-code

```bash
# 1. Pull das mudanças
./scripts/sync-templates.sh pull

# 2. Revisar mudanças
git diff templates/

# 3. Commit no Backstage
git add templates/
git commit -m "chore: sincronizar templates do argo-code"
git push
```

## 📊 Estrutura de Diretórios

```
backstage/
├── templates/
│   ├── java-service/
│   │   ├── template.yaml          # (não sincroniza automaticamente)
│   │   └── skeleton/              # ✅ Sincroniza
│   ├── dotnet-service/
│   │   ├── template.yaml
│   │   └── skeleton/              # ✅ Sincroniza
│   ├── python-service/
│   │   ├── template.yaml
│   │   └── skeleton/              # ✅ Sincroniza
│   └── sync-templates/            # Template Web UI
│       └── template.yaml
├── scripts/
│   └── sync-templates.sh          # Script principal
├── docs/
│   └── template-synchronization.md # Docs completas
└── .argo-code-sync/               # Criado automaticamente
    └── (clone local de argo-code)
```

## 🔐 Segurança

- PAT (Personal Access Token) deve estar em variáveis de ambiente
- Configurar secrets no Azure DevOps para CI/CD
- Nunca fazer commit de tokens nos arquivos

```bash
# Para desenvolvimento local
export AZURE_DEVOPS_PAT="seu-token"

# Para CI/CD no Azure Pipeline
# Adicionar como variável secreta no pipeline
```

## 🐛 Problemas Comuns

### Erro: "script not found"

```bash
chmod +x scripts/sync-templates.sh
```

### Erro: "Permission denied" ao fazer push

```bash
# Verificar credenciais Git
git config --global credential.helper store
```

### Erro: "Repository não encontrado"

```bash
# Verificar que você está no diretório correto
pwd  # Deve ser .../backstage

# Verificar configuraçõesis
echo $ARGO_CODE_URL
echo $ARGO_CODE_BRANCH
```

## ✅ Checklist de Conclusão

- [ ] Script `sync-templates.sh` tem permissão de execução
- [ ] Git configurado com user.email e user.name
- [ ] `AZURE_DEVOPS_PAT` disponível no ambiente
- [ ] Testou `./scripts/sync-templates.sh status`
- [ ] Leu `docs/template-synchronization.md` completo
- [ ] (Opcional) Configurou CI/CD com `azure-pipelines-sync-templates.yml`
- [ ] (Opcional) Testou Web UI: `http://localhost:3000 → Create → Sincronizar Templates`

## 📚 Próximas Etapas

1. **Automatizar com CI/CD**
   - Usar `azure-pipelines-sync-templates.yml` como base
   - Configurar triggers automáticos

2. **Documentar Mudanças no argo-code**
   - Quando atualizar templates, documentar changelog
   - Manter versionamento semântico

3. **Colaboração em Time**
   - Definir quem gerencia templates
   - Documentar processo para outros devs

## 💬 Questões Frequentes

**P: O que significa "skeleton"?**
A: É a estrutura base e arquivos do serviço gerado. Tudo dentro de `skeleton/` é copiado para o novo repositório.

**P: Por que `template.yaml` não sincroniza automaticamente?**
A: Porque o Backstage e argo-code podem ter definições diferentes (metadados, UI fields, etc). Revise antes de fazer push.

**P: Posso ter múltiplos branches?**
A: Sim! Use `export ARGO_CODE_BRANCH=develop` e execute novamente.

**P: Posso sincronizar apenas um template?**
A: Sim! O script suporta: `./scripts/sync-templates.sh diff java-service`

## 🆘 Suporte

Para problemas:

1. Verificar logs: `./scripts/sync-templates.sh` mostra mensagens coloridas
2. Ler documentação: `docs/template-synchronization.md`
3. Ver diretório `.argo-code-sync/` para debug
4. Consultar equipe DevOps

## 📞 Contatos

- **Devops Team**: `devopsacesso@useargo.com`
- **Documentação**: Confira `/docs/template-synchronization.md`
