# Design UI - Guiamos

> Direção visual oficial para telas, componentes e textos de interface do Guiamos.

## Posicionamento

O Guiamos deve parecer um produto operacional premium: claro, confiável, rápido e feito para vendedores de marketplace que querem ganhar tempo sem perder controle.

Evitar visual de landing page genérica, excesso de decoração e textos explicativos longos dentro da interface. A tela deve ajudar o usuário a agir.

## Princípios

1. **Clareza antes de charme**: cada tela precisa responder rapidamente: onde estou, o que já foi feito e qual é o próximo passo.
2. **Densidade útil**: mostrar informações importantes sem poluir. Preferir metadados curtos, badges e status.
3. **Ação evidente**: o botão principal deve ser óbvio. Ações secundárias ficam visíveis, mas menos fortes.
4. **Confiança operacional**: status como "planilha pronta", "atualizado em", "produtos prontos" e "regime" ajudam o usuário a confiar no fluxo.
5. **Consistência entre agentes**: Codex e Claude Code devem seguir esta direção antes de criar novos componentes visuais.

## Linguagem visual

- Fundo claro com profundidade suave: `#f5f8fc`, `#f8fafc`, branco translúcido e bordas `#dfe7f1`.
- Azul Guiamos como acento principal: `#1a73e8` / `#155bd5`.
- Verde apenas para sucesso/confirmação: `#0f9f75`.
- Vermelho apenas para erro/exclusão: `#c5221f` / `#ea4335`.
- Cards com sombra leve, borda visível e espaçamento generoso.
- Ícones lucide em botões, badges e estados sempre que ajudarem o usuário a escanear a tela.

## Textos de interface

- Escrever em português natural, direto e com tom de assistente competente.
- Trocar labels genéricas por labels de ação:
  - "Baixar planilha" pode virar "Baixar planilha pronta".
  - "Adicionar produtos" pode virar "Adicionar mais produtos".
  - "Publicar em novo canal" pode virar "Publicar em outro canal".
- Separar metadados em informações curtas:
  - canal
  - quantidade de produtos
  - regime tributário
  - data de atualização
  - status do arquivo

## Padrão para cards de catálogo

Cada catálogo deve mostrar:

- Nome limpo do cadastro, sem repetir data no título quando ela já aparece como metadado.
- Badge do canal, incluindo `ml` e `mercado_livre` como Mercado Livre.
- Quantidade de produtos em linguagem clara: "3 produtos prontos".
- Regime tributário.
- Atualização com data e hora.
- Status do arquivo: pronto para upload ou indisponível.
- Ações nesta hierarquia:
  1. Baixar planilha pronta
  2. Adicionar mais produtos
  3. Publicar em outro canal
  4. Excluir catálogo

## Antes de mexer em UI

1. Ler este arquivo.
2. Verificar a tela existente para manter consistência.
3. Preservar o fluxo principal no chat (`/`) como experiência central.
4. Rodar `npm.cmd exec tsc -- --noEmit` antes de finalizar.
