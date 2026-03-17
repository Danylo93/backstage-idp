import {
  coreServices,
  createBackendModule,
  type LoggerService,
} from '@backstage/backend-plugin-api';
import {
  createTemplateAction,
  scaffolderActionsExtensionPoint,
} from '@backstage/plugin-scaffolder-node';

type VaultAuthMethod =
  | 'token'
  | 'oidc'
  | 'github'
  | 'aws'
  | 'kubernetes'
  | 'userpass'
  | 'ldap';

type VaultOIDCConfig = {
  role: string;
  provider?: string;
  clientId?: string;
};

type VaultConfig = {
  endpoint: string;
  authMethod: VaultAuthMethod;
  token?: string;
  oidc?: VaultOIDCConfig;
  namespace?: string;
  organization?: string;
  skipConsoleWarnings?: boolean;
};

type VaultClient = {
  request(options: { method: string; path: string }): Promise<{ data?: Record<string, unknown> }>;
  read(path: string): Promise<{ data?: { data?: Record<string, unknown>; metadata?: Record<string, unknown> } }>;
  write(
    path: string,
    payload: { data: Record<string, unknown>; options?: { casRequired?: boolean } },
  ): Promise<{ data?: { metadata?: { version?: number }; version?: number } }>;
  list(path: string): Promise<{ data?: { keys?: string[] } }>;
  delete(path: string): Promise<void>;
};

const createNodeVaultClient = require('node-vault') as (config: {
  endpoint: string;
  token?: string;
  namespace?: string;
  skipConsoleWarnings?: boolean;
}) => VaultClient;

function normalizeSecretWriteData(
  input:
    | Record<string, unknown>
    | Array<{
        name: string;
        value: string;
      }>,
) {
  if (Array.isArray(input)) {
    return input.reduce<Record<string, string>>((acc, entry) => {
      if (!entry?.name) {
        return acc;
      }

      acc[entry.name] = entry.value ?? '';
      return acc;
    }, {});
  }

  return input;
}

async function createVaultClient(
  config: VaultConfig,
  logger: LoggerService,
): Promise<VaultClient> {
  let token = config.token;

  if (config.authMethod === 'oidc' && !config.token) {
    logger.info(`Autenticando com Vault via OIDC (role: ${config.oidc?.role})...`);

    try {
      const client = createNodeVaultClient({
        endpoint: config.endpoint,
        namespace: config.namespace,
        skipConsoleWarnings: config.skipConsoleWarnings ?? true,
      });

      const response = await client.request({
        method: 'GET',
        path: `/v1/auth/oidc/oidc_authorization_url_request?role=${config.oidc?.role}`,
      });

      logger.warn(
        'OIDC requer autenticação interativa. Use token gerado pelo provider OIDC.',
      );
      logger.info(
        `URL de autorização: ${String(response.data?.authorization_url ?? 'Não disponível em modo dev')}`,
      );

      token = process.env.VAULT_TOKEN;
      if (!token) {
        throw new Error(
          'OIDC configurado mas VAULT_TOKEN não definido. Configure VAULT_TOKEN ou complete OIDC login interativamente.',
        );
      }
    } catch (error) {
      logger.warn(
        `Falha ao usar OIDC: ${error instanceof Error ? error.message : String(error)}. Usando token fallback.`,
      );
      token = process.env.VAULT_TOKEN;
    }
  }

  if (!token) {
    throw new Error(
      'Nenhum token Vault disponível. Configure VAULT_TOKEN ou use OIDC login.',
    );
  }

  return createNodeVaultClient({
    endpoint: config.endpoint,
    token,
    namespace: config.namespace,
    skipConsoleWarnings: config.skipConsoleWarnings ?? true,
  });
}

function createVaultReadSecretAction(options: {
  logger: LoggerService;
  vaultConfig: VaultConfig;
}) {
  const { logger, vaultConfig } = options;

  return createTemplateAction({
    id: 'vault:secrets:read',
    description: 'Ler um secret do Hashicorp Vault',
    schema: {
      input: z =>
        z.object({
          path: z.string({
            description: 'Caminho do secret no Vault (ex: secret/data/meu-app)',
          }),
          version: z
            .number({
              description:
                'Versão específica do secret (KV v2 apenas). Deixe vazio para pegar a versão mais recente.',
            })
            .optional(),
        }),
      output: z =>
        z.object({
          secret: z.record(z.string(), z.unknown()),
          metadata: z.record(z.string(), z.unknown()),
        }),
    },
    async handler(ctx) {
      logger.info(`Lendo secret do Vault: ${ctx.input.path}`);

      const client = await createVaultClient(vaultConfig, logger);
      const response = await client.read(ctx.input.path);

      logger.info(`Secret lido com sucesso: ${ctx.input.path}`);
      ctx.output('secret', response.data?.data ?? {});
      ctx.output('metadata', response.data?.metadata ?? {});
    },
  });
}

