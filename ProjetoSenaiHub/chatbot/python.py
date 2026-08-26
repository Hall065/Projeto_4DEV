from __future__ import annotations

import json
import os
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from typing import Any

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel, Field
from supabase import create_client


BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
MOBILE_ENV = PROJECT_DIR / "Mobile" / "senai-hub-app" / ".env"

load_dotenv(BASE_DIR / ".env")
if MOBILE_ENV.exists():
    load_dotenv(MOBILE_ENV, override=False)

GROQ_API_KEY = os.getenv("GROQ_API_KEY") or os.getenv("EXPO_API_GROQ")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("EXPO_PUBLIC_SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("EXPO_PUBLIC_SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
CHATBOT_PORT = int(os.getenv("CHATBOT_PORT", "8000"))
CHATBOT_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CHATBOT_ALLOWED_ORIGINS",
        "http://localhost:8081,http://localhost:19006,http://localhost:8082,http://localhost:8083",
    ).split(",")
    if origin.strip()
]

if not GROQ_API_KEY:
    raise RuntimeError("Configure GROQ_API_KEY no .env do backend do chatbot.")
if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise RuntimeError("Configure SUPABASE_URL e SUPABASE_ANON_KEY no .env do backend do chatbot.")

groq_client = Groq(api_key=GROQ_API_KEY)
supabase_auth = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
supabase_db = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY)

