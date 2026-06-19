# 🔗 Integração Nexus ↔ Mídia — Blueprint

> Objetivo: fazer o CRM do Nexus Road e a aplicação de mídia compartilharem **uma
> única base de dados que sincroniza nos dois sentidos**, sinalizar quando uma
> proposta já foi enviada, e ligar as duas pontas para ganhar autonomia sem perder
> qualidade. Banco central escolhido: **Firebase Firestore do Nexus** (`postflow-b893f`).

---

## 1. O que existe hoje (mapa real)

São, na verdade, **três peças** — não duas:

| # | Peça | O que é | Onde os dados ficam | Acesso meu |
|---|------|---------|---------------------|-----------|
| A | **CRM Nexus Road** (`Nexus Holding`) | Portal 3D + painel admin com as abas Visão geral, Pipeline, Leads, Clientes, Empresas, Propostas, Agenda, Financeiro, Campanhas, Conteúdo, Marketing | **Firebase Firestore** (projeto `postflow-b893f`), com fallback em localStorage | ✅ Total (este repositório) |
| B | **Nexus Digital 90** (painel de marketing) | Painel hospedado à parte. A aba **Marketing** do CRM já fala com ele pela ponte `nexusBridge`: lista clientes, materiais, etapas (x/8) e métricas (ticket, verba, leads, vendas, receita, ROAS) | Banco próprio dele (no servidor onde está hospedado) | ❌ Não tenho o código aqui |
| C | **Máquina de MONY** (a "mídia") | 3 sites de afiliado estáticos + fábrica de conteúdo em Python (posts, reels, ebooks) | **Não tem banco** — é uma fábrica de arquivos | ✅ Total (pasta local) |

**Por que as abas estão "vazias":** a ponte CRM → Nexus Digital 90 **está desligada**.
O código está pronto (`src/lib/nexusBridge.ts` + `api/nexus.js`), mas faltam duas
configurações: a **URL** do painel (`NEXUS_API`) e a **chave de integração** (`NEXUS_KEY`).
Sem isso, a aba Marketing não recebe nada.

> ⚠️ **Ponto a confirmar com você:** "Nexus Digital 90" (peça B) e "máquina de money"
> (peça C) são **a mesma coisa** ou **apps diferentes**? Isso muda o desenho. O CRM
> hoje integra com B; você descreveu a "mídia" como C. Preciso saber qual é qual.

---

## 2. A arquitetura proposta (Firebase como o "coração")

Em vez de cada app ter seu próprio banco e tentar copiar dados de um pro outro
(frágil, dessincroniza fácil), todos passam a ler e escrever **no mesmo Firestore**.
É isso que faz a sincronização ser **automática e nos dois sentidos**: quando A muda
um registro, B e C veem na hora, porque é o mesmo dado — não uma cópia.

```
                    ┌──────────────────────────────┐
                    │   FIREBASE FIRESTORE (Nexus)  │  ← fonte única da verdade
                    │  clientes · leads · empresas  │
                    │  propostas · campanhas        │
                    │  conteudo (mídias)            │
                    └──────────────────────────────┘
                       ▲            ▲            ▲
            lê/escreve │            │            │ lê/escreve
                       │            │            │
        ┌──────────────┴──┐  ┌──────┴───────┐  ┌─┴──────────────────┐
        │  A. CRM Nexus    │  │ B. Nexus     │  │ C. Máquina de MONY │
        │     Road         │  │   Digital 90 │  │   (fábrica Python) │
        └──────────────────┘  └──────────────┘  └────────────────────┘
```

### Como cada sentido funciona na prática

- **CRM → Mídia:** cadastra um cliente/empresa ou cria uma campanha no CRM → aparece
  na mídia como alvo de produção (já existe o botão "Produzir marketing" na aba
  Marketing; passa a gravar no banco central em vez de só no painel externo).
- **Mídia → CRM:** a fábrica gera posts/reels/ebooks → grava um registro em
  `conteudo` no Firestore → aparece de volta na aba **Conteúdo/Marketing** do CRM,
  vinculado ao cliente certo.
- **Proposta enviada (o sinal que você pediu):** a coleção `propostas` já tem o campo
  `status` com `rascunho · enviada · aceita · recusada`. Como o banco é compartilhado,
  basta a mídia **ler esse campo**: se `status = enviada`, mostra o selo "proposta já
  enviada" no cliente. Nada é duplicado — é o mesmo registro.

---

