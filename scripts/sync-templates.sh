#!/bin/bash

# Script para sincronizar templates entre Backstage e argo-code
# Uso: ./scripts/sync-templates.sh <comando> [argumentos]
# Comandos: pull, push, status, diff, init

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKSTAGE_ROOT="$(dirname "$SCRIPT_DIR")"
TEMPLATES_DIR="$BACKSTAGE_ROOT/templates"
ARGO_CODE_URL="${ARGO_CODE_URL:-https://dev.azure.com/argosolutions/Devops/_git/argo-code}"
ARGO_CODE_DIR="${BACKSTAGE_ROOT}/.argo-code-sync"
ARGO_CODE_BRANCH="${ARGO_CODE_BRANCH:-main}"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Inicializar repositório argo-code localmente
init_argo_code() {
    log_info "Inicializando sincronização com argo-code..."
    
    if [ -d "$ARGO_CODE_DIR" ]; then
        log_warn "Diretório de sincronização já existe. Atualizando..."
        cd "$ARGO_CODE_DIR"
        git fetch origin
        git checkout "$ARGO_CODE_BRANCH"
        git pull origin "$ARGO_CODE_BRANCH"
    else
        log_info "Clonando argo-code..."
        git clone --depth 1 --branch "$ARGO_CODE_BRANCH" "$ARGO_CODE_URL" "$ARGO_CODE_DIR"
    fi
    
    log_info "✓ argo-code sincronizado com sucesso"
}

# Fazer pull dos templates do argo-code
pull_templates() {
    init_argo_code
    
    log_info "Fazendo pull dos templates do argo-code..."
    
    local templates=("java-service" "dotnet-service" "python-service")
    
    for template in "${templates[@]}"; do
        local argo_template_dir="$ARGO_CODE_DIR/templates/$template"
        local backstage_template_dir="$TEMPLATES_DIR/$template"
        
        if [ -d "$argo_template_dir" ]; then
            log_info "Sincronizando $template..."
            
            # Copiar skeleton
            if [ -d "$argo_template_dir/skeleton" ]; then
                rm -rf "$backstage_template_dir/skeleton"
                cp -r "$argo_template_dir/skeleton" "$backstage_template_dir/"
            fi
            
            # Comparar template.yaml e avisar se há diferenças
            if [ -f "$argo_template_dir/template.yaml" ]; then
                if ! diff -q "$argo_template_dir/template.yaml" "$backstage_template_dir/template.yaml" >/dev/null 2>&1; then
                    log_warn "$template/template.yaml tem diferenças - revise manualmente"
                fi
            fi
        else
            log_warn "Template $template não encontrado em argo-code"
        fi
    done
    
    log_info "✓ Pull completado"
    log_info "Verifique as mudanças com: git status"
}

# Fazer push dos templates para argo-code
push_templates() {
    init_argo_code
    
    log_info "Fazendo push dos templates para argo-code..."
    
    local templates=("java-service" "dotnet-service" "python-service")
    
    for template in "${templates[@]}"; do
        local argo_template_dir="$ARGO_CODE_DIR/templates/$template"
        local backstage_template_dir="$TEMPLATES_DIR/$template"
        
        if [ -d "$backstage_template_dir" ]; then
            log_info "Sincronizando $template..."
            
            # Copiar skeleton
            if [ -d "$backstage_template_dir/skeleton" ]; then
                rm -rf "$argo_template_dir/skeleton"
                cp -r "$backstage_template_dir/skeleton" "$argo_template_dir/"
            fi
            
            # Copiar template.yaml
            if [ -f "$backstage_template_dir/template.yaml" ]; then
                cp "$backstage_template_dir/template.yaml" "$argo_template_dir/"
            fi
        fi
    done
    
    # Fazer commit e push no argo-code
    cd "$ARGO_CODE_DIR"
    
    if git diff --quiet; then
        log_info "Nenhuma mudança para fazer push"
    else
        log_info "Fazendo commit no argo-code..."
        git add templates/
        git commit -m "chore(templates): sync from Backstage" || true
        
        log_info "Fazendo push para argo-code..."
        git push origin "$ARGO_CODE_BRANCH"
        log_info "✓ Push completado"
    fi
}

# Mostrar status de sincronização
show_status() {
    init_argo_code
    
    log_info "Status de sincronização..."
    echo ""
    
    local templates=("java-service" "dotnet-service" "python-service")
    
    for template in "${templates[@]}"; do
        local argo_template_dir="$ARGO_CODE_DIR/templates/$template"
        local backstage_template_dir="$TEMPLATES_DIR/$template"
        
        echo -n "  $template: "
        
        if [ ! -d "$argo_template_dir" ]; then
            echo -e "${YELLOW}não existe em argo-code${NC}"
        elif [ ! -d "$backstage_template_dir" ]; then
            echo -e "${YELLOW}não existe em Backstage${NC}"
        elif diff -r "$argo_template_dir" "$backstage_template_dir" >/dev/null 2>&1; then
            echo -e "${GREEN}sincronizado${NC}"
        else
            echo -e "${YELLOW}diferenças encontradas${NC}"
        fi
    done
}

# Mostrar diferenças entre templates
show_diff() {
    init_argo_code
    
    local template=$1
    
    if [ -z "$template" ]; then
        log_error "Use: $0 diff <template>"
        echo "Templates disponíveis: java-service, dotnet-service, python-service"
        exit 1
    fi
    
    local argo_template_dir="$ARGO_CODE_DIR/templates/$template"
    local backstage_template_dir="$TEMPLATES_DIR/$template"
    
    if [ ! -d "$argo_template_dir" ] || [ ! -d "$backstage_template_dir" ]; then
        log_error "Template $template não encontrado"
        exit 1
    fi
    
    log_info "Diferenças entre Backstage e argo-code para $template:"
    echo ""
    diff -r "$backstage_template_dir" "$argo_template_dir" || true
}

# Mostrar ajuda
show_help() {
    cat << EOF
Sincronizar templates entre Backstage e argo-code

Uso: $0 <comando> [argumentos]

Comandos:
  init              Inicializar sincronização (clonar argo-code)
  pull              Fazer pull dos templates do argo-code para Backstage
  push              Fazer push dos templates do Backstage para argo-code
  status            Mostrar status de sincronização
  diff <template>   Mostrar diferenças de um template
  help              Mostrar esta mensagem

Variáveis de ambiente:
  ARGO_CODE_URL     URL do repositório argo-code
  ARGO_CODE_BRANCH  Branch para sincronizar (padrão: main)

Exemplos:
  $0 init
  $0 pull
  $0 push
  $0 status
  $0 diff java-service

EOF
}

# Main
case "${1:-help}" in
    init)
        init_argo_code
        ;;
    pull)
        pull_templates
        ;;
    push)
        push_templates
        ;;
    status)
        show_status
        ;;
    diff)
        show_diff "$2"
        ;;
    help)
        show_help
        ;;
    *)
        log_error "Comando desconhecido: $1"
        show_help
        exit 1
        ;;
esac
