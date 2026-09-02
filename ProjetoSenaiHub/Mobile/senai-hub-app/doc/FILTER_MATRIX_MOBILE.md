# Matriz de filtros mobile

Esta matriz registra apenas campos confirmados nos tipos, mapeadores e serviços do aplicativo. Os filtros são aplicados depois do recorte de permissão de cada tela e não ampliam o conjunto de dados retornado pelo Supabase.

## SENAI Connect

| Tela | Filtro existente | Implementado com o schema atual | Requisito pendente |
| --- | --- | --- | --- |
| Alunos | Busca por nome, RM e e-mail | Status, curso, turma e empresa | Idade, etnia e último acesso exigem contrato de dados/RLS confirmado |
| Professores | Busca por nome, e-mail e especialidade | Status e especialidade real derivada da lista | Intervalo de contratação aguarda confirmação do schema físico |
| Usuários | Busca por nome, e-mail e papel | Papel permitido e status, após o recorte administrativo Connect | Último acesso não existe no contrato atual |
| Turmas | Busca por turma, curso, professor e período | Status, período, curso e professor responsável | Nenhum campo adicional necessário nesta etapa |
| Cursos | Sem filtro anterior | Status, modalidade e período | Datas avançadas somente após validação do schema físico |
| Empresas | Busca por nome, CNPJ e responsável | Status | Outros relacionamentos não existem no contrato atual |
| Gerenciar frequência | Seleção de aprendiz | Aprendiz, status, turma e período de datas sobre a lista já autorizada | Novas dimensões dependem de colunas e políticas próprias |

O estado avançado é local a cada tela. O `useFilterStore` global permanece apenas onde já era utilizado, evitando que filtros de uma rota vazem para outra.

## SENAI Grid

| Tela | Filtro existente | Implementado com o schema atual | Requisito pendente |
| --- | --- | --- | --- |
| Estoque | Busca por item, descrição e categoria | Categoria, fornecedor, status real, distribuidora, localização textual, custo, quantidade e estoque baixo derivado | Bloco/sala estruturados não existem no item; exigiriam chaves, consulta e RLS próprias |
| Usuários | Busca por nome, e-mail e papel | Papel, status, criação e atualização, sempre após o recorte de visibilidade da manutenção | Último acesso, contrato e carga horária não existem no contrato atual |

No estoque, os únicos status persistidos são `disponivel` e `indisponivel`. “Estoque baixo” é calculado por `quantidade_disponivel <= quantidade_minima` e não é tratado como status fictício.

## Mapas mobile

| Tela | Implementado com dados reais | Limitação registrada |
| --- | --- | --- |
| Grid — mapa de tarefas | Tipo, etapa real, prioridade, bloco, responsável por ID, categoria do chamado e período; pins, lista e métricas usam o mesmo resultado filtrado | Registros sem bloco A–D continuam fora do mapa e são contabilizados |
| Connect — localização | Aluno, turma, curso, estado em aula e perímetro; os quatro GLBs originais formam uma cena 3D única e somente registros autorizados com latitude/longitude finitas viram pontos | A projeção GPS no plano comum dos GLBs usa o centro/raio configurados do campus; faltam âncoras georreferenciadas para calibração exata e não existe localização real de professor/funcionário nem associação coordenada → bloco/pavimento |

O mapa Connect não usa imagens como substituição da cena 3D e não gera fallback, sala, bloco, professor, funcionário ou aluno demonstrativo. Para incluir outros papéis no futuro será necessária uma migration de localização por pessoa, consentimento e retenção LGPD, RLS por vínculo (próprio/turma/perfil), configuração Realtime e um mapeamento geográfico real para blocos e pavimentos. A política ampla atual de `localizacoes_alunos` também deve ser endurecida antes de ampliar a assinatura realtime.