app = FastAPI(title="SENAI Hub Chatbot", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CHATBOT_ALLOWED_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    conversation_id: str | None = None
    message: str = Field(..., min_length=1, max_length=1800)


class ConversationCreateRequest(BaseModel):
    titulo: str | None = Field(default="Nova conversa", max_length=80)


class UserContext(BaseModel):
    auth_id: str
    usuario_id: str
    email: str | None = None
    nome: str = "Usuario"
    tipo: str = "usuario"
    empresa_id: str | None = None


CONNECT_MANAGER_ROLES = {
    "admin",
    "direcao",
    "secretaria",
    "connect_secretaria",
    "connect_aqv",
}
CONNECT_ALLOWED_ROLES = CONNECT_MANAGER_ROLES | {
    "professor",
    "connect_professor",
    "aluno",
    "connect_aluno",
    "empresa",
    "connect_empresa",
}
GRID_MANAGER_ROLES = {"admin", "direcao", "gerente_manutencao", "grid_chefe"}
GRID_ALLOWED_ROLES = GRID_MANAGER_ROLES | {"manutencao", "grid_funcionario", "professor"}
SALARY_ROLES = {
    "admin",
    "direcao",
    "secretaria",
    "connect_secretaria",
    "empresa",
    "connect_empresa",
    "aluno",
    "connect_aluno",
}


SYSTEM_PROMPT = """
Voce e o Assistente SENAI Hub, um chatbot profissional integrado ao aplicativo SENAI Hub.

Responda sempre em portugues do Brasil, de forma clara, profissional e objetiva.
Use somente os dados fornecidos no contexto validado pelo backend.
Nao invente numeros, nomes, datas ou metricas.
Se o usuario nao tiver permissao para uma informacao, diga isso de forma educada.
Se o banco nao tiver dados suficientes, explique a limitacao sem expor detalhes tecnicos.
Ao responder metricas, cite o periodo usado quando ele for relevante.
Nao revele chaves, tokens, SQL interno, service role, logs ou detalhes sensiveis.
Mantenha respostas curtas para caber bem na interface mobile.
""".strip()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def today_bounds() -> tuple[str, str, str]:
    today = date.today()
    start = datetime.combine(today, time.min).replace(tzinfo=timezone.utc)
    end = start + timedelta(days=1)
    return today.isoformat(), start.isoformat(), end.isoformat()


def execute_data(query: Any) -> list[dict[str, Any]]:
    result = query.execute() if hasattr(query, "execute") else query
    data = getattr(result, "data", None)
    if data is None:
        return []
    if isinstance(data, list):
        return data
    return [data]


def execute_one(query: Any) -> dict[str, Any] | None:
    rows = execute_data(query)
    return rows[0] if rows else None


def table(schema: str, table_name: str):
    return supabase_db.schema(schema).table(table_name)


def auth_header_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Token ausente.")
    return authorization.split(" ", 1)[1].strip()


def user_attr(user: Any, key: str) -> Any:
    if isinstance(user, dict):
        return user.get(key)
    return getattr(user, key, None)


def normalize_profile(raw: dict[str, Any] | None, auth_id: str, email: str | None) -> UserContext:
    row = raw or {}
    return UserContext(
        auth_id=auth_id,
        usuario_id=str(row.get("id") or auth_id),
        email=str(row.get("email_institucional") or row.get("email") or email or ""),
        nome=str(row.get("nome") or (email or "Usuario").split("@")[0]),
        tipo=str(row.get("tipo_usuario") or row.get("tipo") or "usuario"),
        empresa_id=row.get("empresa_id"),
    )


def get_user_context(authorization: str | None) -> UserContext:
    token = auth_header_token(authorization)
    try:
        response = supabase_auth.auth.get_user(token)
        user = getattr(response, "user", None)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Token invalido ou expirado.") from exc

    if not user:
        raise HTTPException(status_code=401, detail="Usuario nao autenticado.")

    auth_id = str(user_attr(user, "id") or "")
    email = user_attr(user, "email")
    profile = None

    if auth_id:
        profile = execute_one(table("hub", "usuarios").select("*").eq("id", auth_id).limit(1))

    if not profile and email:
        profile = execute_one(
            table("hub", "usuarios").select("*").eq("email_institucional", str(email).lower()).limit(1)
        )

    if not profile and email:
        profile = execute_one(table("hub", "usuarios").select("*").eq("email", str(email).lower()).limit(1))

    return normalize_profile(profile, auth_id, email)


def has_connect_access(ctx: UserContext) -> bool:
    return ctx.tipo in CONNECT_ALLOWED_ROLES


def has_grid_access(ctx: UserContext) -> bool:
    return ctx.tipo in GRID_ALLOWED_ROLES


def has_salary_access(ctx: UserContext) -> bool:
    return ctx.tipo in SALARY_ROLES


def is_student(ctx: UserContext) -> bool:
    return ctx.tipo in {"aluno", "connect_aluno"}


def require_chatbot_access(ctx: UserContext) -> None:
    if is_student(ctx):
        raise HTTPException(status_code=403, detail="O assistente nao esta disponivel para perfis de aluno.")


def is_professor(ctx: UserContext) -> bool:
    return ctx.tipo in {"professor", "connect_professor"}


def is_empresa(ctx: UserContext) -> bool:
    return ctx.tipo in {"empresa", "connect_empresa"}


def count_rows(schema: str, table_name: str) -> int:
    try:
        return len(execute_data(table(schema, table_name).select("id")))
    except Exception:
        return 0


def safe_rows(schema: str, table_name: str, select: str = "*") -> list[dict[str, Any]]:
    try:
        return execute_data(table(schema, table_name).select(select))
    except Exception:
        return []


def find_connect_aluno(ctx: UserContext) -> dict[str, Any] | None:
    return execute_one(table("connect", "alunos").select("*").eq("usuario_id", ctx.usuario_id).limit(1))


def find_connect_professor(ctx: UserContext) -> dict[str, Any] | None:
    return execute_one(table("connect", "professores").select("*").eq("usuario_id", ctx.usuario_id).limit(1))


def count_alunos_today() -> dict[str, Any]:
    day_label, start, end = today_bounds()
    for column in ("created_at", "criado_em", "data_cadastro"):
        try:
            rows = execute_data(
                table("connect", "alunos")
                .select("id")
                .gte(column, start)
                .lt(column, end)
            )
            return {"data": day_label, "total": len(rows), "campo_usado": column, "disponivel": True}
        except Exception:
            continue
    return {
        "data": day_label,
        "total": None,
        "campo_usado": None,
        "disponivel": False,
        "motivo": "A tabela connect.alunos nao possui campo de data de cadastro acessivel.",
    }


def get_connect_dashboard_counts(ctx: UserContext) -> dict[str, Any]:
    if not has_connect_access(ctx):
        return {"permissao": False, "mensagem": "Usuario sem acesso aos dados do SENAI Connect."}

    if is_student(ctx):
        aluno = find_connect_aluno(ctx)
        return {
            "permissao": True,
            "escopo": "proprio_aluno",
            "alunos": 1 if aluno else 0,
            "professores": None,
            "turmas": 1 if aluno and aluno.get("turma_id") else 0,
            "cursos": 1 if aluno and aluno.get("curso_id") else 0,
        }

    if is_professor(ctx):
        professor = find_connect_professor(ctx)
        if not professor:
            return {"permissao": True, "escopo": "professor", "turmas": 0, "alunos": 0}
        turmas = safe_rows("connect", "turmas")
        own_turmas = [row for row in turmas if row.get("professor_responsavel_id") == professor.get("id")]
        turma_ids = {row.get("id") for row in own_turmas}
        alunos = [row for row in safe_rows("connect", "alunos") if row.get("turma_id") in turma_ids]
        return {
            "permissao": True,
            "escopo": "turmas_do_professor",
            "turmas": len(own_turmas),
            "alunos": len(alunos),
        }

    if is_empresa(ctx):
        contratos = [
            row
            for row in safe_rows("connect", "contratos_alunos")
            if not ctx.empresa_id or row.get("empresa_id") == ctx.empresa_id
        ]
        return {
            "permissao": True,
            "escopo": "empresa",
            "contratos": len(contratos),
            "alunos_vinculados": len({row.get("aluno_id") for row in contratos if row.get("aluno_id")}),
        }

    return {
        "permissao": True,
        "escopo": "geral",
        "alunos": count_rows("connect", "alunos"),
        "professores": count_rows("connect", "professores"),
        "turmas": count_rows("connect", "turmas"),
        "cursos": count_rows("connect", "cursos"),
        "alunos_cadastrados_hoje": count_alunos_today(),
    }


def get_frequencia_resumo(ctx: UserContext) -> dict[str, Any]:
    if not has_connect_access(ctx):
        return {"permissao": False}

    frequencias = safe_rows("connect", "frequencias", "id,aluno_id,status,quantidade_aulas_faltadas")
    escopo = "geral"

    if is_student(ctx):
        aluno = find_connect_aluno(ctx)
        aluno_id = aluno.get("id") if aluno else None
        frequencias = [row for row in frequencias if row.get("aluno_id") == aluno_id]
        escopo = "proprio_aluno"
    elif is_professor(ctx):
        professor = find_connect_professor(ctx)
        professor_id = professor.get("id") if professor else None
        aulas = [row for row in safe_rows("connect", "aulas", "id,professor_id") if row.get("professor_id") == professor_id]
        aula_ids = {row.get("id") for row in aulas}
        frequencias = [row for row in safe_rows("connect", "frequencias", "id,aula_id,aluno_id,status,quantidade_aulas_faltadas") if row.get("aula_id") in aula_ids]
        escopo = "turmas_do_professor"

    por_status: dict[str, int] = {}
    faltas = 0
    for row in frequencias:
        status = str(row.get("status") or "sem_status")
        por_status[status] = por_status.get(status, 0) + 1
        faltas += int(row.get("quantidade_aulas_faltadas") or 0)

    return {
        "permissao": True,
        "escopo": escopo,
        "total_registros": len(frequencias),
        "por_status": por_status,
        "aulas_faltadas_registradas": faltas,
    }


def get_contracts_summary(ctx: UserContext) -> dict[str, Any]:
    if not has_connect_access(ctx):
        return {"permissao": False}

    contratos = safe_rows("connect", "contratos_alunos", "id,aluno_id,empresa_id,status,data_inicio,data_termino")
    if is_student(ctx):
        aluno = find_connect_aluno(ctx)
        aluno_id = aluno.get("id") if aluno else None
        contratos = [row for row in contratos if row.get("aluno_id") == aluno_id]
    elif is_empresa(ctx) and ctx.empresa_id:
        contratos = [row for row in contratos if row.get("empresa_id") == ctx.empresa_id]

    por_status: dict[str, int] = {}
    for row in contratos:
        status = str(row.get("status") or "sem_status")
        por_status[status] = por_status.get(status, 0) + 1

    return {"permissao": True, "total": len(contratos), "por_status": por_status}


def get_salary_summary(ctx: UserContext) -> dict[str, Any]:
    if not has_salary_access(ctx):
        return {"permissao": False, "mensagem": "Usuario sem permissao para dados salariais."}

    salarios = safe_rows("connect", "salarios_alunos", "id,aluno_id,empresa_id,salario_final,salario_base,mes_referencia")
    if is_student(ctx):
        aluno = find_connect_aluno(ctx)
        aluno_id = aluno.get("id") if aluno else None
        salarios = [row for row in salarios if row.get("aluno_id") == aluno_id]
    elif is_empresa(ctx) and ctx.empresa_id:
        salarios = [row for row in salarios if row.get("empresa_id") == ctx.empresa_id]

    valores = [float(row.get("salario_final") or row.get("salario_base") or 0) for row in salarios]
    media = round(sum(valores) / len(valores), 2) if valores else 0
    return {"permissao": True, "total_registros": len(salarios), "media_valor": media}


def get_grid_summary(ctx: UserContext) -> dict[str, Any]:
    if not has_grid_access(ctx):
        return {"permissao": False, "mensagem": "Usuario sem acesso aos dados do SENAI Grid."}

    chamados = safe_rows("grid", "chamados", "id,status,prioridade,aberto_por,solicitante_id,responsavel_id")
    tarefas = safe_rows("grid", "tarefas", "id,status,prioridade,responsavel_id")
    estoque = safe_rows("grid", "itens_estoque", "id,titulo,status,quantidade_disponivel,quantidade_minima")

    if ctx.tipo == "professor":
        chamados = [
            row
            for row in chamados
            if row.get("aberto_por") == ctx.usuario_id or row.get("solicitante_id") == ctx.usuario_id
        ]

    chamados_por_status: dict[str, int] = {}
    chamados_por_prioridade: dict[str, int] = {}
    for row in chamados:
        status = str(row.get("status") or "sem_status")
        prioridade = str(row.get("prioridade") or "sem_prioridade")
        chamados_por_status[status] = chamados_por_status.get(status, 0) + 1
        chamados_por_prioridade[prioridade] = chamados_por_prioridade.get(prioridade, 0) + 1

    tarefas_por_status: dict[str, int] = {}
    for row in tarefas:
        status = str(row.get("status") or "sem_status")
        tarefas_por_status[status] = tarefas_por_status.get(status, 0) + 1

    estoque_critico = [
        {
            "id": row.get("id"),
            "titulo": row.get("titulo"),
            "quantidade_disponivel": row.get("quantidade_disponivel"),
            "quantidade_minima": row.get("quantidade_minima"),
            "status": row.get("status"),
        }
        for row in estoque
        if str(row.get("status") or "") in {"indisponivel", "esgotado", "estoque_baixo"}
        or float(row.get("quantidade_disponivel") or 0) <= float(row.get("quantidade_minima") or 0)
    ][:10]

    return {
        "permissao": True,
        "chamados": {"total": len(chamados), "por_status": chamados_por_status, "por_prioridade": chamados_por_prioridade},
        "tarefas": {"total": len(tarefas), "por_status": tarefas_por_status},
        "estoque_critico": estoque_critico,
    }


def infer_tools(question: str) -> list[str]:
    text = question.lower()
    tools: list[str] = []

    if any(word in text for word in ["aluno", "professor", "turma", "curso", "connect", "dashboard", "academ"]):
        tools.append("connect_dashboard")
    if any(word in text for word in ["hoje", "cadastrad", "cadastro"]):
        tools.append("alunos_hoje")
    if any(word in text for word in ["frequ", "falta", "presenca", "presenca"]):
        tools.append("frequencia")
    if any(word in text for word in ["contrato", "empresa", "vinculo"]):
        tools.append("contratos")
    if any(word in text for word in ["salario", "pagamento", "bolsa"]):
        tools.append("salarios")
    if any(word in text for word in ["grid", "chamado", "tarefa", "estoque", "manutencao", "item"]):
        tools.append("grid")

    if not tools:
        tools = ["connect_dashboard", "grid"]
    return list(dict.fromkeys(tools))


def collect_context(question: str, ctx: UserContext) -> dict[str, Any]:
    tools = infer_tools(question)
    data: dict[str, Any] = {
        "data_consulta": now_iso(),
        "usuario": {
            "id": ctx.usuario_id,
            "nome": ctx.nome,
            "tipo": ctx.tipo,
        },
        "ferramentas_usadas": tools,
        "dados": {},
    }

    if "connect_dashboard" in tools:
        data["dados"]["connect_dashboard"] = get_connect_dashboard_counts(ctx)
    if "alunos_hoje" in tools:
        data["dados"]["alunos_cadastrados_hoje"] = (
            count_alunos_today() if has_connect_access(ctx) and not is_student(ctx) else {"permissao": False}
        )
    if "frequencia" in tools:
        data["dados"]["frequencia"] = get_frequencia_resumo(ctx)
    if "contratos" in tools:
        data["dados"]["contratos"] = get_contracts_summary(ctx)
    if "salarios" in tools:
        data["dados"]["salarios"] = get_salary_summary(ctx)
    if "grid" in tools:
        data["dados"]["grid"] = get_grid_summary(ctx)

    return data


def ensure_conversation(ctx: UserContext, conversation_id: str | None, title: str = "Nova conversa") -> dict[str, Any]:
    if conversation_id:
        conversation = execute_one(
            table("hub", "chatbot_conversas")
            .select("*")
            .eq("id", conversation_id)
            .eq("usuario_id", ctx.usuario_id)
            .limit(1)
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversa nao encontrada.")
        if conversation.get("status") != "ativa":
            raise HTTPException(status_code=409, detail="Esta conversa esta arquivada. Inicie uma nova conversa.")
        return conversation

    return create_conversation(ctx, title)


def create_conversation(ctx: UserContext, title: str | None = "Nova conversa") -> dict[str, Any]:
    payload = {
        "usuario_id": ctx.usuario_id,
        "titulo": (title or "Nova conversa")[:80],
        "status": "ativa",
    }
    rows = execute_data(table("hub", "chatbot_conversas").insert(payload).execute())
    if not rows:
        raise HTTPException(status_code=500, detail="Nao foi possivel criar a conversa.")
    return rows[0]


def save_message(
    ctx: UserContext,
    conversation_id: str,
    role: str,
    content: str,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    payload = {
        "conversa_id": conversation_id,
        "usuario_id": ctx.usuario_id,
        "role": role,
        "conteudo": content,
        "metadata": metadata or {},
    }
    rows = execute_data(table("hub", "chatbot_mensagens").insert(payload).execute())
    if not rows:
        raise HTTPException(status_code=500, detail="Nao foi possivel salvar a mensagem.")
    execute_data(
        table("hub", "chatbot_conversas")
        .update({"updated_at": now_iso()})
        .eq("id", conversation_id)
        .eq("usuario_id", ctx.usuario_id)
        .execute()
    )
    return rows[0]


def list_conversation_messages(ctx: UserContext, conversation_id: str, limit: int = 60) -> list[dict[str, Any]]:
    ensure_conversation(ctx, conversation_id)
    rows = execute_data(
        table("hub", "chatbot_mensagens")
        .select("*")
        .eq("conversa_id", conversation_id)
        .eq("usuario_id", ctx.usuario_id)
        .order("created_at", desc=False)
        .limit(limit)
    )
    return rows


def maybe_update_title(ctx: UserContext, conversation: dict[str, Any], first_message: str) -> None:
    current_title = str(conversation.get("titulo") or "")
    if current_title and current_title != "Nova conversa":
        return
    title = first_message.strip().replace("\n", " ")
    if len(title) > 56:
        title = f"{title[:53]}..."
    if not title:
        title = "Nova conversa"
    execute_data(
        table("hub", "chatbot_conversas")
        .update({"titulo": title, "updated_at": now_iso()})
        .eq("id", conversation["id"])
        .eq("usuario_id", ctx.usuario_id)
        .execute()
    )


def groq_answer(question: str, ctx: UserContext, conversation_id: str, data_context: dict[str, Any]) -> str:
    history = list_conversation_messages(ctx, conversation_id, limit=10)
    messages: list[dict[str, str]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "system",
            "content": "Contexto validado pelo backend:\n"
            + json.dumps(data_context, ensure_ascii=False, default=str),
        },
    ]

    for item in history[-8:]:
        role = item.get("role")
        if role in {"user", "assistant"}:
            messages.append({"role": role, "content": str(item.get("conteudo") or "")})

    if not history or history[-1].get("conteudo") != question:
        messages.append({"role": "user", "content": question})

    completion = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        temperature=0.2,
        max_tokens=700,
    )
    return completion.choices[0].message.content or "Nao consegui gerar uma resposta agora."


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "senai-hub-chatbot"}


