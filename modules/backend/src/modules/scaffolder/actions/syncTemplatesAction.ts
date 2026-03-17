import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Logger } from 'winston';

const execFileAsync = promisify(execFile);

export type SyncTemplatesActionInput = {
  /**
   * Direção da sincronização: 'pull' (do argo-code) ou 'push' (para argo-code)
   */
  direction: 'pull' | 'push';

  /**
   * Templates para sincronizar (opcional). Se não especificado, sincroniza todos.
   */
  templates?: string[];

  /**
   * Nome do commit a fazer (apenas para push)
   */
  commitMessage?: string;
};

export function createSyncTemplatesAction(options: { logger: Logger }) {
  return createTemplateAction<SyncTemplatesActionInput>({
    id: 'shield:sync:templates',
    description:
      'Sincronizar templates entre Backstage e argo-code (pull ou push)',
    schema: {
      input: {
        type: 'object',
        required: ['direction'],
        properties: {
          direction: {
            type: 'string',
            enum: ['pull', 'push'],
            description:
              "Direção da sincronização: 'pull' do argo-code ou 'push' para argo-code",
          },
          templates: {
            type: 'array',
            items: {
              type: 'string',
            },
            description:
              'Templates para sincronizar (java-service, dotnet-service, python-service). Se não especificado, sincroniza todos.',
          },
          commitMessage: {
            type: 'string',
            description:
              'Mensagem de commit para push. Padrão: "chore(templates): sync from Backstage"',
          },
        },
      },
    },

    async handler(ctx) {
      const { direction, templates, commitMessage } = ctx.input;
      const logger = options.logger.child({
        action: 'shield:sync:templates',
        direction,
      });

      logger.info(`Iniciando sincronização de templates (${direction})...`);

      try {
        // Construir comando
        const syncScriptPath = `${process.cwd()}/scripts/sync-templates.sh`;

        let command: string;

        if (direction === 'pull') {
          command = `${syncScriptPath} pull`;
        } else {
          command = `${syncScriptPath} push`;
        }

        logger.debug(`Executando: ${command}`);

        // Executar script
        const { stdout, stderr } = await execFileAsync('bash', ['-c', command]);

        if (stdout) {
          logger.info(`Output: ${stdout}`);
        }
        if (stderr) {
          logger.warn(`Stderr: ${stderr}`);
        }

        logger.info(`✓ Sincronização de templates (${direction}) completada`);

        // Retornar informações
        ctx.output('synced', {
          direction,
          templates: templates || 'all',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error(
          `Erro ao sincronizar templates: ${error instanceof Error ? error.message : String(error)}`,
        );
        throw error;
      }
    },
  });
}
