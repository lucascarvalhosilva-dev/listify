<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Guiamos - Regras para agentes

## Produto

Este projeto é o Guiamos, SaaS para cadastro automatizado de produtos em marketplaces brasileiros.
O usuário principal é vendedor de marketplace no Brasil. Priorize clareza, confiabilidade e fluxos simples.

## Antes de alterar código

- Leia `docs/README.md`.
- Leia apenas os documentos relevantes para a tarefa.
- Se mexer em Next.js, leia a doc local em `node_modules/next/dist/docs/`, pois este projeto usa Next 16.
- Rode `git status` antes de editar.
- Não reverta mudanças de outro agente sem autorização.

## Git

- Trabalhe em mudanças pequenas.
- Faça commits pequenos e descritivos.
- Não misture refactor com bugfix.
- Não commitar `.env.local`, `.claude/settings.local.json`, `.next`, `node_modules`.

## Fluxo principal do produto

- A interface principal é o chat em `/`, implementado em `src/app/page.tsx`.
- O fluxo de geração passa por:
  - `/api/chat-principal`
  - `/api/chat-upload`
  - `/api/validar-planilha`
  - `/api/gerar-do-chat`
  - `/api/process-catalog`
- O painel `/painel` ainda existe, mas é fluxo legado/apoio.

## Validação

- Sempre rode `npm.cmd exec tsc -- --noEmit` antes de finalizar alterações.
- `npm.cmd run lint` pode falhar por débitos antigos; não corrigir fora do escopo sem pedir.
- `npm.cmd run build` pode falhar localmente por Google Fonts/rede; registrar isso se acontecer.

## Comunicação

- Antes de executar uma tarefa, sugira qual canal é mais adequado para ela: Codex, Claude Code, ou ambos em sequência.
- Se a tarefa parecer mais adequada para Claude Code, avise o usuário antes de implementar e explique brevemente o motivo.
- Se a tarefa puder ser feita melhor em conjunto, proponha a ordem de trabalho entre Codex e Claude Code.
- Explique o que mudou, onde mudou e como testar.
- Se fizer deploy, informe commit, branch e domínio verificado.
