---
tags: [senai, 4termo, 3d, mapa]
---

# Modelos 3D do campus — SENAI HUB

Projeto: [[Projetos/Projeto_4DEV]] · Análise em [[Diário/2026-10-19]]

> [!important] Local oficial desde 19/10/2026 (commit `bcadfb8`)
> Os scripts, a configuração, os dados e as saídas estão no repositório, em
> `ProjetoSenaiHub/Arquivos/Map/Novo Projeto Mapa/` (rodar com `scripts/rodar-pipeline.ps1`).
> O `CONTEXTO.md` dessa pasta tem todas as decisões, os formatos (planta → mundo em metros, `ids-N.png`)
> e o plano para o Blender. As cópias em `assets/campus-3d/` deste vault são históricas, e
> `localArchives/mapa-3d` foi apagado.

## Onde estão
- `Senai HUB/frontend/public/models/campus/BlocoA.glb` … `BlocoD.glb` (cópia idêntica em `Portfolio/public/models/campus/`)
- Lista: `frontend/src/constants/campusBlocks.ts` · Carga/cache: `utils/campusMap3DCache.ts`, `utils/campusMapAssets.ts` · Viewer: `components/map/CampusMap3DViewer.tsx` (Three.js + OrbitControls)
- Entraram no git no commit `cd0ed79`. Nenhum arquivo-fonte (.sh3d/.blend/.obj) encontrado no PC.

## O que tem dentro
- Exportados pelo **Blender 5.1** (glTF Blender I/O). Nomes de material (`wall_1_2`, `ground_1`, `flblonde`, `yellowbrt`, `white`) indicam origem provável **Sweet Home 3D → OBJ → Blender → GLB**.
- Cada bloco = **1 nó / 1 malha única** (tudo "joined"): sem salas, portas ou andares separados. Só dá pra separar por material.
- Sem texturas, sem animação, sem Draco. 1 unidade ≈ 10 cm.

| Bloco | Tris | Tamanho (m, aprox.) | Andares |
|---|---|---|---|
| A | 35.7k | 51 × 86 × 7,7 | 2–3 níveis (0 / 2,5 / 5,1 m) |
| B | 7.7k | 26 × 34 × 2,5 | 1 (térreo, planta trapezoidal) |
| C | 26.9k | 32 × 56 × 7,7 | 3 níveis |
| D | 39.6k | 36 × 67 × 7,7 | 3 níveis |

## Problemas notados
- Bloco A exportado diferente (sem escala 0.1 e sem translação, base em y=0); B/C/D têm escala 0.1 e base em y=25 → **A fica 2,5 m mais baixo** (níveis A: 0 / 2,5 / 5,1 m; C/D: 2,5 / 5,0 / 7,6 m). **Em aberto:** desnível real do terreno ou erro de export?
- O que parecia sobreposição B×A é só a **laje de terreno** (`ground_1`) do A, maior que o prédio; as paredes não colidem.
- Materiais duplicados por bloco (`.001`, `.003`…).

## Plantas vetoriais (base pra refazer)
- `assets/campus-3d/plantas/campus-pavimento-{0,1,2}.svg` — campus inteiro por pavimento, metros, grade 5 m, escala
- `assets/campus-3d/plantas/campus-plantas.json` — segmentos por bloco/andar/camada (parede, porta_janela, madeira, mobiliario)
- `assets/campus-3d/plantas/index.html` — os 3 pavimentos lado a lado (abrir via servidor local)
- Gerado por `assets/campus-3d/glb-plans.mjs`

![[assets/campus-3d/plantas/campus-pavimentos.png]]

## Salas numeradas (detecção automática)
- `assets/campus-3d/glb-rooms.mjs` — corta paredes a 2,35 m (acima das portas), rasteriza 5 cm/px, flood fill do exterior, componentes ≥ 2 m². Uso: `node glb-rooms.mjs <pasta-glb> <pasta-saida>`
- Saída no projeto: `Senai HUB/localArchives/mapa-3d/plantas-numeradas/` — `Bloco{X}-andar{k}.png`, `salas.csv` (id;bloco;andar;numero;area_m2;nome;tipo;observacao), `salas.json`
- **229 salas**: A 33/20/25 · B 18 · C 21/21/22 · D 35/17/17
- Mapas de incêndio do usuário vão em `localArchives/mapa-3d/mapas-incendio/`

