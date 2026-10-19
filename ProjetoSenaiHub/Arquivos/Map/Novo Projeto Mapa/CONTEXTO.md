# Novo Projeto Mapa — contexto completo para continuar em outro PC

> **Para o agente que abrir este arquivo num chat novo:** leia tudo antes de mexer em qualquer coisa.
> Aqui está o que já foi feito (SENAI, 19/10/2026), como os dados se encaixam e qual é o próximo passo:
> **gerar no Blender os modelos 3D do campus com as salas separadas e texturizadas**, validar com renders
> e só depois substituir os GLB que o site usa.

---

## 1. Objetivo

O site SENAI HUB mostra o campus em 3D (Three.js). Os modelos atuais (`BlocoA..D.glb`) foram feitos no
Sweet Home 3D: têm paredes, mas **não separam as salas** (sem nome, tipo nem piso por sala) e não têm
o entorno (estacionamentos, rampa, grades).

A meta é produzir, **no Blender rodando por script (headless, Python)**, um modelo por bloco com:

- paredes extrudadas a partir das plantas limpas;
- piso de cada sala como objeto próprio, com nome e material/textura pelo **tipo** da sala;
- pavimentos na altura certa;
- corredores que ligam o Bloco C ao D **sem parede** no meio;
- elementos externos do campus (estacionamentos E1/E2, pátio, rampa, escada externa, grades, portão);
- exportação em GLB compatível com o viewer atual.

**Regra:** não substituir nada em `Senai HUB/frontend/public/models/campus/` sem validar com renders
lado a lado com `saida/Montagem-implantacao.png` e mostrar para o usuário antes.

---

## 2. Onde está cada coisa (repositório `Hall065/Projeto_4DEV`, branch `main`)

```
ProjetoSenaiHub/
├── Arquivos/Map/                       ← material original (NÃO apagar)
│   ├── PNG/1.png … 7.png               ← plantas limpas: ENTRADA do pipeline
│   ├── Scan/Pagina 1-7                 ← mapas de risco/incêndio com nomes das salas (fonte dos nomes)
│   ├── JPG/, OBJ/, GLB/Bloco X/        ← exportações antigas
│   ├── Sh3D/*.sh3d                     ← projetos Sweet Home 3D originais
│   ├── Blender/CampusSenai.blend       ← .blend antigo (montagem dos GLB do Sh3D)
│   ├── MAPA_3D_NOTAS_IMPLEMENTACAO.md  ← spec antiga do viewer (navegação por bloco)
│   └── Novo Projeto Mapa/              ← ESTE PROJETO
│       ├── CONTEXTO.md                 ← este arquivo
│       ├── README.md
│       ├── scripts/                    ← pipeline (Node + PowerShell, zero dependências npm)
│       │   ├── rodar-pipeline.ps1      ← roda tudo
│       │   ├── png-rooms.mjs           ← 1. segmenta salas nas plantas PNG
│       │   ├── render-interpretado.mjs ← 2. aplica nomes/tipos → fill/ids/labels
│       │   ├── compose-interpretado.ps1← 3. plantas finais com legenda
│       │   ├── montagem-align.mjs      ← 4. encaixa cada planta nas paredes do GLB
│       │   ├── compose-montagem.ps1    ← 5. montagem do campus + implantação
│       │   └── ferramentas/            ← glb-inspect, glb-render, sh3d-summary (diagnóstico)
│       ├── config/salas-config.json    ← TODAS as decisões manuais (nomes, tipos, junções, implantação)
│       ├── dados/                      ← saídas intermediárias versionadas (entrada do Blender)
│       │   ├── montagem.json           ← transformação planta → mundo (metros) de cada página
│       │   ├── juncao-1.png, juncao-2.png
│       │   ├── salas.csv               ← lista de salas com área (m²)
│       │   └── render/fill-N.png, ids-N.png, labels-N.json, salas.csv
│       ├── saida/                      ← imagens finais validadas pelo usuário
│       └── referencias/                ← desenhos/feedback do usuário (ver §6)
└── Senai HUB/frontend/
    ├── public/models/campus/BlocoA.glb … BlocoD.glb   ← modelos que o site carrega HOJE
    ├── src/constants/campusBlocks.ts                   ← lista dos blocos/arquivos
    ├── src/utils/campusMap3DCache.ts                   ← cache dos GLB
    └── src/components/map/CampusMap3DViewer.tsx        ← viewer Three.js (OrbitControls)
```

