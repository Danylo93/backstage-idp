# Configuração do Vault para Diferentes Ambientes

## 📋 app-config.yaml - Configuração Padrão (Produção com OIDC)

O arquivo `app-config.yaml` já contém a configuração para **produção** com OIDC:

```yaml
vault:
  endpoint: https://tiopatinhas.argoit.net.br
  authMethod: oidc
  
  oidc:
    role: backstage
    provider: argo-devops
    clientId: ${VAULT_OIDC_CLIENT_ID}
  
  namespace: argo
  organization: ${VAULT_ORGANIZATION}
```

## 🔧 Configurar para Produção

### 1. Variáveis de Ambiente (Produção)

```bash
# OIDC via Argo-DevOps
export VAULT_ADDR="https://tiopatinhas.argoit.net.br"
export VAULT_AUTH_METHOD="oidc"
export VAULT_OIDC_ROLE="backstage"
export VAULT_OIDC_PROVIDER="argo-devops"
export VAULT_NAMESPACE="argo"

# Opcional: Organization
export VAULT_ORGANIZATION="minha-org"

# Fallback token (não recomendado em produção)
# export VAULT_TOKEN="hvs...."
```

### 2. Fazer Login com OIDC (Produção)

```bash
# Usar Argo-DevOps para autenticar
vault login -method=oidc -path=auth/oidc

# Ou se quiser usar OIDC com role específico:
vault login -method=oidc -path=auth/oidc role=backstage
```

### 3. Descobrir o Token

```bash
# Após fazer login, o token será atribuído automaticamente
vault token lookup -self

# Copiar para variável (se necessário para fallback)
export VAULT_TOKEN=$(vault print token)
```

## 💻 Configurar para Desenvolvimento (Local)

### Opção 1: Usar Vault Local em Dev Mode

```bash
# Terminal 1: Iniciar Vault em dev mode
vault server -dev

# Copiar o token exibido!
# export VAULT_TOKEN="hvs.CAESIBEo..."
```

### Opção 2: Criar app-config.local.yaml

```yaml
# app-config.local.yaml (não fazer commit!)
vault:
  endpoint: http://localhost:8200
  authMethod: token
  token: ${VAULT_TOKEN:hvs.CAESIBEo...}
  namespace:
  organization:
```

```bash
# Usar ao iniciar Backstage:
yarn dev --config app-config.yaml --config app-config.local.yaml
```

### Opção 3: CI/CD (Azure Pipeline)

```yaml
# azure-pipelines.yml
variables:
  VAULT_ADDR: 'https://tiopatinhas.argoit.net.br'
  VAULT_AUTH_METHOD: 'oidc'
  VAULT_OIDC_ROLE: 'backstage'
  VAULT_NAMESPACE: 'argo'

pool:
  vmImage: 'ubuntu-latest'

steps:
  - script: |
      yarn dev
    env:
      VAULT_ADDR: $(VAULT_ADDR)
      VAULT_AUTH_METHOD: $(VAULT_AUTH_METHOD)
```

## 🔐 OIDC (Argo-DevOps) - Produção

### Como Funciona

1. **Backstage** redireciona para Argo-DevOps para autenticação
2. **Argo-DevOps** valida credenciais
3. **Vault** recebe callback OIDC
4. **Token automático** é atribuído com permissões da role `backstage`

### Configurar Role no Vault

```bash
# Acessar Vault como admin
vault login

# Verificar auth OIDC configurado
vault auth list
# Output: oidc  auth_oidc/  OIDC

# Criar/atualizar role backstage
vault write auth/oidc/role/backstage \
  bound_audiences="vault" \
  user_claim="email" \
  role_type="jwt" \
  policies="backstage-policy"

# Criar policy backstage
vault policy write backstage-policy - <<EOF
path "secret/data/argo/*" {
  capabilities = ["read", "list"]
}

path "secret/data/argo/dev/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/data/argo/devops/*" {
  capabilities = ["read", "delete", "list"]
}
EOF
```

## 📊 Estrutura de Paths no Vault (Argo)

Com namespace `argo`, os secrets ficam estruturados assim:

```
secret/
└── argo/                    # Namespace: argo
    ├── dev/
    │   ├── databases/
    │   ├── azure-devops/
    │   └── api-keys/
    ├── staging/
    │   ├── databases/
    │   └── credentials/
    ├── production/
    │   ├── databases/
    │   ├── aws/
    │   └── certificates/
    └── devops/              # Acessível apenas por DevOps
        ├── vault-admin/
        ├── gitlab-token/
        └── artifactory/
```

### Exemplo de secret

```bash
# Escrever
vault kv put secret/argo/dev/databases \
  host="db-dev.aws.com" \
  username="postgres" \
  password="dev-senha-123"

# Ler
vault kv get secret/argo/dev/databases

# Via Backstage (OID autenticado):Scaffolder Template que lê:
```

```yaml
- id: read-db-dev
  action: vault:secrets:read
  input:
    path: secret/data/argo/dev/databases
```

## 🔄 Alternância Entre Ambientes

### Desenvolvimento Local

```bash
# Usar Vault local
export VAULT_ADDR="http://localhost:8200"
export VAULT_AUTH_METHOD="token"
export VAULT_TOKEN="hvs...."
export VAULT_NAMESPACE=""

yarn dev --config app-config.yaml --config app-config.local.yaml
```

### Produção (Azure Container)

```bash
# Usar Vault de produção com OIDC
export VAULT_ADDR="https://tiopatinhas.argoit.net.br"
export VAULT_AUTH_METHOD="oidc"
export VAULT_OIDC_ROLE="backstage"
export VAULT_NAMESPACE="argo"

yarn dev  # ou yarn build && yarn start
```

## 🛠️ Troubleshooting

### OIDC Login Falha

```bash
# Verificar endpoint
curl https://tiopatinhas.argoit.net.br/v1/sys/health

# Verificar se OIDC auth está ativado
vault auth list | grep oidc

# Verificar configuração OIDC
vault auth read auth/oidc/
```

### Token Expirou

```bash
# Renovar token
vault token renew

# Ou fazer login novamente
vault login -method=oidc
```

### Permissão Negada para Path

```bash
# Verificar policies do seu token
vault token lookup -self

# Ver detalhes da policy
vault policy read backstage-policy

# Atualizar policy se necessário
vault policy write backstage-policy - <<EOF
# ... novo conteúdo ...
EOF
```

## 📚 Recursos

- [Vault Documentation](https://www.vaultproject.io/docs)
- [Vault OIDC Auth](https://www.vaultproject.io/docs/auth/jwt/oidc-providers)
- [Backstage Docs](https://backstage.io/docs)

---

**Setup Recomendado**: OIDC em produção + Token local em desenvolvimento
