type GitOpsValuesOptions = {
  serviceName: string;
  environment: string;
  namespace: string;
  projectContext: string;
  imageRepository: string;
  labelOwner: string;
  labelTeam: string;
  labelDepartment: string;
  servicePort: number;
  telemetryInjectionAnnotation: string;
};

export function resolveSystemFromOwner(
  ownerRef: string,
  explicitSystem?: string,
) {
  if (explicitSystem?.trim()) {
    return explicitSystem.trim();
  }

  const ownerName = ownerRef.split('/').pop()?.split(':').pop()?.trim() ?? '';
  if (!ownerName) {
    return 'shield-platform-core';
  }

  if (ownerName === 'squad-plataforma' || ownerName === 'devops-team') {
    return 'shield-platform-core';
  }

  if (ownerName.startsWith('squad-')) {
    return ownerName.replace(/^squad-/, '');
  }

  if (ownerName === 'shield-admins') {
    return 'shield-platform-core';
  }

  return ownerName;
}

export function normalizeOptionalNumber(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }

  return undefined;
}

export function normalizeOptionalString(value: unknown) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

export function createValuesContent(options: GitOpsValuesOptions) {
  const environmentHost =
    options.environment === 'prd'
      ? 'api-aks.argoit.net.br'
      : `${options.environment}-api-aks.argoit.net.br`;
  const secretName = `${options.serviceName}-${options.environment}`;
  const secretPath = `${options.environment}/${options.projectContext}/${options.serviceName}`;

  return `image:
  repository: ${options.imageRepository}
  tag: bootstrap

labels:
  owner: "${options.labelOwner}"
  team: "${options.labelTeam}"
  department: "${options.labelDepartment}"
  app: "${options.serviceName}"
  env: "${options.environment}"

replicaCount: 1

podAnnotations:
  ${options.telemetryInjectionAnnotation}: "opentelemetry-operator-system/elastic-instrumentation-${options.environment}"

autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 3
  targetCPUUtilizationPercentage: 75
  targetMemoryUtilizationPercentage: 75

ingress:
  enabled: true
  className: "nginx-internal"
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/use-regex: "true"
    nginx.ingress.kubernetes.io/rewrite-target: /$1
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "3600"
  hosts:
    - host: ${environmentHost}
      paths:
        - path: /${options.serviceName}/(.*)
          pathType: ImplementationSpecific
  tls:
    - secretName: argoit-wildcard-tls
      hosts:
        - ${environmentHost}

createExternalSecret: true

ExternalSecret:
  name: ${secretName}
  vaultBackend: vault-backend-${options.environment}
  refreshInterval: 15s
  targetName: ${secretName}
  vaultData:
    - secretKey: sample-secret
      remoteRef:
        key: ${secretPath}
        property: sample-secret

env:
  - name: sample-secret
    valueFrom:
      secretKeyRef:
        name: ${secretName}
        key: sample-secret

service:
  type: ClusterIP
  port: ${options.servicePort}

resources:
  requests:
    cpu: 256m
    memory: 512Mi

nodeSelector:
  kubernetes.io/arch: amd64

tolerations:
  - key: "kubernetes.azure.com/scalesetpriority"
    operator: "Equal"
    value: "spot"
    effect: "NoSchedule"
`;
}

export function encodeAzureDevOpsPathSegment(value: string) {
  return encodeURIComponent(value);
}

export function buildAzureDevOpsRepoWebUrl(params: {
  host: string;
  organization: string;
  project: string;
  repo: string;
}) {
  return `https://${params.host}/${params.organization}/${encodeAzureDevOpsPathSegment(
    params.project,
  )}/_git/${encodeAzureDevOpsPathSegment(params.repo)}`;
}

export function buildAzureDevOpsBuildDefinitionUrl(params: {
  organization: string;
  project: string;
  definitionId: number;
}) {
  return `https://dev.azure.com/${params.organization}/${encodeAzureDevOpsPathSegment(
    params.project,
  )}/_build?definitionId=${params.definitionId}`;
}

export function buildAzureDevOpsBuildRunUrl(params: {
  organization: string;
  project: string;
  buildId: number;
}) {
  return `https://dev.azure.com/${params.organization}/${encodeAzureDevOpsPathSegment(
    params.project,
  )}/_build/results?buildId=${params.buildId}&view=results`;
}