## Rumo decidido (2026-10-19)
- Usuário entrega: GLBs atuais anotados (o que é cada sala) + mapas de incêndio. Materiais/design livres, "parecido com o SENAI".
- Gerar modelos novos **no Blender (headless via Python)**: um objeto por sala, andares separados, texturas. Validar com imagens antes de substituir no repo.
- Blender 5.2.2 LTS portátil: `%LOCALAPPDATA%\Programs\Blender\blender-5.2.2-windows-x64\blender.exe` (importa os GLB ok)

## Fontes originais no repo (`ProjetoSenaiHub/Arquivos/Map`)
- Fora do sparse checkout deste PC → cópia extraída em `Senai HUB/localArchives/mapa-3d/repo-map/`
- `Sh3D/` (Sweet Home 3D, origem confirmada), `Blender/CampusSenai.blend` (cena com os 4 blocos alinhados), `OBJ/`, `GLB/`, `PNG/1-7` (plantas limpas), `Scan/Pagina 1-7` (mapas de incêndio CIPA jan/2026, com nomes das salas), `MAPA_3D_NOTAS_IMPLEMENTACAO.md`
- Níveis no `.sh3d` (A, C, D): 0 = térreo (fundo = planta térrea), **1 = sem planta, só estende paredes (pé-direito duplo)**, 2 = superior (elev. 5,24 m). B: nível único.

| Mapa (Scan) | Bloco / pavimento | Planta numerada | Rotação do scan |
|---|---|---|---|
| Página 1 | A térreo | BlocoA-andar0 | 0° |
| Página 2 | A superior | BlocoA-andar2 | 0° |
| Página 3 | B único | BlocoB-andar0 | 0° |
| Página 4 | C inferior | BlocoC-andar0 | 180° |
| Página 5 | C superior | BlocoC-andar2 | 180° |
| Página 6 | D térreo | BlocoD-andar0 | 0° |
| Página 7 | D superior | BlocoD-andar2 | 180° |

Imagens lado a lado: `localArchives/mapa-3d/alinhado/` · gerador: `assets/campus-3d/compose-alinhado.ps1` · resumo .sh3d: `assets/campus-3d/sh3d-summary.mjs`

## Mapa interpretado (2026-10-19)
Plantas finais com salas separadas, nomeadas (lidas dos mapas de incêndio), coloridas por tipo e com área aprox. → `localArchives/mapa-3d/interpretado/Bloco*-*.png` + `salas.csv` (bloco;pavimento;num;nome;tipo;area_m2).

- Base: PNG limpo do repo (= `backgroundImage` dos `.sh3d`, mesma resolução) → escala real pelo `scaleDistance`.
- Orientação de leitura = mapa de risco: páginas 1–3 giram anti-horário, 4–7 horário em relação ao PNG/modelo.
- Config editável (nomes, tipos, splits e retângulos manuais): `interpretado/salas-config.json`.
- Pipeline: `powershell -File assets/campus-3d/run-interpretado.ps1 <localArchives\mapa-3d>` → `png-rooms.mjs` (segmentação) → `render-interpretado.mjs` (cores/rótulos/CSV) → `compose-interpretado.ps1` (layout final navy/vermelho).
- Auxiliares: `seg-bbox.mjs` (caixas das regiões), `crop-rot.ps1` (zoom girado no scan).

| Planta | px/m |
|---|---|
| A térreo | 20,97 |
| A superior | 21,98 (corrigido; o `.sh3d` usa 16,33) |
| B | 32,69 |
| C inferior | 21,25 |
| C superior | 24,84 |
| D térreo | 20,38 |
| D superior | 21,40 |

Leituras incertas: códigos "11C/12C" (C inferior), classes dos Resíduos (D térreo), sala 6 ilegível e "Dep. Prod. Químicos (?)" (D superior), "OPP" (B), GLP do A térreo não segmentado. Splits/retângulos manuais são estimados.

## Montagem do campus (2026-10-19)
Mostra como as plantas interpretadas se encaixam: `interpretado/Montagem-implantacao.png` (vista de cima, térreo × superior) e `interpretado/Montagem-explodida.png` (pilha isométrica por bloco: térreo, "andar 1" fantasma, superior).

