# 🔐 Integração Hashicorp Vault com Backstage

## 📋 O que foi Implementado

Integração completa com suporte a:

- ✅ **Múltiplos Auth Methods** (Token, OIDC, GitHub, AWS, K8s, LDAP, Userpass)
- ✅ **OIDC (Argo-DevOps)** - Autenticação via Argo DevOps em produção
- ✅ **Namespaces** - Isolamento de secrets por namespace
- ✅ **Organizações** - Suporte a estruturas organizacionais
- ✅ **4 Ações Scaffolder** - Read, Write, List, Delete secrets
- ✅ **Template Web UI** - Interface para operações de secrets
- ✅ **Dev & Prod** - Configurações para ambos ambientes

## 🚀 Setup Inicial (Produção com OIDC)

### Para Produção: OIDC (Argo-DevOps)

```bash
# Variáveis pré-configuradas para produção:
export VAULT_ADDR="https://tiopatinhas.argoit.net.br"
export VAULT_AUTH_METHOD="oidc"
export VAULT_OIDC_ROLE="backstage"
export VAULT_OIDC_PROVIDER="argo-devops"
export VAULT_NAMESPACE="argo"

# Fazer login com OIDC
vault login -method=oidc -path=auth/oidc
# (Será aberto browser para autenticar via Argo-DevOps)

# Ou se tiver token pré-autorizado:
export VAULT_TOKEN="seu-token-oidc-aqui"
```

### Para Desenvolvimento: Token Local

```bash
# Terminal 1: Iniciar Vault local
vault server -dev
# Copiar o token exibido!

# Terminal 2: Configurar variáveis
export VAULT_ADDR="http://localhost:8200"
export VAULT_AUTH_METHOD="token"
export VAULT_TOKEN="hvs.CAESIBEo..."  # Do terminal 1

# Ou usar arquivo de config local
cp app-config.local.yaml.example app-config.local.yaml
# Editar app-config.local.yaml com seu token
```

### Configuração Automática

O `app-config.yaml` já contém a configuração para **produção** com OIDC:

```yaml
vault:
  endpoint: ${VAULT_ADDR:https://tiopatinhas.argoit.net.br}
  authMethod: ${VAULT_AUTH_METHOD:oidc}
  
  oidc:
    role: ${VAULT_OIDC_ROLE:backstage}
    provider: ${VAULT_OIDC_PROVIDER:argo-devops}
  
  namespace: ${VAULT_NAMESPACE:argo}
  organization: ${VAULT_ORGANIZATION:}
  
  # Token fallback para ambientes sem OIDC
  # token: ${VAULT_TOKEN:}
```

### Instalar Dependências

```bash
cd modules/backend
npm install node-vault
cd ../..
```

### Reiniciar Backstage

```bash
# Desenvolvimento com config local
yarn dev --config app-config.yaml --config app-config.local.yaml

# Ou apenas production
yarn dev
```

Aguarde a inicialização. Se ver `✓ Vault integrado: https://tiopatinhas...`, está funcionando!

## 📚 Usando as Ações

### Via Backstage (Recomendado)
curl -H "X-Vault-Token: seu-token" \
     -X POST \
     -d '{"data": {"username": "admin", "password": "secret123"}}' \
     http://127.0.0.1:8200/v1/secret/data/meu-app
```

### Via Web UI (Recomendado)

1. Abrir Backstage: http://localhost:3000
2. Ir para **Create** (canto superior esquerdo)
3. Procurar por **"Gerenciar Secrets no Vault"**
4. Preencher o formulário:
   - **Operação**: Escolher (ler/escrever/listar/deletar)
   - **Caminho**: `secret/data/meu-app`
   - **Dados** (apenas para escrita): username, password, etc.
5. Clicar "Create"

### Via Template Customizado

```yaml
steps:
  - id: write-db-secret
    name: Criar secret de BD no Vault
    action: vault:secrets:write
    input:
      path: secret/data/production/database
      data:
        username: dbadmin
        password: ${{ parameters.dbPassword }}
        host: db.production.aws.com
        port: 5432
        

  - id: read-db-secret
    name: Ler secret de BD
    action: vault:secrets:read
    input:
      path: secret/data/production/database
```

## 🔐 Ações Disponíveis

### `vault:secrets:read`

Ler um secret do Vault.

**Input:**
```yaml
path: secret/data/meu-app      # Caminho do secret
version: 1                      # (Opcional) Versão específica
```

**Output:**
```yaml
secret: { username: '...', password: '...' }  # Dados do secret
metadata: { version: 1, destroyed: false }    # Metadados
```

### `vault:secrets:write`

Escrever/atualizar um secret no Vault.

**Input:**
```yaml
path: secret/data/meu-app
data:
  username: admin
  password: senha123
options:
  casRequired: false  # (Opcional) Require CAS para evitar conflitos
```

**Output:**
```yaml
path: secret/data/meu-app      # Caminho salvo
version: 1                      # Versão criada
```

###  `vault:secrets:list`

Listar todos os secrets em um caminho.

**Input:**
```yaml
path: secret/metadata  # Caminho para listar (use /metadata para KV v2)
```

**Output:**
```yaml
secrets:
  - my-app
  - database
  - aws-credentials
