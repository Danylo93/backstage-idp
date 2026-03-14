import {
  createValuesContent,
  normalizeOptionalNumber,
  normalizeOptionalString,
  resolveSystemFromOwner,
} from './scaffolderUtils';

describe('scaffolderUtils', () => {
  it('resolves explicit systems first', () => {
    expect(
      resolveSystemFromOwner('group:default/squad-phoenix', 'system:default/core'),
    ).toBe('system:default/core');
  });

  it('derives system names from squad owners', () => {
    expect(resolveSystemFromOwner('group:default/squad-phoenix')).toBe('phoenix');
    expect(resolveSystemFromOwner('group:default/devops-team')).toBe(
      'shield-platform-core',
    );
  });

  it('normalizes optional values', () => {
    expect(normalizeOptionalNumber('42')).toBe(42);
    expect(normalizeOptionalNumber('')).toBeUndefined();
    expect(normalizeOptionalString('  devops  ')).toBe('devops');
    expect(normalizeOptionalString('   ')).toBeUndefined();
  });

  it('creates gitops values files with environment specific hosts', () => {
    const devValues = createValuesContent({
      serviceName: 'payments-api',
      environment: 'dev',
      namespace: 'payments-api',
      projectContext: 'phoenix',
      imageRepository: 'acr.azurecr.io/payments-api',
      labelOwner: 'squad-phoenix',
      labelTeam: 'phoenix',
      labelDepartment: 'engineering',
      servicePort: 8080,
      telemetryInjectionAnnotation: 'instrumentation.opentelemetry.io/inject-java',
    });

    const prdValues = createValuesContent({
      serviceName: 'payments-api',
      environment: 'prd',
      namespace: 'payments-api',
      projectContext: 'phoenix',
      imageRepository: 'acr.azurecr.io/payments-api',
      labelOwner: 'squad-phoenix',
      labelTeam: 'phoenix',
      labelDepartment: 'engineering',
      servicePort: 8080,
      telemetryInjectionAnnotation: 'instrumentation.opentelemetry.io/inject-java',
    });

    expect(devValues).toContain('host: dev-api-aks.argoit.net.br');
    expect(prdValues).toContain('host: api-aks.argoit.net.br');
    expect(devValues).toContain('repository: acr.azurecr.io/payments-api');
  });
});
