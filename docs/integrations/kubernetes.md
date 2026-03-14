# Kubernetes

## Estado atual

- O plugin Kubernetes oficial do Backstage ja esta habilitado no frontend e no backend.
- O projeto esta configurado com `clusterLocatorMethods.type: config`.
- O `serviceLocatorMethod` atual e `multiTenant`, entao os componentes sao encontrados por label selector.
- O recurso customizado `applications.argoproj.io` ja esta preparado para leitura quando os clusters reais forem conectados.

## Como conectar clusters reais

O caminho mais seguro para comecar e ligar os clusters direto na configuracao do Backstage usando o locator oficial `config`.

1. Defina os clusters reais em `app-config.local.yaml` para desenvolvimento local ou no arquivo/config map de producao.
2. Use `authProvider: serviceAccount` no inicio.
3. Passe `serviceAccountToken` e `caData` via variaveis de ambiente do backend.
4. Reinicie o backend do Backstage.
5. Abra um componente com a anotacao `backstage.io/kubernetes-label-selector` e valide se a aba Kubernetes passou a exibir workloads reais.

Exemplo:

```yaml
kubernetes:
  clusterLocatorMethods:
    - type: config
      clusters:
        - name: aks-argo-dev
          title: AKS Argo Dev
          url: https://your-dev-cluster-api-server
          authProvider: serviceAccount
          serviceAccountToken: ${K8S_AKS_ARGO_DEV_TOKEN}
          caData: ${K8S_AKS_ARGO_DEV_CA_DATA}
          skipTLSVerify: false
          skipMetricsLookup: false
        - name: aks-argo-prd
          title: AKS Argo Prd
          url: https://your-prd-cluster-api-server
          authProvider: serviceAccount
          serviceAccountToken: ${K8S_AKS_ARGO_PRD_TOKEN}
          caData: ${K8S_AKS_ARGO_PRD_CA_DATA}
          skipTLSVerify: false
          skipMetricsLookup: false
```

## Convencoes no catalogo

Os componentes do SHIELD ja saem com:

- `backstage.io/kubernetes-label-selector: app.kubernetes.io/name=<nome-do-servico>`

Para esse modelo funcionar bem nos clusters:

- padronize `app.kubernetes.io/name` com o nome do componente
- mantenha namespace e labels consistentes entre repo, GitOps e workload real
- use o mesmo nome da aplicacao no Argo CD e no Kubernetes sempre que possivel

## Quando usar `multiTenant`

O modo atual (`multiTenant`) e o melhor para iniciar porque:

- voce conecta varios clusters sem mexer no template de cada componente
- o plugin procura workloads em todos os clusters configurados
- o componente aparece na aba Kubernetes desde que a label selector bata

## Quando evoluir para `singleTenant`

Se depois voces quiserem explicitar exatamente qual cluster pertence a qual servico, da para evoluir para:

- `serviceLocatorMethod.type: singleTenant`
- anotacoes como `backstage.io/kubernetes-cluster`

Eu nao recomendo fazer isso agora se o objetivo e apenas iniciar a conexao com os clusters.

## Ordem recomendada para a Argo

1. Conectar primeiro `dev` e `prd`.
2. Validar leitura de `Deployment`, `Service`, `Ingress` e `applications.argoproj.io`.
3. Depois adicionar `rc` e `stg`.
4. So depois disso decidir se vale migrar de `multiTenant` para `singleTenant`.

## Validacao

Depois de configurar o cluster:

1. Reinicie o Backstage.
2. Abra um componente ja catalogado.
3. Verifique se a aba Kubernetes mostra recursos reais.
4. Se a aba ficar vazia, confira:
   - `url`, `caData` e token do cluster
   - labels do workload
   - anotacao `backstage.io/kubernetes-label-selector`
   - conectividade de rede do backend ate o API Server
