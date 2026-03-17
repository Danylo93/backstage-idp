import {
  coreServices,
  createBackendModule,
  type LoggerService,
} from '@backstage/backend-plugin-api';
import { readFile } from 'fs/promises';
import os from 'os';
import path from 'path';
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
  tokenFile?: string;
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

function expandHomePath(filePath: string) {
  if (filePath === '~') {
    return os.homedir();
  }

  if (filePath.startsWith('~/') || filePath.startsWith('~\\')) {
    return path.join(os.homedir(), filePath.slice(2));
  }

  return filePath;
}

async function readVaultTokenFromFile(
  tokenFilePath: string | undefined,
  logger: LoggerService,
) {
  if (!tokenFilePath) {
    return undefined;
  }

  const resolvedPath = expandHomePath(tokenFilePath);

  try {
    const token = (await readFile(resolvedPath, 'utf8')).trim();

    if (!token) {
      logger.warn(`Arquivo de token do Vault está vazio: ${resolvedPath}`);
      return undefined;
    }

    logger.info(`Usando token do Vault obtido em ${resolvedPath}`);
    return token;
  } catch (error) {
    const code =
      typeof error === 'object' && error && 'code' in error
        ? String(error.code)
        : undefined;

    if (code !== 'ENOENT') {
      logger.warn(
        `Falha ao ler arquivo de token do Vault ${resolvedPath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return undefined;
  }
}

async function resolveVaultToken(
  config: VaultConfig,
  logger: LoggerService,
  providedToken?: string,
): Promise<{ token: string; source: 'input' | 'config' | 'env' | 'file' }> {
  if (providedToken?.trim()) {
    return {
      token: providedToken.trim(),
      source: 'input',
    };
  }

  if (config.token?.trim()) {
    return {
      token: config.token.trim(),
      source: 'config',
    };
  }

  if (process.env.VAULT_TOKEN?.trim()) {
    return {
      token: process.env.VAULT_TOKEN.trim(),
      source: 'env',
    };
  }

  const tokenFromFile = await readVaultTokenFromFile(config.tokenFile, logger);

  if (tokenFromFile) {
    return {
      token: tokenFromFile,
      source: 'file',
    };
  }

  throw new Error(
    config.authMethod === 'oidc'
      ? "Nenhum token Vault disponível. Faça login com 'vault login -method=oidc -path=auth/oidc' ou configure VAULT_TOKEN. Também é possível apontar VAULT_TOKEN_FILE para o arquivo de token."
      : 'Nenhum token Vault disponível. Configure vault.token, VAULT_TOKEN ou VAULT_TOKEN_FILE.',
  );
}

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
  providedToken?: string,
): Promise<VaultClient> {
  const { token, source } = await resolveVaultToken(config, logger, providedToken);

  if (config.authMethod === 'oidc') {
    logger.info(
      `Usando autenticação Vault via OIDC (role: ${config.oidc?.role ?? 'não definida'}, token via ${source}).`,
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
          token: z
            .string({
              description:
                'Token do Vault obtido via login OIDC do usuario. Quando informado, tem precedencia sobre a configuracao global.',
            })
            .optional(),
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

      const client = await createVaultClient(vaultConfig, logger, ctx.input.token);
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
        const tokenFile =
          vaultConfig.getOptionalString('tokenFile') ??
          process.env.VAULT_TOKEN_FILE ??
          '~/.vault-token';

        if (authMethod === 'token' && !token && !tokenFile) {
          logger.error(
            'Método token configurado mas nenhum token foi definido. Configure vault.token, VAULT_TOKEN ou VAULT_TOKEN_FILE.',
          );
          return;
        }

        const resolvedConfig: VaultConfig = {
          endpoint,
          authMethod,
          token,
          tokenFile,
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
