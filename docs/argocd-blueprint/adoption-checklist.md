# Checklist de Adocao (ArgoCD + Shield IDP)

## 1) Registrar clusters no ArgoCD

```bash
argocd cluster list
```

Garanta que os 4 clusters existam e anote o `SERVER` de cada um:

- gondor (dev)
- sokovia (rc)
- wakanda (hub)
- asgard (stg/prd)

## 2) Ajustar `destination.server`

Nos arquivos abaixo, substitua os placeholders `https://<cluster>.cluster.local` pelo `SERVER` real do `argocd cluster list`:

- `backend-apps-autosync-dev.yaml`
- `backend-apps-manual-rc.yaml`
- `backend-apps-manual-stg.yaml`
- `backend-apps-manual-prd.yaml`
- `platform-apps-manual-hub.yaml`

## 3) Aplicar AppProjects e ApplicationSets

```bash
kubectl apply -f appproject-shield-backend.yaml
kubectl apply -f appproject-shield-platform.yaml
kubectl apply -f backend-apps-autosync-dev.yaml
kubectl apply -f backend-apps-manual-rc.yaml
kubectl apply -f backend-apps-manual-stg.yaml
kubectl apply -f backend-apps-manual-prd.yaml
kubectl apply -f platform-apps-manual-hub.yaml
```

## 4) Compatibilidade com o fluxo atual do IDP

Hoje a function `azure-devops` atualiza listas:

- `/gitops/application/backend/backend-apps-autosync-dev.yaml`
- `/gitops/application/backend/backend-apps-manual-rc.yaml`
- `/gitops/application/backend/backend-apps-manual-stg.yaml`
- `/gitops/application/backend/backend-apps-manual-prd.yaml`

## 5) Validar ponta a ponta

1. Criar um componente no IDP.
2. Confirmar update de `values.yaml` + `elements` no repo GitOps.
3. Verificar Application criada no ArgoCD.
4. Verificar sync e health no cluster de destino.
