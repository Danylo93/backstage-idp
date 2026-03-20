# Microsoft SSO

## Estado atual no projeto

O SHIELD ja esta preparado para autenticar com Microsoft Entra ID:

- frontend com botao de login Microsoft em `modules/app/src/components/auth/ShieldSignInPage.tsx`
- backend com provider oficial `@backstage/plugin-auth-backend-module-microsoft-provider`
- configuracao em `app-config.yaml` e `app-config.production.yaml`

Os valores esperados pelo Backstage sao:

- `AUTH_MICROSOFT_CLIENT_ID`
- `AUTH_MICROSOFT_CLIENT_SECRET`
- `AUTH_MICROSOFT_TENANT_ID`

## Mapeamento correto dos dados do Azure

Use estes campos da App Registration:

- `AUTH_MICROSOFT_CLIENT_ID`: `Application (client) ID`
- `AUTH_MICROSOFT_TENANT_ID`: `Directory (tenant) ID`
- `AUTH_MICROSOFT_CLIENT_SECRET`: `Value` do client secret

Nao use o `Secret ID` no Backstage. Ele identifica o segredo dentro do Azure, mas nao substitui o `Value`.

## Callback / Redirect URI

O callback do provider Microsoft precisa apontar para a rota de auth do backend do Backstage.

Para desenvolvimento local, use:

```text
http://localhost:7007/api/auth/microsoft/handler/frame
```

Em producao, o callback deve apontar para a URL publica do backend exposta pelo seu ingress ou proxy. Se houver reescrita de rota ou dominio separado para o backend, defina `callbackUrl` explicitamente na configuracao do provider Microsoft.

## Desenvolvimento local

Exporte as variaveis antes de iniciar o workspace:

```bash
export AUTH_MICROSOFT_CLIENT_ID="..."
export AUTH_MICROSOFT_CLIENT_SECRET="..."
export AUTH_MICROSOFT_TENANT_ID="..."
yarn dev
```

## Implantacao

Para producao, injete as mesmas variaveis no runtime do backend:

- container env
- Kubernetes Secret / ExternalSecret
- secret store do ambiente

O `azure-pipelines.yml` deste repositorio constroi a imagem e atualiza valores GitOps, mas nao materializa os secrets de runtime do SSO. Essa parte precisa existir no deploy da aplicacao.

## Checklist rapido

1. Criar ou revisar a App Registration no Entra ID.
2. Configurar o redirect URI do backend do Backstage.
3. Publicar `AUTH_MICROSOFT_CLIENT_ID`, `AUTH_MICROSOFT_CLIENT_SECRET` e `AUTH_MICROSOFT_TENANT_ID` no ambiente de execucao.
4. Garantir que os usuarios autenticados existam no Catalog com email correspondente ao resolver `emailMatchingUserEntityProfileEmail`.
