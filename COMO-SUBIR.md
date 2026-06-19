# 🚀 Como subir o CRM pro GitHub (e a Vercel faz o deploy)

As alterações já estão salvas nos arquivos do projeto. Falta só commitar e
dar push **da sua máquina** (no meu ambiente o git fica travado e a cópia dos
arquivos fica em cache antigo, então o push tem que sair daqui do seu PC).

## Passo a passo (PowerShell ou Git Bash, na pasta do projeto)

```powershell
cd "D:\Nexus Holding"

# 1) Se o git reclamar de "index.lock", apague o arquivo travado:
del ".git\index.lock"     # (PowerShell)   |  rm -f .git/index.lock  (Git Bash)

# 2) (opcional, mas recomendado) confira que compila antes de subir:
npm run build

# 3) Adicione, comite e suba:
git add -A
git commit -m "CRM: sidebar, manter logado, fix e-mail, unifica clientes/empresas, aba Configuracoes, papel unico, aba Midia"
git push
```

Assim que o push terminar, a **Vercel faz o deploy automático** (o projeto está
ligado a `nexusholding.vercel.app`).

## Se o `git push` pedir login

Use o seu token no lugar da senha, ou rode o push apontando direto pra ele
(troque `SEU_TOKEN` pelo token que você gerou no GitHub):

```powershell
git push https://SEU_TOKEN@github.com/Changzaoo/nexusholding.git HEAD
```

> 🔒 **Segurança:** depois que tudo subir, **regenere esse token** no GitHub
> (Settings → Developer settings → Personal access tokens). Ele foi exposto no
> chat, então o ideal é trocá-lo. Nunca cole o token dentro de um arquivo do
> projeto — senão ele vai parar no próprio GitHub.

## O que foi alterado nesta leva
- `src/lib/crm.ts` — papel único "Dono"; Clientes+Empresas unificados; aba Configurações; aba Mídia produzida.
- `src/lib/firebase.ts` — manter conectado (persistência), trocar nome/senha.
- `src/App.tsx` — corrige o e-mail trocado no login; auto-abre o CRM quando logado.
- `src/types/admin.ts` — nome de exibição.
- `src/components/AdminDashboard.tsx` — menu lateral à esquerda + aba Configurações.

## Sobre a "máquina de money"
Aquela pasta **não é um repositório git** ainda — não há pra onde dar push.
Quando quiser, eu configuro o git e um deploy (Netlify/Cloudflare/Vercel) pra ela também.