`work/` (≈30 MB de binários intermediários) está no `.gitignore` e é recriado pelo pipeline.

---

## 3. Como rodar

Requisitos: **Windows PowerShell 5+** (usa System.Drawing), **Node 18+**. Para a próxima etapa: **Blender**
(no SENAI foi usado o 5.2.2 portátil; em casa, usar a versão instalada e rodar com
`blender -b -P script.py -- args`).

```powershell
cd <repo>\ProjetoSenaiHub
powershell -ExecutionPolicy Bypass -File "Arquivos\Map\Novo Projeto Mapa\scripts\rodar-pipeline.ps1"
# opcional: pasta de GLB diferente
powershell -ExecutionPolicy Bypass -File "Arquivos\Map\Novo Projeto Mapa\scripts\rodar-pipeline.ps1" "C:\outra\pasta\glb"
```

Leva ~25 s. Lê `Arquivos/Map/PNG` e `Senai HUB/frontend/public/models/campus`, regrava `dados/` e `saida/`.
Saída esperada no console (sinal de que está tudo certo):

```
1 BlocoA-terreo: giro 90° … erro 0.471 m encaixe 70.1%
2 BlocoA-superior: … erro 1.115 m encaixe 34.9%      ← baixo de propósito (ver §5, escala do A superior)
6 BlocoD-terreo: giro 270° … ; Bloco D girado 180° … escada p6#35 → p4#1 a 0.26 m
Bloco D deslocado -0.49 m para alinhar os corredores das junções
```

Os `.ps1` precisam estar em **UTF-8 com BOM** (acentos); o `rodar-pipeline.ps1` regrava o BOM sozinho.
Se editar `salas-config.json`, rode o pipeline de novo e confira as imagens em `saida/`.

---

## 4. As 7 páginas (plantas)

| pág | arquivo | bloco / nível | px/m | piso (m) | salas |
|---|---|---|---|---|---|
| 1 | BlocoA-terreo | A térreo (nível 0) | 20.97 | 0.00 | 30 |
| 2 | BlocoA-superior | A superior (nível 2) | 21.98 | 5.12 | 22 |
| 3 | BlocoB-unico | B único (nível 0) | 32.69 | 2.50 | 18 |
| 4 | BlocoC-inferior | C inferior (nível 0) | 21.25 | 2.50 | 19 |
| 5 | BlocoC-superior | C superior (nível 2) | 24.84 | 7.62 | 22 |
| 6 | BlocoD-terreo | D térreo (nível 0) | 20.38 | 2.50 | 37 |
| 7 | BlocoD-superior | D superior (nível 2) | 21.40 | 7.62 | 18 |

- Níveis do Sweet Home 3D: 0 = térreo, 1 = só o teto do pé-direito duplo (sem planta), 2 = superior.
- No GLB, cada nível = 25,6 unidades = **2,56 m**; o superior fica 5,12 m acima da base do bloco.
- O Bloco A está **2,5 m abaixo** dos outros no GLB (base 0 contra 2,5 dos demais). Ainda não se sabe se é
  desnível real do terreno ou erro de modelagem (ver §8).
- Topos dos blocos: A 7,73 m, B 4,99 m, C 10,25 m, D 10,20 m.

---

## 5. Decisões já tomadas (validadas com o usuário)

1. **Nomes e tipos das salas** vêm dos mapas de risco (`Arquivos/Map/Scan`) e estão em
   `config/salas-config.json → paginas.N.salas`. Tipos e cores:
   `aula` (azul), `lab` (verde), `oficina` (laranja), `adm` (roxo), `sanit` (ciano), `apoio` (bege),
   `conv` (amarelo), `escada` (cinza), `externo` (verde-oliva), `circ` (circulação, cinza claro).
2. **Bloco D girado 180°.** O GLB do site traz o D virado: a biblioteca fica do lado do C, e a escada
   compartilhada (rampa do C superior → corredor do D superior) fica de frente para a escada do C, como no
   mapa de risco. Corrigido em `blocos.D.girar180` com pares de escadas (resíduo de 0,26 m) e depois
   deslocado −0,49 m para alinhar os corredores.
