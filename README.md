# NEXUS HOLDING — Creative Digital Experiences

Experiência web 3D cinematográfica: cena WebGL fullscreen, câmera dirigida
por scroll (6 momentos), cards de vidro flutuantes, partículas/nebulosa e
área de admin secreta com Firebase Auth.

**Stack:** Vite · React 19 · TypeScript · Three.js · @react-three/fiber ·
@react-three/drei · GSAP ScrollTrigger · Lenis · Tailwind CSS v4 · Firebase.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra http://localhost:5173.

## Credenciais Firebase

Edite **`src/lib/firebase.ts`** e substitua os placeholders `YOUR_*` pelas
credenciais do Console Firebase (Configurações do projeto → SDK Web).
Habilite **Authentication → E-mail/senha** e crie o usuário admin lá.

> Enquanto os placeholders existirem, o site roda normalmente e o modal de
> login exibe um aviso. A autorização real (coleção `admins` / custom claims)
> está documentada em comentário dentro do mesmo arquivo.

## Admin secreto

Segure a tecla **G** por **10 segundos** em qualquer lugar do site.
Um anel de progresso discreto aparece no canto inferior direito; soltar
antes cancela. Ao completar, abre o modal de login (Firebase Auth) e,
após autenticar, o Admin Dashboard.

## Onde editar

| O quê | Onde |
|---|---|
| Textos, serviços, CTAs | `src/data/siteContent.ts` |
| Cores, fontes, glitch | `src/styles/globals.css` (`@theme`) |
| Timeline da câmera (6 momentos) | `src/scene/SceneCameraRig.tsx` (`KEYS`) |
| Composição da cena / posições | `src/scene/ExperienceCanvas.tsx` |
| Densidade de partículas / qualidade | `src/hooks/useDeviceProfile.ts` |
| Duração da viagem (altura do scroll) | `src/App.tsx` (700vh/900vh) |
| Janelas de fade do overlay HTML | `src/components/Overlay.tsx` |

## Performance

- Cena em `lazy()` + `Suspense`, DPR limitado, fog ocultando o corredor distante.
- Mobile / poucos núcleos: partículas e painéis reduzidos automaticamente.
- `prefers-reduced-motion`: glitch e animações CSS desativados.
