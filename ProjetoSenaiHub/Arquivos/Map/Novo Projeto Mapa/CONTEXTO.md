# Novo Projeto Mapa — contexto completo para continuar em outro PC

> **Para o agente que abrir este arquivo num chat novo:** leia tudo antes de mexer em qualquer coisa.
> Aqui está o que já foi feito (SENAI e casa, 19/10/2026) e como os dados se encaixam. Os modelos 3D com as
> salas separadas **já são gerados no Blender** (§7); falta o usuário aprovar os renders antes de
> substituir os GLB que o site usa.

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
│       │   ├── extrair-geometria.mjs   ← 6. ids-N.png → dados/salas-geo.json (polígonos em metros)
│       │   ├── blender/gerar-campus.py ← 7. modelos 3D + renders (roda à parte, ver §7)
│       │   └── ferramentas/            ← glb-inspect, glb-render, sh3d-summary (diagnóstico)
│       ├── config/salas-config.json    ← TODAS as decisões manuais (nomes, tipos, junções, implantação)
│       ├── dados/                      ← saídas intermediárias versionadas (entrada do Blender)
│       │   ├── montagem.json           ← transformação planta → mundo (metros) de cada página
│       │   ├── juncao-1.png, juncao-2.png
│       │   ├── salas.csv               ← lista de salas com área (m²)
│       │   └── render/fill-N.png, ids-N.png, labels-N.json, salas.csv
│       ├── saida/                      ← imagens finais validadas pelo usuário
│       │   └── blender/                ← GLB gerados (glb/), renders e visualizar.html
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
| 3 | BlocoB-unico | B único (nível 0) | 32.69 | 2.50 | 17 |
| 4 | BlocoC-inferior | C inferior (nível 0) | 21.25 | 2.50 | 19 |
| 5 | BlocoC-superior | C superior (nível 2) | 24.84 | 7.62 | 22 |
| 6 | BlocoD-terreo | D térreo (nível 0) | 20.38 | 2.50 | 37 |
| 7 | BlocoD-superior | D superior (nível 2) | 21.40 | 7.62 | 18 |

- Níveis do Sweet Home 3D: 0 = térreo, 1 = só o teto do pé-direito duplo (sem planta), 2 = superior.
- No GLB, cada nível = 25,6 unidades = **2,56 m**; o superior fica 5,12 m acima da base do bloco.
- O Bloco A está **2,5 m abaixo** dos outros no GLB (base 0 contra 2,5 dos demais). **É desnível real do
  terreno** (confirmado pelo usuário em 19/10/2026): o acesso ao A tem 2 escadas e 1 rampa. Manter no 3D.
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
   - **E1**, estacionamento à direita do A: polígono (12.68,−60.16) (27.14,−60.16) (27.14,0.12) (7.38,0.12) (7.38,−23.03) (12.68,−23.03);
   - **E2**, estacionamento **elevado** entre C/D e A: retângulo x 1.3…27.14, z −95.15…−65.48, **1 m acima** do pátio;
   - **circulação externa** amarela ligando tudo;
   - **rampa**, perto do A: x −0.75…6.7, z −59.69…−44.59;
   - **escada externa** de 2–3 degraus subindo para o E2: x 1.3…3.9, z −83.45…−75.46;
   - **grades roxas** (1,8 m): topo do E1 (12.68,−60.16)→(27.14,−60.16) e lateral (12.68,−52.58)→(12.68,−23.03)→(7.38,−23.03);
   - **portão de pedestres** cinza: x 12.68, z −59.89…−52.58;
   - **borda do desnível do E2**, sem grade: (1.3,−65.48)→(27.14,−65.48);
   - borda direita de E1/E2 em x = 27.14 = quina de trás do D térreo (simplificação; na realidade não alinha).
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
  - `splits`, `manuais` (`rect`/`poly`), `aberturas` (parede → circulação, ou → sala `vira`), `encaixe`.
- Os `rect`/`poly` das páginas estão na imagem `seg-N-leitura.png` reduzida a 1024 px de largura, **não em metros**.

---

## 7. Blender