3. **Junções C ↔ D sem parede** (`juncoes` no config; imagem `referencias/retorno-juncoes-corredor-C-D.png`):
   - térreo: corredor do C → escada → corredor do D;
   - superior: rampa do C → corredor do D.
   O `montagem.json → juncoes[].retangulo` (metros) diz onde as paredes foram apagadas;
   `juncao-N.png` mostra a área pintada como circulação.
4. **Bloco B:** corredor central, "Atend." e jardim definidos à mão
   (`referencias/retorno-blocoB-corredor-jardim.png`).
5. **Escala do A superior corrigida:** no modelo Sweet Home 3D o superior do A está ~35% maior. A planta foi
   encaixada pela escala do térreo (21,98 px/m); por isso o encaixe com o GLB sai baixo (35%). **O GLB do A
   superior está errado, não a planta.**
6. **Implantação, desenhada à mão pelo usuário, sem planta, precisão de ~0,5 m**
   (`referencias/desenho-implantacao-E1-E2.png`, dados em `config → implantacao`, coordenadas do mundo em metros):
   - **E1**, estacionamento à direita do A: polígono (12.68,−60.16) (26.78,−60.16) (26.78,0.12) (7.38,0.12) (7.38,−23.03) (12.68,−23.03);
   - **E2**, estacionamento **elevado** entre C/D e A: retângulo x 1.3…26.78, z −95.15…−65.48;
   - **circulação externa** amarela ligando tudo;
   - **rampa**, perto do A: x −0.75…6.7, z −59.69…−44.59;
   - **escada externa** de 2–3 degraus subindo para o E2: x 1.3…3.9, z −83.45…−75.46;
   - **grades roxas**: topo do E1 (12.68,−60.16)→(25.85,−60.16) e lateral (12.68,−52.58)→(12.68,−23.03)→(7.38,−23.03);
   - **portão de pedestres** cinza: x 12.68, z −59.89…−52.58;
   - **borda do desnível do E2**, sem grade: (1.3,−65.48)→(26.78,−65.48);
   - **porta do D para o E2**: seta de (8.69,−97.6) para (8.69,−92.0).

---

## 6. Formatos de dados (o que o Blender vai ler)

### Sistema de coordenadas do mundo
`montagem.json`: `unidade = metros`; **x = X do GLB × 0,1**, **z = Z do GLB × 0,1** (vista de cima, z cresce
para baixo na imagem). Altura = Y do GLB × 0,1. Os GLB do site estão em **decímetros**.

No Blender (Z para cima), a convenção natural é `Blender (x, y, z) = (x_mundo, −z_mundo, altura)`. O importador
glTF já faz Y-up → Z-up; confira importando um `BlocoX.glb` original e sobrepondo.

### Pixel da planta → mundo
Para a página N, com `pg = montagem.paginas[N]` e (X, Y) em pixels de **`dados/render/fill-N.png`**
(a mesma grade de `ids-N.png` e dos `x, y` em `labels-N.json`):

```
u = X / pg.img.pxPorMetro ;  v = Y / pg.img.pxPorMetro
x = pg.s * (pg.M[0]*u + pg.M[1]*v) + pg.t[0]
z = pg.s * (pg.M[2]*u + pg.M[3]*v) + pg.t[1]
altura do piso = pg.pisoAltura_m
```

`pg.cantos.ul/ur/ll` = mundo dos cantos (0,0), (w,0), (0,h): use para conferir.
A rotação de 180° e o deslocamento do D **já estão embutidos** em M/t das páginas 6 e 7.

### `ids-N.png` (gerado para o Blender)
Canal R de cada pixel:

| código | significado |
|---|---|
| 0 | fora da planta |
| 1 | parede |
| 2 | circulação |
| 10 + k | região k |

O nome e o tipo de cada código estão em `labels-N.json → regioes: [{codigo, nome, tipo}]`.
Várias regiões podem ter o mesmo nome (salas divididas em partes).

### `fill-N.png`
Visual: paredes (30,38,51), divisas entre salas (96,108,124), sala = cor do tipo, fora = branco.