function createVaultWriteSecretAction(options: {
  logger: LoggerService;
  vaultConfig: VaultConfig;
}) {
  const { logger, vaultConfig } = options;

  return createTemplateAction({
    id: 'vault:secrets:write',
    description: 'Escrever um secret no Hashicorp Vault',
    schema: {
      input: z =>
        z.object({
          path: z.string({
            description: 'Caminho onde salvar o secret (ex: secret/data/meu-app)',
          }),
          data: z.union([
            z.record(z.string(), z.unknown()),
            z.array(
              z.object({
                name: z.string({
                  description: 'Nome da variável, ex: DATABASE_URL',
                }),
                value: z.string({
                  description: 'Valor da variável',
                }),
              }),
            ),
          ]),
          options: z
            .object({
              casRequired: z
                .boolean({
                  description:
                    'Se true, requer CAS (Compare-and-Swap) para evitar conflitos',
                })
                .optional(),
            })
            .optional(),
        }),
      output: z =>
        z.object({
          path: z.string(),
          version: z.number(),
        }),
    },
    async handler(ctx) {
      logger.info(`Escrevendo secret no Vault: ${ctx.input.path}`);

      const client = await createVaultClient(vaultConfig, logger);
      const normalizedData = normalizeSecretWriteData(ctx.input.data);
      const response = await client.write(ctx.input.path, {
        data: normalizedData,
        options: ctx.input.options,
      });

      logger.info(`Secret escrito com sucesso: ${ctx.input.path}`);
      ctx.output('path', ctx.input.path);
      ctx.output(
        'version',
        response.data?.metadata?.version ?? response.data?.version ?? 1,
      );
    },
  });
}

function createVaultListSecretsAction(options: {
  logger: LoggerService;
  vaultConfig: VaultConfig;
}) {
  const { logger, vaultConfig } = options;

  return createTemplateAction({
    id: 'vault:secrets:list',
    description: 'Listar secrets no Hashicorp Vault',
    schema: {
      input: {
        path: z =>
          z.string({
            description: 'Caminho para listar (ex: secret/metadata)',
          }),
      },
      output: {
        secrets: z => z.array(z.string()),
      },
    },
    async handler(ctx) {
      logger.info(`Listando secrets no Vault: ${ctx.input.path}`);

      const client = await createVaultClient(vaultConfig, logger);
      const response = await client.list(ctx.input.path);
      const secrets = response.data?.keys ?? [];

      logger.info(`Encontrados ${secrets.length} secrets`);
      ctx.output('secrets', secrets);
    },
  });
}

function createVaultDeleteSecretAction(options: {
  logger: LoggerService;
  vaultConfig: VaultConfig;
}) {
  const { logger, vaultConfig } = options;

  return createTemplateAction({
    id: 'vault:secrets:delete',
    description: 'Deletar um secret do Hashicorp Vault',
    schema: {
      input: {
        path: z =>
          z.string({
            description: 'Caminho do secret a deletar (ex: secret/data/meu-app)',
          }),
      },
      output: {
        deleted: z => z.boolean(),
      },
    },
    async handler(ctx) {
      logger.info(`Deletando secret do Vault: ${ctx.input.path}`);

      const client = await createVaultClient(vaultConfig, logger);
      await client.delete(ctx.input.path);

      logger.info(`Secret deletado com sucesso: ${ctx.input.path}`);
      ctx.output('deleted', true);
    },
  });
}

export const vaultSecretsModule = createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'vault-secrets',
  register(env) {
    env.registerInit({
      deps: {
        scaffolderActions: scaffolderActionsExtensionPoint,
        config: coreServices.rootConfig,
        logger: coreServices.logger,
      },
      async init({ scaffolderActions, config, logger }) {
        const vaultConfig = config.getOptionalConfig('vault');

        if (!vaultConfig) {
          logger.warn('Vault não configurado. Ações do Vault não serão registradas.');
          return;
        }

        const endpoint =
          vaultConfig.getOptionalString('endpoint') ??
          process.env.VAULT_ADDR ??
          'https://tiopatinhas.argoit.net.br';
        const authMethod = (vaultConfig.getOptionalString('authMethod') ??
          process.env.VAULT_AUTH_METHOD ??
          'oidc') as VaultAuthMethod;
        const namespace =
          vaultConfig.getOptionalString('namespace') ??
          process.env.VAULT_NAMESPACE ??
          'argo';
        const organization =
          vaultConfig.getOptionalString('organization') ??
          process.env.VAULT_ORGANIZATION;
        const oidcAuth = vaultConfig.getOptionalConfig('oidc');

        const oidcConfig =
          authMethod === 'oidc' || oidcAuth
            ? {
                role:
                  oidcAuth?.getOptionalString('role') ??
                  process.env.VAULT_OIDC_ROLE ??
                  'backstage',
                provider:
                  oidcAuth?.getOptionalString('provider') ??
                  process.env.VAULT_OIDC_PROVIDER,
                clientId:
                  oidcAuth?.getOptionalString('clientId') ??
                  process.env.VAULT_OIDC_CLIENT_ID,
              }
            : undefined;

        const token =
          vaultConfig.getOptionalString('token') ?? process.env.VAULT_TOKEN;

        if (authMethod === 'token' && !token) {
          logger.error(
            'Método token configurado mas VAULT_TOKEN não definido. Configure vault.token ou VAULT_TOKEN.',
          );
          return;
        }

        const resolvedConfig: VaultConfig = {
          endpoint,
          authMethod,
          token,
          oidc: oidcConfig,
          namespace,
          organization,
          skipConsoleWarnings: true,
        };

        logger.info(
          `Vault integrado: ${endpoint} (método: ${authMethod}${namespace ? `, namespace: ${namespace}` : ''}${organization ? `, org: ${organization}` : ''})`,
        );

        scaffolderActions.addActions(
          createVaultReadSecretAction({ logger, vaultConfig: resolvedConfig }),
          createVaultWriteSecretAction({ logger, vaultConfig: resolvedConfig }),
          createVaultListSecretsAction({ logger, vaultConfig: resolvedConfig }),
          createVaultDeleteSecretAction({ logger, vaultConfig: resolvedConfig }),
        );

        logger.info('Ações Vault registradas com sucesso (read, write, list, delete)');
      },
    });
  },
});

export default vaultSecretsModule;
