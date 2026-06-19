# 🔗 Integração: CRM Nexus ↔ Nexus Digital 90 (mídia)

> **Boa notícia:** a integração **já está codada nos dois lados**. Falta só *ligar*
> (uma chave + uma URL nas variáveis de ambiente). Nenhum código novo é obrigatório.

## As duas peças (corretas)

| | App | O que é | Stack | Onde está |
|---|-----|---------|-------|-----------|
| **A** | **CRM Nexus** (`Nexus Holding`) | Site 3D + painel CRM | React/Vite + **Firebase** | repo `Changzaoo/nexusholding` → Vercel (`nexusholding.vercel.app`) |
| **B** | **Nexus Digital 90** (`MEGAGENCIA`) | Fábrica de entregáveis (diagnóstico, proposta, presença, conteúdo, artes, atendimento/CRM, treinamento, campanha) | Node/Express + **Supabase** | repo `Changzaoo/midia` → frontend na Vercel (`midia.nexusholding.xyz`) + backend no **Render** (serviço `nexus-api`) |

> A pasta `maquinadeMONY` (sites de afiliado) **não faz parte disso** — foi engano. Ver "Limpeza" no fim.

## A ponte já existe

- **No CRM:** `src/lib/nexusBridge.ts` + proxy serverless `api/nexus.js` + a aba **Marketing**
  (`MarketingPanel`) — listam os clientes do Nexus Digital 90 e criam clientes lá a partir do CRM.
- **No Nexus Digital 90:** `dashboard/server.js` já expõe, protegido por `INTEGRATION_KEY`:
  - `GET /api/integration/health`
  - `GET /api/integration/clients` → id, nicho, cidade, materiais, etapasConcluidas (de 8), métricas (ticket, verba, leads, vendas, receita, ROAS), **crmId**
  - `GET /api/integration/client/:id`
  - `POST /api/integration/client` → cria/garante o cliente na fábrica a partir de um lead/empresa do CRM, **vinculando o crmId** (idempotente)

Os dois contratos **batem exatamente**. Só estão desligados porque faltam as variáveis de ambiente.

## Como LIGAR (3 passos — tudo em painel, sem código)

A chave compartilhada já existe: é o **`INTEGRATION_KEY`** que está em
`D:\MEGAGENCIA\dashboard\.env` (começa com `nxs_…`). Use **o mesmo valor** nos dois lados.

1. **Render** (backend `nexus-api` do MEGAGENCIA) → Environment:
   - confirme/defina `INTEGRATION_KEY` = (o valor `nxs_…` do .env)
   - (já deve ter `SUPABASE_URL` e `SUPABASE_SECRET`)
   - copie a **URL pública** do serviço (algo como `https://nexus-api-xxxx.onrender.com`)

2. **Vercel** (projeto do CRM `nexusholding`) → Settings → Environment Variables:
   - `NEXUS_API` = a URL do Render do passo 1
   - `NEXUS_KEY` = o mesmo `INTEGRATION_KEY` (`nxs_…`)

3. **Redeploy** o CRM na Vercel (e garanta que o backend no Render subiu com a chave).

✅ Pronto: a aba **Marketing** do CRM passa a listar os clientes do Nexus Digital 90
(com etapas/8 e métricas), e o botão **"Produzir marketing"** cria a implantação na
fábrica já vinculada ao cliente do CRM.

> 🔒 Como a chave e a URL estão expostas neste fluxo de trabalho, **rotacione o
> `INTEGRATION_KEY`** depois (gere um novo `nxs_…`, troque nos dois lados). Nunca
> coloque o valor da chave dentro de um arquivo versionado.

## A metodologia "Cliente → Projeto → Entregáveis"

É exatamente o que a fábrica já organiza, por cliente, nas pastas `00`→`07`:

```
CRM: cria/usa um CLIENTE  ──(Produzir marketing)──►  Nexus Digital 90: cria a IMPLANTAÇÃO (projeto 90 dias)
                                                          │
        ┌───────────────────────────────────────────────┘
        ▼ a fábrica produz os entregáveis:
  00 Diagnóstico (Raio-X)   01 Proposta        02 Presença digital   03 Conteúdo
  04 Artes/Assets           05 Atendimento/CRM 06 Treinamento        07 Campanha
        │
        ▼ volta pro CRM (aba Marketing): etapas concluídas /8, nº de materiais,
          itens aguardando aprovação, e a projeção de métricas (receita/ROAS).
```

O vínculo entre os dois lados é o **`crmId`** (id do cliente no CRM, gravado no
`briefing.json` da fábrica). Assim cada projeto da fábrica sabe a qual cliente do CRM pertence.

## Melhorias opcionais (quando quiser)
- Aba **"Projetos"** no CRM (hoje os projetos aparecem dentro da aba Marketing).
- Sinalizar no Nexus Digital 90 quando a **proposta foi enviada/aceita** (ler `propostas` do CRM).
- Link direto, no card do cliente do CRM, pra abrir os entregáveis no painel da fábrica.

## Limpeza (pasta errada)
Apague os arquivos que criei por engano em `maquinadeMONY` (eu não consigo apagar daqui):

```powershell
del "D:\maquinadeMONY\maquina-autonoma\publicar_no_crm.py"
del "D:\maquinadeMONY\maquina-autonoma\INTEGRACAO-CRM.md"
```

A aba "Mídia produzida" que eu havia criado no CRM **já foi removida** do código.
