import test from "node:test";
import assert from "node:assert/strict";
import {
  createInventory,
  reserveInventory,
  createConversation,
  transitionConversation,
  accessDecision,
} from "../src/engine.mjs";

test("reserva mantém saldo consistente e não modifica a entrada", () => {
  const initial = createInventory();
  const result = reserveInventory(initial, { key: "r-1", quantity: 6 });
  assert.equal(result.status, "accepted");
  assert.deepEqual([result.state.available, result.state.reserved], [18, 6]);
  assert.equal(initial.available, 24);
  assert.equal(initial.events.length, 0);
});

test("repetição da mesma operação não duplica reserva nem registro", () => {
  const request = { key: "r-1", quantity: 6 };
  const first = reserveInventory(createInventory(), request);
  const replay = reserveInventory(first.state, request);
  assert.equal(replay.replayed, true);
  assert.equal(replay.state, first.state);
  assert.equal(replay.state.events.length, 1);
});

test("chave reaproveitada com outra quantidade não altera o saldo", () => {
  const first = reserveInventory(createInventory(), {
    key: "r-1",
    quantity: 6,
  });
  const conflict = reserveInventory(first.state, { key: "r-1", quantity: 2 });
  assert.equal(conflict.reason, "idempotency_conflict");
  assert.equal(conflict.state, first.state);
});

test("quantidade indisponível é retida sem reduzir o saldo", () => {
  const result = reserveInventory(createInventory(), {
    key: "r-2",
    quantity: 25,
  });
  assert.equal(result.reason, "insufficient_stock");
  assert.equal(result.state.available, 24);
  assert.equal(result.state.reserved, 0);
  assert.equal(result.state.events[0].status, "rejected");
});

test("rejeita quantidades inválidas e chaves não aceitas", () => {
  for (const quantity of [0, -1, 1.2, NaN, Infinity, "2", 101]) {
    assert.equal(
      reserveInventory(createInventory(), { key: "r-1", quantity }).reason,
      "invalid_request",
    );
  }
  assert.equal(
    reserveInventory(createInventory(), { key: "../private", quantity: 2 })
      .reason,
    "invalid_request",
  );
});

test("sequência de operações preserva estoque total e nunca produz saldo negativo", () => {
  let state = createInventory();
  for (let index = 1; index <= 60; index++) {
    state = reserveInventory(state, {
      key: `sequence-${index}`,
      quantity: (index % 7) + 1,
    }).state;
    assert.equal(state.available + state.reserved, 24);
    assert.ok(state.available >= 0);
  }
});

test("agradecimento sem seleção não inventa uma referência", () => {
  const state = transitionConversation(createConversation(), {
    type: "acknowledge",
  });
  assert.equal(state.stage, "awaiting_choice");
  assert.equal(state.selected, null);
});

test("seleção válida retoma o contexto; referência desconhecida não escolhe outro item", () => {
  const initial = createConversation();
  const invalid = transitionConversation(initial, {
    type: "choose",
    choice: "not-allowed",
  });
  assert.equal(invalid.selected, null);
  const selected = transitionConversation(initial, {
    type: "choose",
    choice: "unit-b",
  });
  const acknowledged = transitionConversation(selected, {
    type: "acknowledge",
  });
  assert.equal(acknowledged.selected, "unit-b");
  assert.equal(acknowledged.stage, "in_context");
  assert.equal(initial.events.length, 0);
});

test("avaria exige referência; agradecimento preserva a revisão e o pedido", () => {
  const initial = createConversation("aftersales");
  assert.equal(
    transitionConversation(initial, { type: "damage" }).needsHuman,
    false,
  );
  const selected = transitionConversation(initial, {
    type: "choose",
    choice: "order-a",
  });
  const damaged = transitionConversation(selected, { type: "damage" });
  const acknowledged = transitionConversation(damaged, { type: "acknowledge" });
  assert.equal(acknowledged.needsHuman, true);
  assert.equal(acknowledged.stage, "human_review");
  assert.equal(acknowledged.selected, "order-a");
  assert.equal(
    transitionConversation(acknowledged, { type: "choose", choice: "order-b" })
      .selected,
    "order-a",
  );
});

test("solicitação desconhecida preserva a revisão; modo inválido não é aceito", () => {
  const selected = transitionConversation(createConversation("aftersales"), {
    type: "choose",
    choice: "order-a",
  });
  const damaged = transitionConversation(selected, { type: "damage" });
  assert.equal(
    transitionConversation(damaged, { type: "unknown" }).needsHuman,
    true,
  );
  assert.throws(() => createConversation("external"), TypeError);
});

test("permissões explícitas diferenciam consulta e revisão", () => {
  assert.equal(accessDecision("observer", "view_dashboard").allowed, true);
  assert.equal(accessDecision("observer", "review_case").allowed, false);
  assert.equal(accessDecision("manager", "review_case").allowed, true);
  for (const role of ["admin", "constructor", "__proto__", ""])
    assert.equal(accessDecision(role, "review_case").allowed, false);
  assert.equal(accessDecision("manager", "delete_everything").allowed, false);
});
