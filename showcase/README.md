# Vitrine de projetos · Murilo Lucania

![Captura real do frontend da vitrine pública](../assets/showcase-desktop.jpg)

[Ver os seis projetos](../assets/showcase-projects.jpg) · [Captura em celular](../assets/showcase-mobile.jpg)

Frontend público independente em **HTML5, CSS e JavaScript**, com seis projetos distintos: MaxiSystem (móveis), FacilitaSystem e DecorSystem (estofados), MRL Auth, Logos e Bella IA.

A apresentação usa direção visual escura, luzes violeta e verde, tipografia de sistema e capas editoriais próprias. Não utiliza telas de um sistema para representar outro. Não contém dados reais, autenticação, formulários de coleta ou chamadas a serviços externos.

## Executar localmente

Requer Node.js 22 ou posterior, sem dependências de execução:

```sh
node showcase/server.mjs
```

Abra **http://127.0.0.1:4181**. O servidor é restrito à máquina local. O GitHub apresenta o código e as capturas; esta pasta não implica hospedagem pública ativa.

## Navegação

- Filtros por indústria, telecom e atendimento.
- Detalhes de cada projeto em janela acessível, com fechamento por Escape e restauração de foco.
- Links para os estudos de caso, perfil em inglês, LinkedIn e contato profissional.
- Layout adaptado a computador, tablet e celular.
- Movimento reduzido respeitado quando solicitado pelo sistema.
- Sem fontes remotas, cookies, telemetria, banco ou persistência no navegador.

## Verificação

```sh
cd lab
npm ci --ignore-scripts
npx playwright install chromium
npm test
npm run audit:public
npm run test:showcase
```

As capas são ilustrações editoriais, não interfaces dos sistemas comerciais. O laboratório educativo é outro projeto e permanece separado da vitrine.

---

## English

An independent public portfolio frontend built with HTML5, CSS and JavaScript. Six distinct projects are presented with separate editorial covers, business contexts and case studies. MaxiSystem serves furniture manufacturing; FacilitaSystem and DecorSystem serve upholstery businesses.

Run `node showcase/server.mjs` and open the loopback address. This source directory does not imply an active public web deployment. The frontend has no remote fonts, tracking, data collection, authentication or production integrations. Responsive layouts, category filters, accessible dialogs, focus restoration and reduced motion are tested.