### Feito (19/10/2026, em casa, Blender 5.1)
1. **`scripts/extrair-geometria.mjs`** (roda no fim do `rodar-pipeline.ps1`) → `dados/salas-geo.json`:
   - contornos pelas bordas dos pixels de `ids-N.png` + Douglas-Peucker de 1,5 px (~7 cm), em metros (§6);
   - **arcos de porta removidos:** traço fino de parede (some numa abertura 3×3) só fica se fizer parte de uma
     reta ≥ 1,2 m; o resto volta para a sala vizinha. Paredes de linha dupla (comuns no D) ficam;
     `--diag work` grava `work/arcos-N.png` (vermelho = removido);
   - **escadas internas:** linhas finas paralelas próximas (≥ 3 num raio de 0,9 m, até 3,6 m de comprimento,
     grupo ≥ 0,6 m) viram `degraus`; o que fica entre degraus (inclusive linha de percurso e marcas dela) vira
     `escadas`. No diag: azul = degrau, azul claro = piso da escada;
   - **escadas 3D** (`escadas` no fim do JSON): cada escada vira lances (colunas de degraus lado a lado, ângulo
     livre) e é casada entre plantas (C/D compartilhada aparece em 4 páginas). Degraus maciços subindo por igual
     de `de` a `ate`; em U, 1º lance → patamar a meia altura → 2º lance. 1º lance = o que aparece na planta de
     baixo; sem ela, mesmo giro da torre do A (referência do usuário, 19/10/2026: começa no térreo, termina no
     andar 1). Térreo e superior são partes da mesma escada (usuário): o que a planta de baixo desenha além do
     trecho de cima entra na mesma escada, com degraus no vão entre os dois desenhos. Espelho acima de 21 cm
     (desenho com poucos degraus) é redistribuído no mesmo trecho a 18 cm. Sem planta casada, `de`/`ate` saem do
     espelho que cabe (14–21 cm). Ajustes em `config/salas-config.json → escadas3d`; o log marca `[a confirmar]`.
     As plantas não foram deslocadas: as paredes do térreo e do superior já casam (deslocar pela escada piora);
   - junções C↔D: parede dentro de `juncoes[].retangulo` vira circulação;
   - por página: `piso_m`, `alturaParede_m` (até o piso do superior do mesmo bloco, senão até `topoBloco_m`),
     `salas[{codigo,nome,tipo,area_m2,loops}]`, `circulacao`, `paredes`, `escadas`, `degraus`; mais a
     `implantacao`.
2. **`scripts/blender/gerar-campus.py`**:
   `blender -b --factory-startup -P scripts\blender\gerar-campus.py -- [--sem-render] [--blend]`
   - paredes extrudadas (curva 2D preenchida → malha, buracos por par/ímpar), laje de 12 cm sob cada piso;
   - um objeto por sala `"<Bloco><nível> — <nome>"` (ex.: `A0 — Cantina`), material pela cor do tipo,
     `extras` no glTF: `tipo`, `nome`, `area_m2`, `bloco`, `nivel`, `pavimento`, `piso_m`;
   - escadas internas: `<Bloco> — Escada N` (degraus e patamar maciços, extras `de_m`, `ate_m`, `degraus`);
     o piso do andar de cima é recortado sobre a escada; se não há planta embaixo (torre do A), as paredes do
     andar de cima descem até o chão em volta da escada. Linhas de percurso/bordas de patamar não viram
     parede. Imagens: `saida/blender/escada-torre-A-site.png`, `escada-torre-A-corte.png`,
     `escada-C-D-corte.png`, `escada-D-lateral-corte.png`;
   - implantação: pátio, E1, E2 (+1 m, recortado onde entra a escada), rampa, escada de 3 degraus, grades e
     portão (montantes a cada 15/10 cm, postes a cada ~2,5 m);
   - exporta `saida/blender/glb/BlocoA..D.glb`, `Externo.glb`, `Campus.glb` (decímetros, Y para cima, mesmo
     referencial dos GLB do site) e renders em `saida/blender/` (`campus-topo`, `campus-perspectiva`,
     `BlocoX`, `originais-*`, `comparacao-topo` = novo × contorno do GLB atual em vermelho).
   - Tamanhos: A 829 KB, B 278 KB, C 479 KB, D 923 KB, Externo 278 KB (os atuais somam 3,6 MB).
3. **Validação:** encaixe confere com `Montagem-implantacao.png`; os GLB abrem no Three.js (GLTFLoader) com
   materiais e no mesmo referencial — `saida/blender/visualizar.html` (servir a pasta por HTTP).

### Suposições a confirmar com o usuário
- Pátio, E1 e base da grade na altura de B/C/D (`alturaPatio_m` = 2,5); E2 = pátio + 1 m.
- Rampa desce do lado do pátio (z menor) para o A, a 8%: cobre só ~1,2 m dos 2,5 m de desnível.
- Térreo com paredes até o piso do superior (pé-direito duplo, 5,12 m), como nos GLB atuais; **sem telhado**
  (dá para ver as salas de cima). Portas são vãos de altura inteira (sem verga).
