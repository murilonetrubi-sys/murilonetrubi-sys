import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const cases = [
  ["maxisystem", "MaxiSystem", "indústria de móveis"],
  ["facilitasystem", "FacilitaSystem", "estofados"],
  ["decorsystem", "DecorSystem", "estofados"],
  ["mrl-auth", "MRL Auth", "gestão para provedores"],
  ["logos", "Logos", "Automação de atendimento"],
  ["bella-ia", "Bella IA", "pós-venda"],
];

test("cada sistema apresenta sua própria capa, sem imagem de laboratório", async () => {
  const sources = new Set();
  const backgrounds = new Set();
  const profile = await readFile(new URL("README.md", root), "utf8");
  const index = await readFile(new URL("portfolio/README.md", root), "utf8");
  for (const [slug, name, purpose] of cases) {
    const cover = `assets/${slug}-case.svg`;
    const text = await readFile(new URL(`portfolio/${slug}.md`, root), "utf8");
    const images = [...text.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(
      (m) => m[1],
    );
    assert.deepEqual(images, [`../${cover}`]);
    assert.ok(profile.includes(`](${cover})`));
    assert.ok(index.includes(`](../${cover})`));
    assert.match(text, /Capa editorial/);
    assert.match(text, /Material educativo separado/);
    assert.match(text, /não uma versão pública, uma tela ou uma demonstração/);
    const svg = await readFile(new URL(cover, root), "utf8");
    assert.ok(svg.includes(name));
    assert.ok(svg.toLowerCase().includes(purpose.toLowerCase()));
    assert.match(svg, /NÃO É UMA TELA DO PRODUTO/);
    assert.match(svg, /aria-labelledby="title desc"/);
    assert.doesNotMatch(
      svg,
      /<script|<image|<foreignObject|href=|https:(?!\/\/www\.w3\.org)/,
    );
    sources.add(svg);
    backgrounds.add(svg.match(/rx="24" fill="([^"]+)"/)[1]);
  }
  assert.equal(sources.size, 6);
  assert.equal(backgrounds.size, 6);
  const featured = profile
    .split("## Em destaque")[1]
    .split("### Projeto público independente")[0];
  assert.doesNotMatch(featured, /!\[[^\]]*\]\([^)]*lab-/);
});

test("os seis estudos têm inglês depois do conteúdo em português", async () => {
  for (const [slug] of cases) {
    const text = await readFile(new URL(`portfolio/${slug}.md`, root), "utf8");
    assert.ok(
      text.indexOf("## English") >
        text.indexOf("## Material educativo separado"),
    );
    assert.match(text, /editorial illustration/);
  }
});

test("segmentos de móveis e estofados permanecem distintos no perfil", async () => {
  const profile = await readFile(new URL("README.md", root), "utf8");
  assert.match(profile, /MaxiSystem\*\* \| ERP para a indústria de móveis/);
  assert.match(
    profile,
    /DecorSystem\*\* \| Gestão empresarial para o setor de estofados/,
  );
  assert.match(profile, /FacilitaSystem\*\* \| ERP para o setor de estofados/);
  assert.match(profile, /MaxiSystem\*\* \| ERP for furniture manufacturing/);
  assert.match(
    profile,
    /DecorSystem\*\* \| Business management for the upholstery sector/,
  );
  assert.match(profile, /FacilitaSystem\*\* \| ERP for the upholstery sector/);
});
