---
tags: [senai, 4termo]
---

# Projeto_4DEV — SENAI HUB + Portfolio

App de manutenção predial / hub (Connect, Grid, SAFE) + site Portfolio.

## Paths neste PC
- Clone sparse: `C:\Users\39039450803\Desktop\Projeto_4DEV`
- HUB runnable: `C:\dev\senai-hub`
- Portfolio runnable: `C:\dev\portfolio`
- Repo: https://github.com/Hall065/Projeto_4DEV

## Como subir
```
# Hub
cd C:\dev\senai-hub\backend && php artisan serve --host=127.0.0.1 --port=8000
cd C:\dev\senai-hub\frontend && npm run dev -- --host 127.0.0.1 --port 5173

# Portfolio
cd C:\dev\portfolio && npm run dev -- --hostname 127.0.0.1 --port 3000
```

## URLs (local)
- Hub FE: http://127.0.0.1:5173
- Hub API: http://127.0.0.1:8000
- Portfolio: http://127.0.0.1:3000
- Login Hub: admin@senaihub.local / password

Ver [[Diário/2026-09-22]] · [[Diário/2026-09-23]]

- 2026-09-22: HUB OK (PHP 8.4, npm, migrate --seed)
- 2026-09-22: Portfolio OK (Next.js 16.3.4 em :3000)
- 2026-09-23: Fundação motion Hub (`framer-motion` + `frontend/src/motion/` + PageTransition nos layouts)
- 2026-09-23: Rewrite visual Hub ≈ Portfolio — tokens (Syne/Instrument/Mono, ink `#0a0c10`), BootGate/loader/cursor, Landing com órbita + seções scroll
- 2026-09-23: Fix landing estática — root cause OS `prefers-reduced-motion` matava órbita (Portfolio ignora); chips glass `orbit.png`; marketing motion = Settings only
- 2026-09-23: Skip `RouteTransitionLoader` em nav sidebar/shell `app` (`navShell.ts`); Suspense fallback sutil
- 2026-09-23: `#jornada` cinematic — fotos Unsplash locais + painéis 100svh / glass / progress dots (LandingJourneyScroll)
- 2026-09-23: Fix hover feature chips landing — contraste texto no ink + glow Hub red (`LandingFeatures` / `.feature-chip`)
- 2026-09-23: Elevate cards Connect/Grid/SAFE em `#solucoes` + Hub (`PlatformAppCard`, CTA ink→red, marks light)
- 2026-09-23: #jornada pin mais lento — PIN_DISTANCE_SCALE 1/4, scrub 1 (LandingJourneyScroll)

- 2026-09-23: commit/push visual+motion Hub frontend (`3383ddf`) — ver [[Diário/2026-09-23]]
- 2026-10-19: análise dos modelos 3D do campus (Blocos A–D `.glb`) — [[Referências/Modelos 3D Campus SENAI HUB]] · [[Diário/2026-10-19]]
- 2026-10-19: mapa interpretado dos 7 pavimentos (salas nomeadas por tipo + área, `salas.csv`) — base p/ os novos modelos 3D por sala
- 2026-10-19: montagem do campus (plantas encaixadas nos GLB, vista de cima + explodida); achado: superior do Bloco A fora de escala no modelo
- 2026-10-19: Bloco D corrigido na montagem (GLB do site traz o D girado 180°; alinhado pela escada compartilhada com o C)
- 2026-10-19: corredores C ↔ D tratados como contínuos (junções alinhadas, sem parede no meio; registradas p/ o 3D)
- 2026-10-19: Bloco B: corredor ao lado da Secretaria até o Atend. ao Aluno + jardim lateral
- 2026-10-19: implantação sem planta (E1/E2, pátio, grades, portão, escada do E2, desnível e rampa junto ao A) — [[Referências/Modelos 3D Campus SENAI HUB#Implantação — áreas sem planta (2026-10-19)]]
- 2026-10-19: tudo organizado em `Arquivos/Map/Novo Projeto Mapa/` (pipeline, config, dados, saídas, `CONTEXTO.md` p/ o Blender em casa) — commit `bcadfb8` no GitHub; rascunho local removido