@app.get("/conversations")
def conversations(authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    ctx = get_user_context(authorization)
    require_chatbot_access(ctx)
    return execute_data(
        table("hub", "chatbot_conversas")
        .select("*")
        .eq("usuario_id", ctx.usuario_id)
        .eq("status", "ativa")
        .order("updated_at", desc=True)
    )


@app.post("/conversations")
def new_conversation(
    payload: ConversationCreateRequest,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    ctx = get_user_context(authorization)
    require_chatbot_access(ctx)
    return create_conversation(ctx, payload.titulo)


@app.get("/conversations/{conversation_id}/messages")
def conversation_messages(
    conversation_id: str,
    authorization: str | None = Header(default=None),
) -> list[dict[str, Any]]:
    ctx = get_user_context(authorization)
    require_chatbot_access(ctx)
    return list_conversation_messages(ctx, conversation_id)


@app.delete("/conversations/{conversation_id}")
def archive_conversation(
    conversation_id: str,
    authorization: str | None = Header(default=None),
) -> dict[str, str]:
    ctx = get_user_context(authorization)
    require_chatbot_access(ctx)
    rows = execute_data(
        table("hub", "chatbot_conversas")
        .update({"status": "arquivada", "updated_at": now_iso()})
        .eq("id", conversation_id)
        .eq("usuario_id", ctx.usuario_id)
        .eq("status", "ativa")
        .select("id")
        .execute()
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Conversa ativa nao encontrada.")
    return {"status": "arquivada"}


@app.post("/chat")
def chat(payload: ChatRequest, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    ctx = get_user_context(authorization)
    require_chatbot_access(ctx)
    question = payload.message.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Mensagem vazia.")

    conversation = ensure_conversation(ctx, payload.conversation_id, question[:56] or "Nova conversa")
    save_message(ctx, conversation["id"], "user", question)
    maybe_update_title(ctx, conversation, question)

    data_context = collect_context(question, ctx)

    try:
        answer = groq_answer(question, ctx, conversation["id"], data_context)
    except Exception as exc:
        answer = "O assistente esta temporariamente indisponivel. Tente novamente em alguns instantes."
        save_message(ctx, conversation["id"], "assistant", answer, {"erro": str(exc), "model": GROQ_MODEL})
        raise HTTPException(status_code=503, detail=answer) from exc

    assistant_message = save_message(
        ctx,
        conversation["id"],
        "assistant",
        answer,
        {
            "model": GROQ_MODEL,
            "tools_used": data_context.get("ferramentas_usadas", []),
        },
    )

    return {
        "conversation_id": conversation["id"],
        "message": assistant_message,
        "metadata": {
            "model": GROQ_MODEL,
            "tools_used": data_context.get("ferramentas_usadas", []),
        },
    }


if __name__ == "__main__":
    uvicorn.run("python:app", host="0.0.0.0", port=CHATBOT_PORT, reload=True)
