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

## Manutenção do roadmap (docs/PROXIMOS-PASSOS.md)

O arquivo `docs/PROXIMOS-PASSOS.md` é a fonte de verdade do roadmap. Manter sempre alinhado com o estado real do projeto. Atualizar nas seguintes situações:

1. **Ao concluir uma tarefa listada no roadmap:**
   - Mover o item da seção da semana correspondente para a seção "✅ Já concluído (referência rápida)"
   - Resumir em 1 linha o que foi entregue (não copiar a descrição inteira)
   - Fazer essa atualização no MESMO commit da tarefa concluída, ou em commit subsequente isolado tipo `docs: update roadmap after <feature>`

2. **Ao identificar nova tarefa relevante durante o trabalho:**
   - Se for crítica pro lançamento: adicionar na semana apropriada (1, 2, 3 ou 4) — confirmar com o usuário antes
   - Se for melhoria futura: adicionar ao backlog pós-lançamento sem precisar de confirmação
   - Nunca inventar tarefa nova SEM o usuário pedir explicitamente — só registrar ideias que surgiram naturalmente do trabalho

3. **Ao mudar escopo/prioridade de uma tarefa existente:**
   - Editar diretamente o item, não duplicar
   - Se mover entre semanas, justificar em 1 linha o motivo (ex: "movido pra Semana 3 porque depende de checkout funcionando")

4. **Ao encontrar item obsoleto (algo que não faz mais sentido):**
   - Mover pro backlog em vez de apagar, com nota `[descontinuado: motivo]`
   - Só apagar de fato se o usuário confirmar

5. **Não mexer no arquivo sem motivo real.** Atualização de roadmap é consequência de trabalho concluído ou nova decisão de produto, não tarefa autônoma.

## Git

- Trabalhe em mudanças pequenas.
- Faça commits pequenos e descritivos.
- Não misture refactor com bugfix.
- Não commitar `.env.local`, `.claude/settings.local.json`, `.next`, `node_modules`.
- Não empilhar mudanças de áreas diferentes em um único commit. Ex.: chat + landing + formulários = 3 commits separados, nunca 1 commit "polimento geral".
- Cada push para main é um deploy em produção. Tratar main como ambiente de produção, não como ambiente de teste.

## Validação de UI

- "Validação visual automatizada" (ex.: browser headless do Codex) NÃO substitui validação humana.
- Sempre que uma mudança envolver UI, pausar e aguardar confirmação do usuário antes de fazer push para main.

## Fluxo principal do produto

- A interface principal é o chat em `/`, implementado em `src/app/page.tsx`.
- O fluxo de geração passa por:
  - `/api/chat-principal`
  - `/api/chat-upload`
  - `/api/validar-planilha`
  - `/api/gerar-do-chat`
  - `/api/process-catalog`
- O painel `/painel` ainda existe, mas é fluxo legado/apoio.

## Design e experiência

- Para qualquer mudança visual ou texto de interface, leia `docs/08-design-ui.md`.
- Direção visual: operacional premium, claro, confiável e focado em ação.
- Prefira metadados úteis, badges, status de arquivo e botões com hierarquia clara.
- Use ícones lucide quando eles ajudarem a escanear ações, estados ou navegação.

## Validação

- Sempre rode `npm.cmd exec tsc -- --noEmit` antes de finalizar alterações.
- `npm.cmd run lint` pode falhar por débitos antigos; não corrigir fora do escopo sem pedir.
- `npm.cmd run build` pode falhar localmente por Google Fonts/rede; registrar isso se acontecer.

## Comunicação

- Antes de executar uma tarefa, sugira qual canal é mais adequado para ela: Codex, Claude Code, ou ambos em sequência.
- Se a tarefa parecer mais adequada para Claude Code, avise o usuário antes de implementar e explique brevemente o motivo.
- Se a tarefa puder ser feita melhor em conjunto, proponha a ordem de trabalho entre Codex e Claude Code.
- Ao mexer em mensagens exibidas ao usuário, diferencie textos fixos no código de textos gerados por IA/prompt. Preserve acentuação e português natural em ambos.
- Explique o que mudou, onde mudou e como testar.
- Se fizer deploy, informe commit, branch e domínio verificado.