```

### `vault:secrets:delete`

Deletar um secret do Vault.

**Input:**
```yaml
path: secret/data/meu-app  # Caminho do secret
```

**Output:**
```yaml
deleted: true  # Se foi deletado com sucesso
```

## 🔑 Métodos de Autenticação

O Vault suporta varios métodos de autenticação. Configure no `app-config.yaml`:

### Token (Desenvolvimento)

```yaml
vault:
  endpoint: http://localhost:8200
  token: ${VAULT_TOKEN}
```

```bash
export VAULT_TOKEN="hvs.CAESIBla..."
```

### GitHub (Recomendado para CI/CD)

```yaml
vault:
  endpoint: http://vault.company.com
  authMethod: github
  githubToken: ${GITHUB_TOKEN}
```

### AWS IAM

```yaml
vault:
  endpoint: http://vault.company.com
  authMethod: aws
  awsRole: backstage-role
```

### Kubernetes (Em AKS/EKS)

```yaml
vault:
  endpoint: http://vault.svc.cluster.local
  authMethod: kubernetes
  kubeRole: backstage
  jwtPath: /var/run/secrets/kubernetes.io/serviceaccount/token
```

## 📊 Exemplo Prático: Criar Secret de Banco de Dados

### Passo 1: Escrever Secret no Vault

Use o template "Gerenciar Secrets no Vault":

```
Operação: Escrever um secret
Path: secret/data/production/postgresql
Data:
  - username: postgres
  - password: senhaSegura123!
  - database: meu_app_db
  - host: db.production.aws.com
  - port: 5432
```

### Passo 2: Ler em Outro Template

```yaml
- id: read-db-creds
  name: Ler credenciais do BD
  action: vault:secrets:read
  input:
    path: secret/data/production/postgresql

- id: create-db-connection
  name: Criar connection string
  action: debug:log
  input:
    message: "postgresql://${{ steps['read-db-creds'].output.secret.username }}:${{ steps['read-db-creds'].output.secret.password }}@${{ steps['read-db-creds'].output.secret.host }}"
```

## 🔒 Segurança

### Boas Práticas

✅ **Use auth methods em produção**
- Evite tokens estáticos
- Use GitHub, AWS IAM, Kubernetes, etc.

✅ **Configure policies no Vault**
```hcl
path "secret/data/production/*" {
  capabilities = ["read"]
}

path "secret/data/*/database" {
  capabilities = ["create", "update", "read"]
}
```

✅ **Rotacione tokens regularmente**
- Token com expiração
- Renovar antes de expirar
- Usar auth method em vez de token

❌ **Nunca faça commit de tokens**
```bash
# ❌ ERRADO
export VAULT_TOKEN="hvs.CAESIBla..."  # No código!

# ✅ CERTO
export VAULT_TOKEN="${VAULT_TOKEN}"   # Variável de env
```

❌ **Não armazene secrets em texto aberto**
- Use Vault para tudo
- Não fazer hardcode de senhas

## 🐛 Troubleshooting

### "Connection refused" ao conectar ao Vault

```bash
# Verificar se Vault está rodando
curl http://127.0.0.1:8200/v1/sys/health

# Se não funcionar, inicie Vault
vault server -dev
```

### "Permission denied" ao escrever secret

```bash
# Verificar token
vault token lookup

# Verificar policies do seu token
vault token lookup -self

# Granting Permission (se tiver acesso admin)
vault policy write app-backstage - <<EOF
path "secret/data/app/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
EOF

vault write auth/token/roles/backstage \
  allowed_policies="app-backstage" \
  orphan=true \
  token_ttl=1h \
  token_max_ttl=4h
```

###  "Token expired"

```bash
# Gerar novo token
vault token create -ttl=8760h  # 1 ano

# Ou renovar existente
vault token renew
```

### Ação não aparece no Scaffolder

1. Verificar Backend logs: `yarn dev`
2. Confirmar que `VAULT_TOKEN` ou `VAULT_ADDR` está setado
3. Reiniciar com: `Ctrl+C` → `yarn dev`

## 📖 Próximas Etapas

1. **Integrar com CI/CD**
   - Use Vault para armazenar credenciais do Azure Pipeline
   - Reference no pipeline com `vault:secrets:read`

2. **Sincronizar com argo-code**
   - Armazenar config de secrets no Vault
   - Iterar com sincronização de templates

3. **Setup em Produção**
   - Configure Vault com HA (Alta Disponibilidade)
   - Use auth method apropriado (GitHub, AWS, K8s)
   - Configure backup automático

4. **Auditing**
   - Ativar audit logs no Vault
   - Monitorar acesso a sensitive secrets

## 📞 Suporte

**Para dúvidas sobre Vault:**
- Docs: https://www.vaultproject.io/docs
- API: https://www.vaultproject.io/api-docs

**Para dúvidas sobre Backstage:**
- Docs: https://backstage.io/docs
- Community: https://discord.gg/backstage

## 🔗 Recursos

- [Hashicorp Vault Docs](https://www.vaultproject.io/docs)
- [node-vault NPM Package](https://www.npmjs.com/package/node-vault)
- [Backstage Scaffolder](https://backstage.io/docs/features/software-templates/)
- [Vault Auth Methods](https://www.vaultproject.io/docs/auth)

---

**Status**: ✅ Implementação Concluída  
**Última Atualização**: March 17, 2026
