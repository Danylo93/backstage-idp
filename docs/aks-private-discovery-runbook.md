# Runbook: Discovery de Namespaces em AKS Privado

## Contexto atual

- Projeto Supabase: `higrstkscvhqzjdlqzgp`
- Data planes alinhados: `gondor`, `sokovia`, `wakanda`, `asgard`
- Secrets `K8S_*` já publicados no Supabase.
- Resultado atual do sync: timeout nos 4 clusters.

Motivo: os AKS usam endpoint privado (`*.privatelink`) e a Edge Function hospedada no Supabase Cloud nao alcanca essa rede privada.

## Mapeamento oficial

- `gondor` (dev): subscription `ArgoIT - DEV` (`78e6baa7-cd2b-40cc-8484-97f27ba94b04`)
- `sokovia` (hmg): subscription `ArgoIT - HMG` (`596c76c1-7fe2-4de5-8fb9-cb6b4fe271d9`)
- `wakanda` (hub): subscription `ArgoIT - HUB` (`f5b5ff8c-697e-4b18-a093-2ae8a2d35272`)
- `asgard` (prd): subscription `ArgoIT - PRD` (`cc589e26-f529-4c7b-83fc-92424faba2bc`)

## Caminho recomendado (produzivel)

Executar a discovery **dentro da sua rede Azure** (hub/wakanda), e nao no Supabase Cloud.

### 1. Criar um runner no hub (wakanda)

Opcao mais simples:
- VM Linux jumpbox no hub VNet, com `az`, `kubectl`, `jq`.

Opcao mais robusta:
- Job/CronJob em Kubernetes no `wakanda` com Workload Identity.

### 2. Garantir conectividade privada

No Azure Portal:
- Validar peering entre VNet do hub e VNets onde estao os private endpoints dos AKS.
- Validar Private DNS Zone dos AKS privados (`privatelink.<region>.azmk8s.io`) vinculada a VNet do runner.
- Testar DNS/resolucao do FQDN privado de cada AKS a partir do runner.

Teste rapido no runner:

```bash
nslookup gondor.privatelink.eastus2.azmk8s.io
nslookup sokovia.privatelink.eastus2.azmk8s.io
nslookup wakanda.privatelink.eastus2.azmk8s.io
nslookup asgard.privatelink.eastus2.azmk8s.io
```

### 3. Rodar sync a partir do runner

Do runner, para cada cluster:
1. `az account set --subscription <id>`
2. `az aks get-credentials -g <rg> -n <aks> --overwrite-existing`
3. `kubelogin convert-kubeconfig -l azurecli --context <aks>`
4. `kubectl get ns -o json`
5. upsert na tabela `cluster_namespaces` no Supabase (via service role key).

## Alternativa (nao recomendada)

Abrir API server dos AKS para internet e liberar IPs externos do Supabase.

Riscos:
- perda de isolamento de private cluster;
- manutencao de allowlist externa;
- superficie de ataque maior.

## Definicao de pronto (100%)

1. `sync-cluster-namespaces` retorna `discovered > 0` para os 4 data planes.
2. Tela Platform mostra `Observed Namespaces` preenchido.
3. Tela Runtime Cells deixa de mostrar vazio por falta de componentes/namespaces.

## Observacoes do projeto

- A Edge Function `sync-cluster-namespaces` ja foi ajustada para timeout curto por cluster (15s default), evitando travamento.
- O sync agora considera por padrao o namespace OpenChoreo `shield`.