## 3. Contrato de dados compartilhado

Coleções canônicas no Firestore (as que o CRM já usa + uma nova para mídia). A regra
de ouro do vínculo: **todo registro de mídia/marketing referencia o CRM pelo campo
`crmId`** (o id do cliente/empresa no CRM). É isso que "casa" os dois lados.

| Coleção | Dono / quem escreve | Campos-chave | Para que serve na integração |
|---------|---------------------|--------------|------------------------------|
| `clientes` | CRM (principal) | `name, company, email, segment, owner` | Cliente vira alvo de produção na mídia |
| `leads` | CRM | `name, email, status (pipeline)` | Pipeline comercial |
| `empresas` | CRM | `name, cnpj, segment, city` | Conta/empresa atendida |
| `propostas` | CRM | `title, client, value, **status: enviada**, validUntil` | **Sinal "proposta enviada"** lido pela mídia |
| `campanhas` | CRM + mídia | `name, channel, budget, status, crmId` | Campanha dispara/organiza a produção |
| `conteudo` *(nova)* | **Mídia** (fábrica/painel) | `crmId, campanhaId, tipo (post/reel/ebook), titulo, arquivoUrl, status (rascunho/aguardando/aprovado/publicado), criadoEm` | **Conteúdo produzido aparece no CRM** |

Convenções:
- `crmId` ausente = registro ainda não vinculado a um cliente do CRM (fica como
  "candidato a vincular").
- Datas em `createdAt`/`criadoEm` (epoch ms ou Timestamp do Firestore).
- Nada é apagado pela integração — só criação e atualização de status.

---

## 4. O que cada peça precisa ganhar

### A. CRM Nexus Road  *(posso fazer agora — tenho o código)*
1. Ligar a ponte: definir `NEXUS_API` e `NEXUS_KEY` (no Vercel) **ou** migrar a aba
   Marketing para ler direto do Firestore central.
2. Nova *store* `conteudo` em `src/lib/crm.ts` + um painel que lista o conteúdo
   produzido pela mídia (assim a aba Conteúdo/Marketing "recebe a informação da outra
   aplicação", que é exatamente sua dor).
3. Garantir que `propostas.status = enviada` seja visível para o lado da mídia.

### B. Nexus Digital 90  *(preciso do código/URL dele)*
1. Passar a ler/escrever no Firestore central (mesmas coleções) **ou** expor as rotas
   `/api/integration/clients`, `/client`, `/health` que a ponte já chama, mais novas
   rotas para `propostas` e `conteudo`.
2. Mostrar o selo "proposta enviada" lendo `propostas`.

### C. Máquina de MONY  *(posso fazer — preciso de uma credencial do Firebase)*
1. Um **publicador** em Python: depois de gerar um lote, grava cada item em `conteudo`
   no Firestore (com `crmId`/`campanhaId`). Assim o conteúdo aparece no CRM sozinho.
2. (Opcional) Ler `clientes`/`campanhas` para saber **para quem** produzir.
   → Isso exige uma **conta de serviço do Firebase** (arquivo JSON do Console →
   Configurações → Contas de serviço). Sem ela, o Python não consegue escrever no banco.

---

## 5. O que eu preciso de você para terminar

1. **"Nexus Digital 90" é a mesma coisa que a máquina de money, ou é um terceiro app?**
2. **URL do painel hospedado** (o endereço onde o Nexus Digital 90 está no ar) e a
   **chave de integração** — ou, se você tem o código dele numa pasta/repositório,
   me dê acesso para eu fazer ele ler o banco central.
3. Se quiser o conteúdo da fábrica aparecendo no CRM **automaticamente**: o arquivo
   **JSON da conta de serviço** do Firebase (eu te mostro onde baixar, em 1 minuto).

Com (1) respondido e (2)/(3) em mãos, eu já implemento: ligo a ponte, crio a store e o
painel de `conteudo` no CRM e escrevo o publicador da fábrica — e a sincronização
passa a funcionar de ponta a ponta.

---

## 6. O que eu já posso começar sem esperar nada

Mesmo antes de você me passar os acessos, posso adiantar com segurança (mudanças
aditivas, não quebram nada):
- Criar a *store* `conteudo` e o painel de Conteúdo/Mídia no CRM.
- Deixar o publicador Python pronto (só faltando plugar a credencial).
- Documentar as variáveis da ponte para você colar no Vercel.

É só me dizer "pode começar pelo CRM" que eu sigo.
