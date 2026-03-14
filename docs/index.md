# SHIELD Platform

SHIELD Platform agora roda sobre o Backstage oficial. O objetivo desta implantacao e centralizar catalogo, scaffolding, documentacao tecnica e readiness operacional sem recriar um portal paralelo.

## Capacidades habilitadas

- Software Catalog com ownership, domains, systems, components, APIs e resources.
- Scaffolder com templates nativos do Backstage para Node.js, Java, Next.js, Terraform e Kubernetes.
- TechDocs local para onboarding, arquitetura e padroes.
- Plugin Kubernetes habilitado com convencoes para anotacoes e custom resources do Argo CD.
- Estrutura de configuracao pronta para Azure DevOps, Argo CD, Terraform e AKS.

## O que mudou

- O frontend React/Vite proprio foi substituido por um monorepo Backstage oficial.
- Dependencias e codigo acoplados a Supabase foram removidos.
- O conhecimento funcional do projeto foi preservado como entidades, templates, docs e convencoes.
