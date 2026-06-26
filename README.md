# Guia de Viagens PWA

Esta versão transforma o sistema em PWA instalável e com cache offline.

## Como testar corretamente

1. Extraia o ZIP.
2. Para PWA funcionar, abra via servidor local ou hospedagem HTTPS.
   - Exemplo local:
     ```bash
     cd travel-planner-pwa
     python -m http.server 8000
     ```
   - Depois abra:
     `http://localhost:8000`
3. No celular, hospede em GitHub Pages, Netlify ou Vercel e abra pelo navegador.
4. Android/Chrome: opção "Instalar app".
5. iPhone/Safari: Compartilhar → Adicionar à Tela de Início.

## O que já fica offline

- HTML, CSS e JS principais
- Ícones do app
- Dados continuam salvos no navegador via localStorage

## O que ainda NÃO está offline perfeito

- Fotos externas do Unsplash/flagcdn se nunca foram carregadas antes
- Cotação do dia depende de internet
- Arquivos grandes ainda serão melhor tratados na etapa IndexedDB

## Próxima etapa

Migrar armazenamento local de localStorage para IndexedDB.
