# Operational Flow Lab

**Projeto demonstrativo público de Murilo Lucania. Português primeiro · [English](#english).**

![Visão geral do laboratório com dados sintéticos](../assets/lab-overview.jpg)

Um laboratório pequeno e executável para avaliar quatro decisões de engenharia:

1. **Estoque:** reservar com saldo consistente e reconhecer operações repetidas.
2. **Contexto:** selecionar uma referência e continuar o atendimento sem adivinhar.
3. **Pós-venda:** preservar uma ocorrência que depende de revisão humana.
4. **Permissões:** distinguir consulta de revisão por uma matriz explícita.

Implementação educativa escrita para este portfólio. Não contém fontes dos produtos comerciais, dados reais, conexão com sistemas de produção ou dependência de IA generativa. A matriz de permissões é um modelo em memória; não implementa autenticação ou segurança de uma aplicação real.

## Executar

Requer Node.js 22 ou posterior. O servidor e o núcleo não possuem dependências de execução.

```sh
cd lab
npm start
```

Abra **http://127.0.0.1:4173**. O servidor aceita somente conexões locais e só entrega os quatro recursos da aplicação e seu ícone. O estado desaparece ao recarregar; não há cadastro, login, banco, telemetria ou envio de mensagens.

## Verificar

```sh
npm test
npm run audit:public
```

Os testes cobrem operações repetidas, conflito de chave, saldo insuficiente, entradas inválidas, conservação do estoque, contexto, revisão pendente, permissões e limites do servidor.

Para os testes de interface e a reprodução das capturas:

```sh
npm ci --ignore-scripts
npx playwright install chromium
npm run test:ui
npm run capture
```

Em Linux, se faltarem bibliotecas do navegador, use o procedimento de dependências do Playwright: `npx playwright install --with-deps chromium`.

[Vídeo curto da demonstração, em WebM](../assets/lab-walkthrough.webm) · [Captura em celular](../assets/lab-mobile.jpg) · [Estudos de caso](../portfolio/README.md)

## Organização

```text
src/engine.mjs       funções puras, sem I/O
public/             interface sem bibliotecas ou recursos remotos
server.mjs          servidor local com lista explícita de recursos
test/               testes nativos do Node.js
tools/              teste de navegador, captura e auditoria pública
```

O código foi separado por responsabilidade, sem incluir uma camada de banco ou serviço que a demonstração não utiliza. As capturas são geradas pelo próprio roteiro de teste. O workflow público executa testes, navegador e auditoria em cada alteração aplicável.

## Escopo e limites

- Quantidades, nomes e ações são fictícios. As telas não são capturas dos produtos comerciais.
- Idempotência e rastreabilidade vivem na memória desta demonstração. Reinícios, concorrência distribuída, persistência e autorização no servidor exigem implementação adicional em sistemas reais.
- O simulador usa ações predefinidas. Não é um modelo de linguagem nem uma reprodução integral da Logos ou da Bella IA.
- Os testes demonstram os casos que executam; não certificam os sistemas privados nem comprovam métricas de produtividade comercial.
- A auditoria automática procura padrões conhecidos. Ela complementa a revisão humana e não garante ausência de todo dado sensível possível.

---

## English

An independent, public educational implementation by **Murilo Lucania**, using entirely synthetic data. It demonstrates inventory reservations, idempotency, conversational context, persistent human-review state within a session, and explicit role permissions.

Run with Node.js 22+: `cd lab && npm start`. Open the loopback address printed by the server. Run `npm test` and `npm run audit:public`; install the pinned Playwright development dependency with `npm ci --ignore-scripts`, then install Chromium and run `npm run test:ui` or `npm run capture`.

There are no runtime dependencies, external integrations, production connections, generative models, browser persistence, or outbound messages. Screenshots and the short video show this educational application, not the proprietary products. The role model is not a real authentication system; production-grade concurrency, persistence, authentication and authorization are outside this sample's scope.

The public CI validates the sample only. Private-product outcomes, performance gains, and operational readiness are not inferred from these tests.
