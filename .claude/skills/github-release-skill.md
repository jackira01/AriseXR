
# Skill: GitHub Release & Versioning Manager

## Context & Purpose
This skill instructs the AI agent on how to manage semantic versioning (SemVer), Git tagging, and GitHub Releases based on natural language commands from the user regarding software lifecycle states.

---

## 1. Intent Mapping Matrix

Map the user's natural language request to the appropriate version type, SemVer format, Git commands, and flags:

| User Intent / Phrases | Version Type | SemVer Format | Git / GitHub CLI Action | Flags |
| :--- | :--- | :--- | :--- | :--- |
| "Primer versión funcional, usable pero sujeta a fallos", "Lanza una beta", "Versión para pruebas con usuarios" | **Beta (Pre-release)** | `v1.0.0-beta.1` | `gh release create v1.0.0-beta.1` | `--prerelease` |
| "Versión inestable", "Avances iniciales", "Prototipo de desarrollo" | **Alpha (Pre-release)** | `v0.1.0-alpha.1` | `gh release create v0.1.0-alpha.1` | `--prerelease` |
| "Candidata a lanzamiento", "Versión casi lista para producción" | **Release Candidate** | `v1.0.0-rc.1` | `gh release create v1.0.0-rc.1` | `--prerelease` |
| "Lanza la versión oficial", "Versión estable", "Lanzamiento a producción" | **Stable Major/Minor** | `v1.0.0` | `gh release create v1.0.0` | None (Public) |
| "Corrección de errores", "Parche de seguridad", "Fix rápido" | **Patch Release** | `v1.0.1` | `gh release create v1.0.1` | None (Public) |

---

## 2. Execution Workflow

When the user requests a release:

### Step 1: Determine the Next Version
1. Inspect existing tags via `git tag -l` or `gh release list`.
2. Infer the target version number using SemVer (`MAJOR.MINOR.PATCH[-PRERELEASE]`).
3. If no prior tags exist and the request implies an initial functional/usable test build, default to `v1.0.0-beta.1`.

### Step 2: Prepare Release Notes
Categorize recent commits or changes into a clean Markdown structure:
- `🚀 Features / Novedades`
- `🐛 Bug Fixes / Correcciones`
- `🔧 Maintenance & Refactoring / Ajustes Internos`

### Step 3: Execute Release Creation
Run the commands via local Git CLI or GitHub CLI (`gh`):

```bash
# Option A: Using GitHub CLI (Preferred)
gh release create <TAG_NAME> \
  --title "<TAG_NAME> - <RELEASE_TITLE>" \
  --notes "<RELEASE_NOTES_BODY>" \
  [--prerelease]

# Option B: Standard Git Tag (Fallback if gh CLI is unavailable)
git tag -a <TAG_NAME> -m "<TAG_NAME>: <SHORT_SUMMARY>"
git push origin <TAG_NAME>

```

---

## 3. Standard Release Notes Template

Use the following Markdown structure when generating release notes:

```markdown
## 🚀 Release <TAG_NAME>

<SHORT_SUMMARY_OF_RELEASE>

### ✨ What's New
- <Feature 1 description>
- <Feature 2 description>

### 🐛 Bug Fixes & Improvements
- <Fix 1 description>
- <Fix 2 description>

---
> ⚠️ **Notice**: Pre-release version intended for testing. Edge cases or minor bugs may still occur.

```

---

## 4. Execution Examples

### Example 1: User says "Lanza la primer versión funcional, usable pero sujeta a fallos en pruebas con usuarios reales"

* **Inferred Tag**: `v1.0.0-beta.1`
* **Is Pre-release?**: Yes (`--prerelease`)
* **Executed Command**:
```bash
gh release create v1.0.0-beta.1 --title "v1.0.0-beta.1 (Beta Release)" --notes "## 🚀 Versión Beta de Pruebas\n\nEsta versión contiene la funcionalidad base del sistema para validación en entornos reales.\n\n### ✨ Características\n- Flujo de autenticación e inicialización.\n- Gestión de datos en entorno standalone.\n\n> ⚠️ Versión sujeta a pruebas y retroalimentación de errores." --prerelease

```



### Example 2: User says "Lanza un parche corrigiendo el error del CSS"

* **Inferred Tag**: `v1.0.1` (Assuming current stable is `v1.0.0`)
* **Is Pre-release?**: No
* **Executed Command**:
```bash
gh release create v1.0.1 --title "v1.0.1 - Fix de assets estáticos" --generate-notes

```



```

```