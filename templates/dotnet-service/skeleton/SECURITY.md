# Security Baseline

Este repositorio nasce com um baseline minimo de seguranca aplicado no CI.

## Controles habilitados

- OWASP Top 10 e SAST com Semgrep usando `p/owasp-top-ten`
- SCA, misconfiguration e secret scan com Trivy em modo `fs`
- falha automatica do pipeline para findings `HIGH` e `CRITICAL`

## Expectativa operacional

- corrigir findings antes de promover para ambientes superiores
- manter dependencias atualizadas para reduzir exposicao conhecida
- evitar segredos no codigo, manifesto, pipeline ou documentacao