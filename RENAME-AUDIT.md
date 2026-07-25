# Auditoría de renombrado de usuario de GitHub

**Cambio:** `HombreFeliz` → `polmarza`
**Repositorio:** `localwhisper-app`
**Modo:** solo lectura (este archivo es el único creado; no se modificó nada existente)
**Fecha:** 2026-07-25

## Resultado en una frase

**El usuario `HombreFeliz` NO aparece en ningún archivo versionado del repo.** Todo lo que toca
GitHub usa la variable dinámica `${{ github.repository }}` o dominios propios
(`releases.localwhisper.app`). El único apunte real es el *remote* de git (que además redirige), y
un puñado de comprobaciones que hay que hacer **fuera** del repo.

---

## Tabla de hallazgos

| Archivo | Línea | Contenido actual | ¿Redirige o rompe? | Acción requerida |
|---|---|---|---|---|
| `.git/config` (no versionado) | 9 | `url = http://local_proxy@127.0.0.1:41729/git/HombreFeliz/localwhisper-app` | **Redirige** (git sigue el redirect de GitHub tras el rename). Además, este es el remote del *proxy de sesión*, no tu `github.com` real. | Actualizar el remote en tus clones reales con `git remote set-url` (ver script). |
| `.github/workflows/release.yml` | 138 | `gh release download "…" -R ${{ github.repository }}` | **No rompe** — variable dinámica, se resuelve al owner nuevo automáticamente. | Ninguna. |
| `.github/workflows/release.yml` | resto | `uses: actions/checkout@v4`, `pnpm/action-setup@v3`, `tauri-apps/tauri-action@v0`, etc. | **No rompe** — todas son actions de terceros, ninguna referencia a tu usuario. | Ninguna. |
| `src-tauri/tauri.conf.json` | 68 | endpoint updater `https://releases.localwhisper.app/updates/stable.json` | **No rompe** — dominio propio en R2, independiente del usuario de GitHub. | Ninguna. |
| `src-tauri/tauri.conf.json` | 70 | `pubkey` (minisign) | **No rompe** — clave de firma, sin relación con GitHub. | Ninguna. |
| `src-tauri/src/updater.rs` | 11 | comentario: «la privada vive como secreto de GitHub y firma…» | **No rompe** — menciona "GitHub" genérico, sin el usuario. | Ninguna (cosmético opcional). |
| `src-tauri/Cargo.lock` | varias | `source = "registry+https://github.com/rust-lang/crates.io-index"` | **No rompe** — es el registro oficial de crates, ajeno a tu usuario. | Ninguna. |
| `src/onboarding/DictionaryStarter.tsx` | 14 | entrada de diccionario `"github punto com" → "github.com"` | **No rompe** — ejemplo del diccionario de dictado, sin relación con el usuario. | Ninguna. |
| `package.json` | — | *(sin campos `repository`, `bugs`, `homepage`, `author`)* | **No rompe** — no existen esos campos. | Ninguna. |

### Ficheros del checklist que NO existen en este repo (por tanto, nada que romper)
`README*`, `.github/CODEOWNERS`, `.github/FUNDING.yml`, `.github/ISSUE_TEMPLATE/*`,
`PULL_REQUEST_TEMPLATE`, `.github/dependabot.yml`, `CNAME`, `.gitmodules`, `.mcp.json`, `.claude/`,
`go.mod`, `pyproject.toml`/`setup.py`, `composer.json`, `Gemfile`, `requirements.txt`, dependencias
git en `Cargo.toml`, `Dockerfile`/`compose`, Terraform/Pulumi/IaC, taps/formulae de Homebrew,
`docusaurus.config`/`mkdocs.yml`/`next.config`, badges (shields/codecov), URLs
`raw.githubusercontent.com/HombreFeliz/…`, imágenes `ghcr.io/HombreFeliz/…`, gists.
**Ninguno presente.**

---

## CRÍTICO (rompe sin redirección)

**Nada dentro del repositorio.**

No hay URLs `raw.githubusercontent.com/HombreFeliz/…`, ni `go.mod`, ni imágenes `ghcr.io`, ni
`CODEOWNERS`, ni GitHub Pages/CNAME, ni gists referenciados en el árbol versionado. La única
referencia al owner (`.git/config`) **sí redirige**, así que ni siquiera eso es crítico.

> ⚠️ El único riesgo "crítico" real vive **fuera del repo**: los enlaces de descarga dentro del
> manifiesto del updater **ya publicado en R2** (`updates/stable.json`, `latest.json`) apuntan a
> `github.com/HombreFeliz/localwhisper-app/releases/…`. Las URLs de *release assets* **redirigen**
> tras el rename, así que las apps ya instaladas seguirán actualizándose; aun así conviéntelo en la
> sección de verificación manual.

## COSMÉTICO (sigue funcionando por redirección, conviene actualizar)

