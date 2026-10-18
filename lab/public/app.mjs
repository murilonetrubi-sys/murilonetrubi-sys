import {
  createInventory,
  reserveInventory,
  createConversation,
  transitionConversation,
  accessDecision,
} from "/engine.mjs";

let inventory = createInventory();
let context = createConversation("service");
let review = createConversation("aftersales");
let view = "inventory";
let lastRequest;
let lastResult;
let sequence = 0;
let accessRole = "observer";
let accessResult;
const workspace = document.querySelector("#workspace");
const labels = {
  "unit-a": "Unidade Aurora",
  "unit-b": "Unidade Horizonte",
  "order-a": "Pedido Aurora",
  "order-b": "Pedido Horizonte",
};
const stages = {
  awaiting_choice: "Aguardando seleção",
  in_context: "Contexto preservado",
  human_review: "Revisão humana",
};
const actionLabels = {
  choose: "Referência selecionada",
  acknowledge: "Retorno recebido",
  damage: "Ocorrência de pós-venda",
};
const reasons = {
  stock_reserved: "Reserva confirmada",
  insufficient_stock: "Quantidade indisponível",
  invalid_request: "Informe um número inteiro entre 1 e 100",
  idempotency_conflict: "Chave já utilizada com outra quantidade",
};

function audit(events, type = "stock") {
  if (!events.length)
    return '<p class="empty">Cada ação gera um registro. Experimente uma operação para acompanhar a decisão.</p>';
  return `<ol class="audit">${events
    .slice(-4)
    .reverse()
    .map(
      (event) =>
        `<li>${type === "stock" ? reasons[event.reason] : actionLabels[event.type] || "Solicitação sem evidência"}<small>Evento ${String(event.sequence).padStart(2, "0")} · ${type === "stock" ? `${event.quantity} unidades · ${event.status === "accepted" ? "aceito" : "retido"}` : stages[event.stage]}</small></li>`,
    )
    .join("")}</ol>`;
}

function renderInventory() {
  workspace.innerHTML = `<div class="section-head"><div><p class="eyebrow">01 / ESTOQUE CONFIÁVEL</p><h2>Uma reserva. Um efeito.</h2><p class="description">Uma operação repetida deve manter o mesmo resultado. Quantidades indisponíveis são retidas antes de alterar o saldo.</p></div><span class="pill">SEM EFEITO EXTERNO</span></div>
  <div class="metrics"><div class="metric"><span>Estoque inicial</span><strong>24</strong><small>unidades</small></div><div class="metric accent"><span>Disponível agora</span><strong id="available">${inventory.available}</strong><small>unidades</small></div><div class="metric"><span>Reservado</span><strong id="reserved">${inventory.reserved}</strong><small>unidades</small></div></div>
  <div class="two-col"><section class="panel"><p class="panel-title">Simular reserva</p><div class="sku">ITEM FICTÍCIO / DEMO-A</div><div class="product-name">Kit Aurora</div><form id="reserve-form"><label for="quantity">Quantidade desejada</label><input id="quantity" type="number" min="1" max="100" step="1" value="6" required><div class="actions"><button class="button" type="submit">Reservar unidades</button><button class="button secondary" type="button" id="replay" ${!lastRequest ? "disabled" : ""}>Repetir mesma operação</button></div></form>${lastResult ? `<div role="status" class="receipt ${lastResult.status !== "accepted" ? "warning" : ""}">${lastResult.replayed ? "Repetição reconhecida: o saldo não foi alterado novamente." : reasons[lastResult.reason]}</div>` : ""}<p class="note">A repetição reutiliza a mesma chave. Uma nova reserva gera uma chave diferente.</p></section><section class="panel"><p class="panel-title">Rastro das decisões</p>${audit(inventory.events)}<p class="note">${inventory.events.length} operação(ões) registrada(s). Estado mantido apenas na memória do navegador.</p></section></div>`;
  document
    .querySelector("#reserve-form")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      lastRequest = {
        key: `demo-${++sequence}`,
        quantity: Number(document.querySelector("#quantity").value),
      };
      lastResult = reserveInventory(inventory, lastRequest);
      inventory = lastResult.state;
      render();
    });
  document.querySelector("#replay").addEventListener("click", () => {
    lastResult = reserveInventory(inventory, lastRequest);
    inventory = lastResult.state;
    render();
  });
}

