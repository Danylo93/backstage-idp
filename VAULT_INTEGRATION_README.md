# 🔐 Hashicorp Vault + Backstage: Solução Implementada

## Versão Produção: OIDC (Argo-DevOps)

**Endpoint de Produção**: https://tiopatinhas.argoit.net.br  
**Método de Autenticação**: OIDC (Argo-DevOps)  
**Namespace**: `argo`  
**Role Backstage**: `backstage`

## O que foi Implementado

✅ **Módulo Vault Backend** - Integração completa com suporte a múltiplos auth methods  
✅ **OIDC Support** - Autenticação via Argo-DevOps em produção  
✅ **Namespace Support** - Isolamento  por namespace (argo)  
✅ **Organization Support** - Estrutura organizacional customizável  
✅ **4 Ações Scaffolder** - read, write, list, delete secrets  
✅ **Web UI Template** - "Gerenciar Secrets no Vault"  
✅ **Dev & Prod Setup** - Configurações para ambos ambientes  
✅ **Documentação Completa** - Setup, OIDC, troubleshooting  

## 🚀 Começar em 5 Minutos

### Produção: OIDC (Recomendado)

```bash
# 1. Configurar variáveis
export VAULT_ADDR="https://tiopatinhas.argoit.net.br"
export VAULT_AUTH_METHOD="oidc"
export VAULT_NAMESPACE="argo"

# 2. Fazer login (abre browser)
vault login -method=oidc -path=auth/oidc

# 3. Instalar dependências
cd modules/backend && npm install node-vault && cd ../..

# 4. Reiniciar Backstage
yarn dev

# 5. Usar: Backstage → Create → "Gerenciar Secrets"
```

### Desenvolvimento: Vault Local

```bash
# Terminal 1: Iniciar Vault
vault server -dev

# Terminal 2: Configurar
export VAULT_ADDR="http://localhost:8200"
export VAULT_TOKEN="hvs.CAESIBEo..."  # Do Terminal 1

# Ou usar app-config.local.yaml
cp app-config.local.yaml.example app-config.local.yaml
yarn dev --config app-config.yaml --config app-config.local.yaml
```

## 📚 Principais Ações

| Ação | Descrição | Path Exemplo |
|------|-----------|--------------|
| `vault:secrets:read` | Ler secret | `secret/data/argo/dev/database` |
| `vault:secrets:write` | Escrever secret | `secret/data/argo/dev/api-keys` |
| `vault:secrets:list` | Listar secrets | `secret/metadata/argo/dev` |
| `vault:secrets:delete` | Deletar secret | `secret/data/argo/staging/temp` |

## 🔐 Métodos de Autenticação Suportados

| Método | Uso | Em Produção |
|--------|-----|-------------|
| **token** | Desenvolvimento local | ❌ Não recomendado |
| **oidc** | Argo-DevOps em produção | ✅ **Recomendado** |
| **github** | GitHub Enterprise | ✅ Possível |
| **aws** | AWS IAM | ✅ Possível |
| **kubernetes** | AKS/EKS | ✅ Possível |
| **ldap** | Corporate LDAP | ✅ Possível |

## 📋 Configuração

### app-config.yaml (Produção com OIDC)

```yaml
vault:
  endpoint: https://tiopatinhas.argoit.net.br
  authMethod: oidc
  
  oidc:
    role: backstage
    provider: argo-devops
  
  namespace: argo
  organization: ${VAULT_ORGANIZATION:}
```

### app-config.local.yaml (Desenvolvimento)

```yaml
vault:
  endpoint: http://localhost:8200
  authMethod: token
  token: hvs.CAESIBEo...
  namespace:
```

## 🔄 Estrutura de Secrets (Argo Namespace)

```
secret/argo/
├── dev/
│   ├── database       # postgres-dev creds
│   ├── api-keys       # dev API keys
│   └── azure-devops   # dev PAT
├── staging/
│   ├── database       # staging DB
│   └── credentials
└── production/
    ├── database       # prod DB (restricted)
    ├── aws            # AWS keys (restricted)
    └── certificates   # SSL certs
```

## 🎯 Exemplo Prático: Criar Secret de BD

### via Backstage Web UI

1. Abrir: http://localhost:3000
2. **Create** → **"Gerenciar Secrets"**
3. Preencer:
   - **Operação**: Escrever um secret
   - **Path**: `secret/data/argo/dev/database`
   - **Data**: 
     ```
     username: postgres
     password: dev-senha-123
     host: db-dev.aws.com
     port: 5432
     ```
4. Clicar **Create**

### Via CLI (Argo Namespace)

```bash
vault kv put secret/argo/dev/database \
  username="postgres" \
  password="dev-senha-123" \
  host="db-dev.aws.com" \
  port="5432"

# Verificar
vault kv get secret/argo/dev/database
```

### Usar  em Template

```yaml
- id: get-db-creds
  action: vault:secrets:read
  input:
    path: secret/data/argo/dev/database

# Output disponível em: steps['get-db-creds'].output.secret
```

## 🛠️ Troubleshooting

### Verificar Endpoint

```bash
curl https://tiopatinhas.argoit.net.br/v1/sys/health
```

### OIDC Login Falha

```bash
# Tentar novamente com path explícito
vault login -method=oidc -path=auth/oidc role=backstage

# Ou verificar auth
vault auth list | grep oidc
```

### Token Expirado

```bash
vault token renew
# Ou fazer login novamente
vault login -method=oidc -path=auth/oidc
```

### Verificar Permissions

```bash
vault token lookup -self
vault policy read backstage-policy
```

## 📖 Leitura Recomendada

1. `docs/vault-integration.md` - Guia completo (20 min)
2. `docs/vault-environment-setup.md` - Setup por ambiente (15 min)
3. `QUICK_START_VAULT.sh` - Commands de referência (5 min)
4. `app-config.local.yaml.example` - Exemplo de config local

## 📞 Recursos

- **Vault Docs**: https://www.vaultproject.io/docs
- **Vault OIDC**: https://www.vaultproject.io/docs/auth/jwt/oidc-providers
- **Backstage Docs**: https://backstage.io/docs
- **node-vault NPM**: https://www.npmjs.com/package/node-vault

## ✅ Checklist Configuração

**Produção (OIDC)**:
- [ ] VAULT_ADDR setada para https://tiopatinhas.argoit.net.br
- [ ] VAULT_AUTH_METHOD = oidc
- [ ] Consegue fazer `vault login -method=oidc`
- [ ] VAULT_NAMESPACE = argo
- [ ] Encontra template "Gerenciar Secrets" no Scaffolder
- [ ] Consegue ler secret em `secret/data/argo/...`

**Desenvolvimento (Token)**:
- [ ] Vault local rodando (`vault server -dev`)
- [ ] VAULT_TOKEN setada
- [ ] app-config.local.yaml criada com token
- [ ] `yarn dev --config app-config.yaml --config app-config.local.yaml`
- [ ] Teste de read/write funcionando

---

**Status**: ✅ Pronto para Usar com OIDC (Argo-DevOps)  
**Última Atualização**: March 17, 2026  
**Endpoint**: https://tiopatinhas.argoit.net.br  
**Namespace**: argo  
**Auth Method**: OIDC (Argo-DevOps)

