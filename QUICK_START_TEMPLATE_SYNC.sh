#!/bin/bash
# Quick Start: Sincronização de Templates Backstage ↔ argo-code
# Este arquivo resume os comandos mais importantes

# ============================================================================
# SETUP INICIAL (execute uma vez)
# ============================================================================

# 1. Preparar script
chmod +x scripts/sync-templates.sh

# 2. Configurar Git o (se ainda não fez)
git config --global user.email "seu-email@useargo.com"
git config --global user.name "Seu Nome"

# 3. Testar
./scripts/sync-templates.sh init
./scripts/sync-templates.sh status


# ============================================================================
# COMANDOS DIÁRIOS
# ============================================================================

# Ver status dos templates
./scripts/sync-templates.sh status

# Ver diferenças de um template específico
./scripts/sync-templates.sh diff java-service

# Trazer atualizações do argo-code
./scripts/sync-templates.sh pull

# Enviar mudanças para argo-code
./scripts/sync-templates.sh push

# Ver ajuda
./scripts/sync-templates.sh help


# ============================================================================
# FLUXO DE TRABALHO COMPLETO: Editar e Sincronizar
# ============================================================================

# Exemplo: Editar template java-service

# 1. Editar arquivo do skeleton
vim templates/java-service/skeleton/pom.xml

# 2. Testar no Backstage (opcional)
yarn dev

# 3. Sincronizar com argo-code
./scripts/sync-templates.sh push

# 4. Fazer commit no Backstage
git add templates/
git commit -m "feat: atualizar template java-service"
git push


# ============================================================================
# FLUXO DE TRABALHO COMPLETO: Atualizar do argo-code
# ============================================================================

# 1. Pull das mudanças
./scripts/sync-templates.sh pull

# 2. Revisar o que mudou
git diff templates/

# 3. Commit no Backstage
git add templates/
git commit -m "chore: sincronizar templates do argo-code"
git push


# ============================================================================
# WEB UI: Interface no Backstage
# ============================================================================

# 1. Abrir Backstage: http://localhost:3000
# 2. Clicarem "Create" (canto superior esquerdo)
# 3. Buscar por "Sincronizar Templates"
# 4. Preencher formulário:
#    - Direção: pull ou push
#    - Templates: selecionar quais sincronizar (opcional)
#    - Commit Message: mensagem para push (opcional)
# 5. Clicar "Executar" / "Create"


# ============================================================================
# TROUBLESHOOTING
# ============================================================================

# Permissão negada
chmod +x scripts/sync-templates.sh

# Repositório argo-code não encontrado
export ARGO_CODE_URL="https://dev.azure.com/argosolutions/Devops/_git/argo-code"
./scripts/sync-templates.sh init

# Ver mais detalhes de um template
./scripts/sync-templates.sh diff dotnet-service

# Limpar sincronização local (cuidado!)
rm -rf .argo-code-sync/
./scripts/sync-templates.sh init


# ============================================================================
# VARIÁVEIS DE AMBIENTE (opcional)
# ============================================================================

# Customizar URL do argo-code
export ARGO_CODE_URL="https://dev.azure.com/argosolutions/Devops/_git/argo-code"

# Customizar branch
export ARGO_CODE_BRANCH="develop"

# Autenticação Azure DevOps (necessário para push)
export AZURE_DEVOPS_PAT="seu-personal-access-token"


# ============================================================================
# LEITURA RECOMENDADA
# ============================================================================

# Visão geral da sincronização:
cat docs/template-synchronization.md

# Setup detalhado:
cat docs/template-sync-setup.md

# Diagramas e arquitetura:
cat docs/template-sync-architecture.md


# ============================================================================
# MANUAL COMPLETO DO SCRIPT
# ============================================================================

./scripts/sync-templates.sh help