function renderConversation(isReview) {
  const state = isReview ? review : context;
  workspace.innerHTML = `<div class="section-head"><div><p class="eyebrow">${isReview ? "03 / PÓS-VENDA RESPONSÁVEL" : "02 / ATENDIMENTO COM CONTEXTO"}</p><h2>${isReview ? "A ocorrência continua no contexto." : "Selecionar para continuar."}</h2><p class="description">${isReview ? "Um agradecimento não encerra uma ocorrência que ainda precisa de revisão humana." : "Uma referência clara permite retomar a solicitação original sem confundir unidades diferentes."}</p></div><span class="pill">SIMULAÇÃO DETERMINÍSTICA</span></div>
  <div class="two-col"><section class="panel"><p class="panel-title">Conversa de demonstração</p><div class="chat" role="status"><span class="avatar">ML</span><p><small>ASSISTENTE DEMONSTRATIVO</small>${state.message}</p></div><div class="actions">${state.choices.map((choice) => `<button class="button secondary" data-choice="${choice}">${labels[choice]}</button>`).join("")}</div><div class="actions">${isReview ? '<button class="button warn" data-action="damage">Simular relato de avaria</button>' : ""}<button class="button" data-action="acknowledge">Responder “obrigado”</button></div><p class="scene-label">${isReview ? "Nenhuma troca, devolução ou mensagem é executada. A revisão existe apenas como estado demonstrativo." : "As unidades são fictícias. Esta demonstração não consulta conexões, clientes ou cadastros reais."}</p></section><section class="panel"><p class="panel-title">Estado estruturado</p><dl class="state-list"><div><dt>Referência</dt><dd>${labels[state.selected] || "Não selecionada"}</dd></div><div><dt>Etapa</dt><dd>${stages[state.stage]}</dd></div><div><dt>Revisão humana</dt><dd>${state.needsHuman ? "Pendente na simulação" : "Não solicitada"}</dd></div></dl><p class="panel-title audit-title">Histórico de transições</p>${audit(state.events, "conversation")}</section></div>`;
  workspace
    .querySelectorAll("[data-choice]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        updateConversation(
          { type: "choose", choice: button.dataset.choice },
          isReview,
        ),
      ),
    );
  workspace
    .querySelectorAll("[data-action]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        updateConversation({ type: button.dataset.action }, isReview),
      ),
    );
}

function updateConversation(action, isReview) {
  if (isReview) review = transitionConversation(review, action);
  else context = transitionConversation(context, action);
  render();
}

function renderAccess() {
  const allowed = accessDecision(accessRole, "review_case").allowed;
  workspace.innerHTML = `<div class="section-head"><div><p class="eyebrow">04 / GESTÃO E PERMISSÕES</p><h2>Permissão antes da ação.</h2><p class="description">Matriz conceitual de acesso: consultar um painel e revisar uma ocorrência são permissões diferentes.</p></div><span class="pill">MODELO EDUCATIVO</span></div><div class="two-col"><section class="panel"><p class="panel-title">Escolha um papel fictício</p><div class="actions"><button class="button ${accessRole === "observer" ? "" : "secondary"}" data-role="observer">Observador</button><button class="button ${accessRole === "manager" ? "" : "secondary"}" data-role="manager">Gestor</button></div><p class="scene-label">O papel é uma entrada da simulação. Não é um login ou mecanismo de autenticação.</p><div class="actions"><button class="button secondary" data-access="view_dashboard">Consultar painel fictício</button><button class="button" data-access="review_case">Simular revisão de ocorrência</button></div>${accessResult ? `<div role="status" class="receipt ${accessResult.allowed ? "" : "warning"}">${accessResult.allowed ? "Permissão explícita encontrada. Nenhum efeito externo foi executado." : "Permissão não concedida para esse papel. A ação foi retida na simulação."}</div>` : ""}</section><section class="panel"><p class="panel-title">Matriz de decisão</p><dl class="state-list"><div><dt>Papel atual</dt><dd>${accessRole === "manager" ? "Gestor" : "Observador"}</dd></div><div><dt>Consultar painel</dt><dd>Permitido na simulação</dd></div><div><dt>Revisar ocorrência</dt><dd>${allowed ? "Permitido na simulação" : "Não permitido"}</dd></div></dl><p class="scene-label">Em uma aplicação real, a autorização deve ser aplicada no servidor, em cada operação. Este exemplo de interface não protege dados ou serviços.</p></section></div>`;
  workspace.querySelectorAll("[data-role]").forEach((button) =>
    button.addEventListener("click", () => {
      accessRole = button.dataset.role;
      accessResult = undefined;
      render();
    }),
  );
  workspace.querySelectorAll("[data-access]").forEach((button) =>
    button.addEventListener("click", () => {
      accessResult = accessDecision(accessRole, button.dataset.access);
      render();
    }),
  );
}

function render() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    const selected = button.dataset.view === view;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  if (view === "inventory") renderInventory();
  else if (view === "access") renderAccess();
  else renderConversation(view === "review");
}

document.querySelectorAll("[data-view]").forEach((button) =>
  button.addEventListener("click", () => {
    view = button.dataset.view;
    render();
  }),
);
render();
