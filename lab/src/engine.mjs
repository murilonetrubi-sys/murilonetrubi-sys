// Original educational implementation. No production code or external services.
export function createInventory() {
  return { available: 24, reserved: 0, version: 0, receipts: [], events: [] };
}

export function reserveInventory(state, request) {
  const { key, quantity } = request;
  if (
    typeof key !== "string" ||
    !/^[a-z0-9-]{1,48}$/i.test(key) ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > 100
  ) {
    return {
      state,
      status: "rejected",
      reason: "invalid_request",
      replayed: false,
    };
  }
  const previous = state.receipts.find((receipt) => receipt.key === key);
  if (previous) {
    return previous.quantity === quantity
      ? {
          state,
          status: previous.status,
          reason: previous.reason,
          replayed: true,
        }
      : {
          state,
          status: "rejected",
          reason: "idempotency_conflict",
          replayed: false,
        };
  }
  const accepted = quantity <= state.available;
  const status = accepted ? "accepted" : "rejected";
  const reason = accepted ? "stock_reserved" : "insufficient_stock";
  const next = structuredClone(state);
  if (accepted) {
    next.available -= quantity;
    next.reserved += quantity;
  }
  next.version += 1;
  next.receipts.push({ key, quantity, status, reason });
  next.events.push({
    sequence: next.version,
    operation: "reservation",
    quantity,
    status,
    reason,
  });
  return { state: next, status, reason, replayed: false };
}

export function createConversation(mode = "service") {
  if (!["service", "aftersales"].includes(mode))
    throw new TypeError("Invalid demo mode");
  return {
    mode,
    stage: "awaiting_choice",
    selected: null,
    needsHuman: false,
    choices: mode === "service" ? ["unit-a", "unit-b"] : ["order-a", "order-b"],
    events: [],
    message:
      mode === "service"
        ? "Para continuar a solicitação, selecione a unidade fictícia."
        : "Escolha um pedido fictício para consultar seu estado.",
  };
}

export function transitionConversation(state, action) {
  const next = structuredClone(state);
  if (action.type === "choose") {
    if (state.needsHuman && action.choice !== state.selected) {
      next.message =
        "A ocorrência do pedido selecionado continua pendente. Ela não será transferida para outro pedido.";
    } else if (!state.choices.includes(action.choice)) {
      next.message = "Essa opção não está disponível nesta demonstração.";
    } else {
      next.selected = action.choice;
      next.stage = state.needsHuman ? "human_review" : "in_context";
      next.message =
        state.mode === "service"
          ? "Unidade selecionada. A solicitação original continua no mesmo atendimento."
          : "O pedido fictício está em preparação. Não há previsão de entrega confirmada nesta demonstração.";
    }
  } else if (action.type === "damage" && state.mode === "aftersales") {
    if (!state.selected) {
      next.message =
        "Selecione primeiro o pedido fictício relacionado à ocorrência.";
    } else {
      next.needsHuman = true;
      next.stage = "human_review";
      next.message =
        "Ocorrência registrada na simulação para revisão humana. Nenhum reembolso ou envio foi realizado.";
    }
  } else if (action.type === "acknowledge") {
    next.message = state.needsHuman
      ? "Obrigado pelo retorno. A ocorrência continua aguardando revisão humana."
      : state.selected
        ? "Entendido. O contexto da solicitação foi preservado."
        : "Para seguir com segurança, ainda preciso da opção fictícia relacionada ao atendimento.";
  } else {
    next.message =
      "Não há informação validada para essa solicitação. A simulação preservou o contexto.";
  }
  next.events.push({
    sequence: state.events.length + 1,
    type: action.type,
    stage: next.stage,
    selected: next.selected,
    needsHuman: next.needsHuman,
  });
  return next;
}

export function accessDecision(role, action) {
  const permissions = {
    observer: ["view_dashboard"],
    manager: ["view_dashboard", "review_case"],
  };
  const allowed =
    Object.hasOwn(permissions, role) && permissions[role].includes(action);
  return {
    allowed,
    reason: allowed ? "explicit_permission" : "permission_not_granted",
  };
}
