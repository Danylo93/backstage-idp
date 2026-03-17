#!/bin/bash
# Quick Start: Hashicorp Vault + Backstage
# 
# IMPORTANTE: Este Backstage está configurado para:
# - PRODUÇÃO: Vault com OIDC (Argo-DevOps) em https://tiopatinhas.argoit.net.br
# - DESENVOLVIMENTO: Vault local ou fallback token
#
# Namespace: argo
# Organization: configurável

# ============================================================================
# PARA PRODUÇÃO: OIDC (Argo-DevOps)
# ============================================================================

# 1. Configurar variáveis para produção
export VAULT_ADDR="https://tiopatinhas.argoit.net.br"
export VAULT_AUTH_METHOD="oidc"
export VAULT_OIDC_ROLE="backstage"
export VAULT_OIDC_PROVIDER="argo-devops"
export VAULT_NAMESPACE="argo"

# 2. Fazer login (abrirá browser)
vault login -method=oidc -path=auth/oidc

# 3. Verificar token
vault token lookup -self

# 4. Reinicar Backstage
yarn dev

# ============================================================================
# PARA DESENVOLVIMENTO: Vault Local
# ============================================================================

# Terminal 1: Iniciar Vault em dev mode
vault server -dev
# Copiar o token exibido!

# Terminal 2: Configurar variáveis
export VAULT_ADDR="http://localhost:8200"
export VAULT_AUTH_METHOD="token"
export VAULT_TOKEN="hvs.CAESIBEo..."  # Token do Terminal 1

# Reinicar Backstage
yarn dev --config app-config.yaml --config app-config.local.yaml

# ============================================================================
# CRIAR SECRETS NO VAULT (Argo Namespace)
# ============================================================================

# Com OIDC (produção)
vault kv put secret/argo/dev/database \
  username="postgres" \
  password="dev-senha" \
  host="db-dev.aws.com"

# Com token local (desenvolvimento)
vault kv put secret/database \
  username="postgres" \
  password="local-senha"

# ============================================================================
# LER SECRETS VIA BACKSTAGE
# ============================================================================

# 1. Abrir: http://localhost:3000
# 2. Create → "Gerenciar Secrets no Vault"
# 3. Preencher:
#    - Operação: Ler secret
#    - Path: secret/data/argo/dev/database (produção)
#    - Path: secret/data/database (desenvolvimento)
# 4. Clicar "Create"

# ============================================================================
# TROUBLESHOOTING
# ============================================================================

# Verificar endpoint
curl https://tiopatinhas.argoit.net.br/v1/sys/health

# Ver status do token
vault token lookup

# Renovar token
vault token renew

# Listar secrets
vault kv list secret/argo/

# Ver organizações/namespaces
vault namespace list  # Requer permissões admin

# ============================================================================
# documentação
# ============================================================================

cat docs/vault-integration.md           # Guia completo
cat docs/vault-environment-setup.md     # Setup por ambiente
cat app-config.local.yaml.example       # Exemplo de config local