1. **`.git/config` — remote de git.** Tras el rename, `git fetch`/`push` al remote antiguo siguen
   funcionando por el redirect de GitHub, pero lo limpio es actualizar la URL en cada clon local.
   (Ojo: el remote que ves en esta sesión es el del proxy; el que debes cambiar es el de tu máquina.)
2. **`src-tauri/src/updater.rs:11`** — comentario que menciona "GitHub". No incluye el usuario, no
   requiere cambio; solo si quieres pulcritud absoluta.

---

## VERIFICAR A MANO (fuera del alcance de este repo)

1. **Remotes de git en todos tus clones** (esta máquina, portátil, CI). Actualiza cada uno:
   `git remote set-url origin git@github.com:polmarza/localwhisper-app.git`.
2. **Repo de la landing (`localwhisper-landing`, el de Astro en Vercel).** Es un repo **aparte** que
   también era de `HombreFeliz`. Pásale esta misma auditoría y revisa su remote. Es el candidato más
   probable a tener enlaces `github.com/HombreFeliz/…` en su footer, `astro.config`, o metadatos.
3. **Vercel ↔ GitHub.** El proyecto de la landing está conectado a un repo de GitHub. Tras renombrar
   el usuario, comprueba en Vercel → Project → Settings → Git que el repositorio conectado sigue
   resuelto correctamente (la integración por GitHub App suele re-vincular sola, pero verifícalo y
   fuerza un redeploy de prueba).
4. **Manifiestos del updater en R2** (`releases.localwhisper.app/updates/stable.json` y
   `preview.json`, y `/latest/`). Sus URLs de descarga apuntan a los *releases* del owner antiguo.
   **Redirigen**, pero: (a) confirma que un update desde una instalación vieja sigue funcionando;
   (b) el próximo release regenerará el manifiesto con el owner nuevo automáticamente (usa
   `${{ github.repository }}`), así que se corrige solo al publicar la siguiente versión.
5. **GitHub Pages / CNAME** en cualquiera de tus repos (este no usa Pages). Si algún repo tuyo sirve
   Pages con dominio propio, revisa el `CNAME`.
6. **Squatting del usuario antiguo.** En cuanto renombres, `HombreFeliz` queda **libre** y cualquiera
   puede reclamarlo — y con ello controlar el redirect de tus URLs antiguas. Considera **crear una
   cuenta placeholder** con el nombre viejo (o al menos ser consciente del riesgo para enlaces ya
   compartidos en LinkedIn, YouTube, prensa, etc.).
7. **Enlaces a tu perfil/repos** publicados fuera: footer de la landing, bio de LinkedIn/X/YouTube,
   los correos de outreach a creadores, README de otros proyectos. `raw.githubusercontent.com/…` y
   los enlaces a *avatar* **no redirigen** — si los usaste en algún sitio, se rompen.
8. **Gists** bajo tu cuenta (las URLs de gist incluyen el usuario y **no redirigen** de forma fiable).
9. **Secretos del repo** (`APPLE_*`, `TAURI_SIGNING_*`, `R2_*`, `GITHUB_TOKEN`). El rename **no** los
   afecta (son por-repositorio, y el repo se mueve entero con su config). No hay acción, solo confírmalo.
10. **Forks/estrellas/webhooks** externos y cualquier CI de terceros que apunte a `HombreFeliz/repo`.

---

## Script que aplicaría todos los cambios (NO ejecutado)

En el árbol versionado **no hay ninguna ocurrencia de `HombreFeliz`**, así que no hay `sed` que
aplicar a los archivos. El único cambio real es el remote de git, que se hace por clon:

```bash
# 1) Actualizar el remote de git en CADA clon local (elige https o ssh según uses):
git remote set-url origin git@github.com:polmarza/localwhisper-app.git
#   o:  git remote set-url origin https://github.com/polmarza/localwhisper-app.git
git remote -v   # verificar

# 2) (Defensivo) Reemplazo en archivos versionados por si algo apareciera en el futuro.
#    HOY no coincide con nada; se incluye por completitud. Excluye binarios/.git/node_modules.
grep -rIl --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=target \
     'HombreFeliz' . \
  | xargs -r sed -i 's/HombreFeliz/polmarza/g'

# 3) Verificación final: no debe quedar ninguna ocurrencia en el árbol versionado.
git grep -in 'hombrefeliz' || echo "OK: sin ocurrencias versionadas"
```

> Nota: el paso 2 NO tocaría `.git/config` (no es un archivo versionado y `grep` excluye `.git/`),
> por eso el remote se cambia aparte en el paso 1.

---

## Resumen

**Archivos versionados afectados: 0.** No hay nada crítico dentro del repo (todo redirige o usa
variables dinámicas / dominios propios); las únicas acciones son el `git remote set-url` local y las
comprobaciones externas — sobre todo el **repo de la landing**, la **conexión de Vercel** y reclamar/
vigilar el **usuario antiguo** para que nadie lo ocupe.