- Fonte da posição: os GLB do site (`frontend/public/models/campus`, carregados sem offset no `CampusMap3DViewer`).
- `assets/campus-3d/montagem-align.mjs`: corta as paredes do GLB na altura do piso e encaixa cada `fill-N.png` (8 orientações, escala ±6%, translação) → `work/montagem.json` + `work/overlay-N.png` (vermelho = GLB, azul = planta).
- `assets/campus-3d/compose-montagem.ps1`: gera as 2 imagens. Tudo roda via `run-interpretado.ps1`.
- Encaixe: escala ≈ 1,000 em todos; erro médio 0,3–0,6 m (D superior 1,06 m porque as paredes altas do galpão do térreo aparecem no corte).
- Orientação: páginas 1–5 giram 90°, D (6–7) 270° em relação à leitura.
- **Achado:** o superior do Bloco A no modelo atual está ~35% maior (fundo do `.sh3d` calibrado em 16,33 px/m) e avança ~18 m sobre o Bloco B. Reescalado pelas paredes externas e pela escada do térreo do A → 21,98 px/m: o comprimento fica 64,0 m contra 63,8 m do térreo, e as salas de aula passam a ~72 m². Config: `encaixe.nivelReferencia = 0` na página 2. Corrigir também no Sweet Home 3D antes de refazer o 3D.
- O modelo não tem algumas divisões internas que existem nas plantas (oficinas do D térreo, Área de Caçambas do C).
- **Bloco D girado 180° no GLB** (apontado pelo usuário e confirmado nos mapas de risco): na realidade a biblioteca fica do lado do C, e a escada da ponta da ala de compressores (D térreo) e a do corredor inferior (D superior) são **a mesma escada** que sai do C (no C superior, pela rampa de acesso). Na montagem, `salas-config.json → blocos.D` = `girar180` + pares de escadas (p6#35↔p4#1, p7#18↔p5#1); o script gira o D inteiro em torno do ponto que alinha as escadas (resíduo 0,26 m). Com isso o D sobe ~14 m no mapa (para o lado oposto ao Bloco B) em relação ao GLB e encosta no corpo do C. Os `overlay-6/7.png` continuam mostrando o encaixe no GLB original.
- **Junções sem parede** (corredores que continuam de uma planta para outra): `salas-config.json → juncoes` (páginas, eixo do corredor, sondas, centro aproximado, trecho). O script mede a faixa livre em cada planta, desloca o bloco da 2ª página para alinhar os eixos e gera `work/juncao-N.png`, que o `compose-montagem.ps1` desenha por cima das plantas. Junções atuais: corredor do C → passagem sob a escada → corredor do D (térreo) e rampa do C → corredor do D (superior), com o D deslocado −0,49 m. Ficam em `montagem.json → juncoes` com `semParede: true`, para o modelo 3D não levantar parede nesses trechos.
- Opções novas por página no `salas-config.json`: `manuais[].poly` (área livre dentro de um polígono, também fora do contorno, em coordenadas da `seg-N-leitura`) e `aberturas[].rect` (paredes viram circulação). Uso atual no Bloco B: corredor ao lado da Secretaria com a ponta aberta para o Atend. ao Aluno, e jardim no trapézio até a parede inclinada.

## Pra alinhar
- Desnível do Bloco A é real? (conferir no `CampusSenai.blend`) — no GLB o A está 2,5 m abaixo de B/C/D
- Confirmar a escala do superior do A no Sweet Home 3D

## Renders gerados (planta por corte horizontal)
![[assets/campus-3d/campus-topo.png]]
![[assets/campus-3d/BlocoA-planta-nivel0-y12.png]]
![[assets/campus-3d/BlocoB-planta-nivel0-y37.png]]
![[assets/campus-3d/BlocoC-planta-nivel0-y37.png]]
![[assets/campus-3d/BlocoD-planta-nivel0-y37.png]]

Scripts: `assets/campus-3d/glb-inspect.mjs` (estrutura) e `glb-render.mjs` (plantas/topo) — `node glb-render.mjs <pasta-glb> <pasta-saida>`.

## Implantação — áreas sem planta (2026-10-19)
Desenhadas pelo usuário sobre o térreo da montagem e gravadas em `salas-config.json → implantacao` (metros, mesmo sistema x/z do GLB), exportadas em `montagem.json → implantacao`.
- **E1** (estacionamento): grade no topo e na lateral, **portão de pedestres** no início da lateral; os carros saem por baixo (fora do escopo).
- **E2** (estacionamento **elevado** em relação ao lado da Secretaria): escada de 2–3 degraus na borda esquerda; a **porta do D** também dá acesso a ele; a borda de baixo é só **desnível**, sem grade nem parede.
- **Circulação externa**: pátio entre B, E2, E1 e A.
- **Rampa** de pouca inclinação no canto superior direito do A, acertando o desnível (pode ser parte da diferença de 2,5 m do A no GLB; não cobre ela toda com pouca inclinação).
- Conversão: escala 0,133 m/px a partir das linhas tracejadas dos blocos A, B e C (conferência < 0,1 m); E2 encostado no fundo do D e E1 na parede do A. Precisão ≈ 0,5 m (desenho à mão).
- Pendente para o 3D: alturas reais (E2 e rampa), altura das grades.