### `labels-N.json`
`{page, titulo, arquivo, w, h, salas:[{nome,tipo,x,y,boxW,boxH,area,num}], regioes:[…]}`.
`x, y` = ponto do rótulo (o mais interno da sala), `area` em m², `num` = número na legenda.

### `salas-config.json`
- `tipos`: `{tipo: [rótulo, corFundo, corBorda]}`
- `blocos.D`: rotação
- `juncoes`
- `implantacao`: `areas[{nome,tipo,poly}]`, `linhas[{tipo: grade|portao|desnivel, pts}]`, `escadas`, `portas`
- `paginas.N`:
  - `salas` `{ "num[,num]": [nome, tipo] }` (regiões do `seg-N.bin`);
  - `splits`, `manuais` (`rect`/`poly`), `aberturas`, `encaixe`.
- Os `rect`/`poly` das páginas estão na imagem `seg-N-leitura.png` reduzida a 1024 px de largura, **não em metros**.

---

## 7. Próximo passo: Blender (plano sugerido)

1. **Extrair geometria** (Node ou Python): para cada página, ler `ids-N.png` e vetorizar.
   - Contornos de cada região (marching squares + simplificação de ~0,05 m).
   - Máscara de parede (código 1) → polígonos.
   - Converter tudo para metros com a fórmula da §6.
   - Gravar `dados/salas-geo.json`: `{pagina, bloco, nivel, piso_m, salas:[{codigo,nome,tipo,poly}], paredes:[poly]}`.
   - Aplicar as junções: dentro de `juncoes[].retangulo`, parede vira circulação.
2. **Script Blender** (`scripts/blender/gerar-campus.py`, rodando com `blender -b -P`):
   - paredes: extrudar os polígonos de parede de `piso_m` até `piso_m + pé-direito`
     (≈2,56 m por nível; térreo do A e do C com pé-direito duplo onde não houver superior);
   - pisos: um objeto por sala, com nome `"<Bloco> <nível> — <nome>"`, material pelo `tipo` (cores da §5,
     depois texturas: piso cerâmico nas salas, cimento nas oficinas, azulejo nos sanitários etc.) e custom
     property `tipo`/`area` (sai no glTF como `extras`);
   - implantação: E1/E2 (E2 elevado; altura a confirmar), rampa inclinada, escada de 3 degraus, grades como
     cercas finas, portão;
   - opcional: importar os GLB originais em coleção oculta só para conferência;
   - **exportar** um GLB por bloco (`BlocoA.glb` … mesmo nome, mesma escala e origem dos atuais, ou seja
     voltar para decímetros e Y-up) + um `Campus.glb` com tudo.
3. **Validar**:
   - render de cima em ortográfico, comparado com `saida/Montagem-implantacao.png`;
   - render em perspectiva de cada bloco;
   - abrir no viewer do site (`npm run dev` em `Senai HUB/frontend`, página do mapa).
   Salvar os renders em `saida/blender/` e mostrar ao usuário.
4. Só depois de aprovado: trocar os GLB em `frontend/public/models/campus/` (e ajustar `campusBlocks.ts` se
   houver novos arquivos). Tamanho alvo por bloco ≤ ~1,5 MB (os atuais têm 0,2–1,4 MB).

---

## 8. Dúvidas em aberto (perguntar ao usuário)

- O Bloco A é mesmo 2,5 m mais baixo que os outros (desnível do terreno) ou é erro do modelo?
- Altura real do E2 em relação à rua e aos blocos; inclinação/comprimento da rampa; altura das grades.
- Borda direita de E1/E2 (x = 26,78) em relação à quina do D, e se a grade do topo do E1 vai até a quina.
- Alguns nomes de salas vieram de leitura incerta do scan (conferir `dados/salas.csv` com o usuário).
- Corrigir o A superior no Sweet Home 3D ou só gerar o novo modelo pelas plantas (recomendado: plantas)?

---

## 9. Histórico

**19/10/2026, SENAI (máquina ECFP505D1249348):** plantas interpretadas das 7 páginas, montagem do campus
sobre os GLB, rotação do D, junções C↔D, corredor/jardim do B, implantação (E1, E2, rampa, grades, portão,
escada), organização nesta pasta e mapa `ids-N.png` para a etapa do Blender.

Registro detalhado no Obsidian do usuário: vault Hall (nota `Referências/Modelos 3D Campus SENAI HUB`).
