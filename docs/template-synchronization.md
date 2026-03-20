# Sincronização de Templates com argo-code

Este guia explica como criar e editar templates no Backstage mantendo-os sincronizados com o repositório `argo-code`.

## 📋 Visão Geral

Os templates do Backstage (java-service, dotnet-service, python-service) podem ser sincronizados bidirecionalmen com o repositório `argo-code`:

- **Pull**: Importar atualizações do `argo-code` para o Backstage
- **Push**: Exportar mudanças do Backstage para o `argo-code`

## 🚀 Configuração Inicial

### 1. Instalar permissões de execução

```bash
bash scripts/install-sync-templates.sh
```

### 2. Configurar acesso ao argo-code

Certifique-se de que seu environmente tem:

```bash
# Clonar argo-code initially
export ARGO_CODE_URL="https://dev.azure.com/argosolutions/Root%20Cause/_git/poc-argo-code"
export ARGO_CODE_BRANCH="main"

# Para push, você precisa de autenticação Git configurada
git config --global user.email "seu-email@useargo.com"
git config --global user.name "Seu Nome"
```

## 📂 Estrutura de Templates

Os templates estão organizados em:

```
templates/
├── java-service/
│   ├── template.yaml          # Definição do template (não sincroniza automaticamente)
│   └── skeleton/              # Estrutura base (sincroniza)
├── dotnet-service/
│   ├── template.yaml
│   └── skeleton/
└── python-service/
    ├── template.yaml
    └── skeleton/
```

## 🔄 Sincronizando com Script

### Pull: Atualizar Backstage do argo-code

```bash
./scripts/sync-templates.sh pull
```

Isso:
1. Clona/atualiza o repositório `argo-code`
2. Copia os skeletons para o Backstage
3. Avisa se `template.yaml` tem diferenças (você revisa manualmente)

### Push: Enviar mudanças para argo-code

```bash
./scripts/sync-templates.sh push
```

Isso:
1. Copia os skeletons do Backstage para `argo-code`
2. Copia os `template.yaml` atualizados
3. Faz commit e push no branch especificado

### Ver Status

```bash
./scripts/sync-templates.sh status
```

Mostra quais templates estão sincronizados.

### Ver Diferenças

```bash
./scripts/sync-templates.sh diff java-service
```

Mostra as diferenças entre Backstage e argo-code.

## 🎬 Sincronização via Scaffolder (Action)

Você pode adicionar sincronização automática em templates personalizado:

```yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: sync-templates-example
spec:
  steps:
    - id: sync-templates
      name: Sincronizar templates com argo-code
      action: shield:sync:templates
      input:
        direction: pull  # ou 'push'
        templates:       # opcional
          - java-service
          - dotnet-service
        commitMessage: "chore(templates): atualizar estrutura"
```

## 🔗 Fluxo de Trabalho Recomendado

### Para Editar Templates

1. **Editar localmente**
   ```bash
   # Faça mudanças em templates/java-service/skeleton/
   edit templates/java-service/skeleton/pom.xml
   ```

2. **Testar no Backstage**
   ```bash
   # Reiniciar Backstage para testar
   yarn dev
   ```

3. **Sincronizar com argo-code**
   ```bash
   ./scripts/sync-templates.sh status
   ./scripts/sync-templates.sh push
   ```

### Para Atualizar do argo-code

1. **Pull das atualizações**
   ```bash
   ./scripts/sync-templates.sh pull
   ```

2. **Revisar mudanças**
   ```bash
   git diff templates/
   ```

3. **Commit no Backstage**
   ```bash
   git add templates/
   git commit -m "chore(templates): sincronizar com argo-code"
   git push
   ```

## ⚙️ Configuração no app-config.yaml

Para personalizar o comportamento, adicione em `app-config.yaml`:

```yaml
shield:
  templating:
    syncRepository:
      enabled: true
      url: https://dev.azure.com/argosolutions/Root%20Cause/_git/poc-argo-code
      branch: main
      localPath: .argo-code-sync
      templates:
        - java-service
        - dotnet-service
        - python-service
```

## 🛠️ Variáveis de Ambiente

- **ARGO_CODE_URL** - URL do repositório (padrão: configurado no script)
- **ARGO_CODE_BRANCH** - Branch para sincronizar (padrão: main)

## 📋 O que é sincronizado?

### ✅ Sincroniza automaticamente

- `skeleton/` - Estrutura base dos serviços

### ⚠️ Revisão Manual Recomendada

- `template.yaml` - Definição do template
  - Pode ter differences em metadados
  - Revise antes de fazer push

### ❌ NÃO sincroniza

- `.git/` - Histórico Git
- `node_modules/` - Dependências
- Arquivos compilados

## 🐛 Solução de Problemas

### "Permission denied" ao executar script

```bash
chmod +x scripts/sync-templates.sh
bash scripts/install-sync-templates.sh
```

### Erro de autenticação ao fazer push

```bash
# Configurar Git com credenciais Azure DevOps
git config --global credential.provider azure
```

### Rama não existe em argo-code

```bash
# Verificar branches disponíveis
cd .argo-code-sync
git branch -r
```

### Conflitos ao fazer pull

```bash
# Se houver conflitos, resolva manualmente
./scripts/sync-templates.sh pull
# Editar arquivos em conflito
git add templates/
./scripts/sync-templates.sh push
```

## 📚 Próximos Passos

1. **Implementar CI/CD**: Adicionar step no Azure Pipelines para sincronizar
2. **Webhooks**: Sincronizar automaticamente quando argo-code é atualizado
3. **Versionamento**: Controlar versões de templates com tags Git

## 📞 Suporte

Para dúvidas ou problemas:

1. Verificar `./scripts/sync-templates.sh help`
2. Revisar status com `./ scripts/sync-templates.sh status`
3. Verificar logs do Backstage: `yarn dev` mostra output detalhado