- Escadas (log do `extrair-geometria.mjs`):
  - torre do A superior (−5,2; −18,1): U 0 → 5,12 m, 15 + 18 degraus — **confirmada pelo usuário**. O A térreo
    não desenha escada embaixo dela (lá tem salas); as paredes do superior descem até o chão em volta;
  - C/D compartilhada (−3,2; −121,2): U 2,5 → 7,62 m, 13 + 13 (2º lance cortado no desenho, completado);
  - interna do A (−0,8; −49,1): U 0 → 5,12 m, 15 + 14, mesma escada no térreo e no superior;
  - D lateral (11,3; −148): reta 2,5 → 7,62 m, 29 degraus = 7 do térreo + 13 do superior em sequência;
  - D meio (11,1; −118,5) e anexo de baixo (−2,9; −150,2): só o térreo desenha; D torre (29,6; −101,5): só o
    superior desenha. Todas 2,5 → 7,62 m (usuário), degraus redistribuídos no trecho desenhado;
  - acessos A ↔ pátio: (−8,3; −57,2) reta 0 → 2,5 m subindo para +x; (1,6; −43,8) desenho em grade (sentido
    incerto);
  - B (−25,6; −92,1): reta 2,5 → 4,99 m (usuário não sabe; fica assim).
  Mureta entre lances desenhada com traço grosso continua como parede inteira.

### Próximo
- Usuário aprovar os renders; depois trocar os GLB em `frontend/public/models/campus/`. O `Externo.glb` não é
  carregado pelo site: precisa entrar em `campusBlocks.ts` (ou ir junto de algum bloco).
- Conferir no viewer do site: marcadores/pontos fixos no Bloco D podem estar no referencial antigo (D girado).
- Opcional: texturas (piso cerâmico, cimento nas oficinas, azulejo nos sanitários), telhado opcional,
  confirmar com o usuário as escadas marcadas `[a confirmar]`.

---

## 8. Dúvidas

### Respondidas pelo usuário (19/10/2026, em casa)
- **Desnível do Bloco A:** real. O A fica 2,5 m abaixo dos outros; há 2 escadas e 1 rampa de acesso.
- **E2:** 1 m acima do pátio (circulação externa).
- **Rampa perto do A:** inclinação desconhecida, "bem pouca". Usar inclinação suave (≤ 8%) ao longo do lado maior.
- **A superior:** gerar só pelas plantas (não corrigir no Sweet Home 3D).
- **Nomes incertos** (os mapas de risco têm menos de 6 meses e são considerados atuais):
  - **OPP** = sala dos professores (fora de aula); todas viram "Sala OPP", tipo `adm` (B, C inferior, C superior
    e a sala ilegível do D superior);
  - B: a "Sala (sem identificação)" **não existe mais**; a região 22 entrou na "Área coberta / acesso" e as paredes
    dela foram apagadas (`aberturas[].vira`);
  - códigos 11C/12C do C inferior e classes dos Resíduos do D térreo: mantidos como estão;
  - D superior: "Dep. Prod. Químicos" confirmado (salinha sob a escada);
  - GLP do A térreo (em frente às Bombas, gás): desconsiderado.
- **Grades e portão:** 1,8 m (`altura_m` nas linhas da implantação).
- **Borda direita de E1/E2:** na realidade não alinha com a quina do D, mas foi **simplificada** para x = 27,14
  (quina de trás do D térreo), e a grade do topo do E1 vai até ela.

Dúvidas de dados encerradas; as suposições do 3D estão em §7.

---

## 9. Histórico

**19/10/2026, SENAI (máquina ECFP505D1249348):** plantas interpretadas das 7 páginas, montagem do campus
sobre os GLB, rotação do D, junções C↔D, corredor/jardim do B, implantação (E1, E2, rampa, grades, portão,
escada), organização nesta pasta e mapa `ids-N.png` para a etapa do Blender.

**19/10/2026, em casa (Desktop-Hall):** dúvidas respondidas (§8), nomes corrigidos, implantação final;
extração de geometria + gerador Blender com GLB por bloco, área externa e renders de conferência (§7).

Registro detalhado no Obsidian do usuário: vault Hall (nota `Referências/Modelos 3D Campus SENAI HUB`).
