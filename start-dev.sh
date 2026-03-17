#!/bin/bash
# Script para instalar dependências e iniciar desenvolvimento

set -e

echo "🔧 Instalando dependências..."
npm install

echo ""
echo "🚀 Iniciando servidor de desenvolvimento..."
npm run dev
