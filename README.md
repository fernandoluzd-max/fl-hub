# Pluga & Edita (repositório fl-hub)

Aplicativo (Mac e Windows) que instala os packs FL direto no CapCut: fontes, predefinições,
pastas organizadas e correção de caminhos — sem o aluno abrir nenhuma pasta.

## Estrutura

| Pasta | O que é |
|---|---|
| `core/` | Toda a lógica de instalação (Rust), com testes que simulam Mac e Windows |
| `app/` | O aplicativo (Tauri): janela, ícones e configuração do instalador |
| `ui/` | A interface (HTML/CSS/JS). Cores da marca em `:root` no topo do `index.html` |
| `tools/build_pack.py` | Gera os pacotes `.flpack` a partir das predefinições |
| `.github/workflows/` | Gera os instaladores de Mac e Windows automaticamente |

## Gerar os instaladores (automático)

1. Cada envio para o GitHub dispara a aba **Actions → "Gerar instaladores do FL Hub"**.
2. Quando terminar (bolinha verde, ~10–15 min), abra a execução e baixe em **Artifacts**:
   - `FL-Hub-mac` → `.dmg` (Mac Intel e Apple Silicon)
   - `FL-Hub-windows` → `.exe` (instala só para o usuário, sem pedir administrador)

## Pacotes (.flpack)

Um `.flpack` é um zip com `manifest.json`, `presets/`, `fonts/`, `fonts-windows/` e `index.json`
(pastas de predefinição). **Não suba pacotes para este repositório** (`/packs` está no `.gitignore`).

```
python3 tools/build_pack.py --id fl-legendas --name "Legendas FL" --version 1.0.0 \
  --presets PASTA/Presets/Combination/Presets --fonts PASTA/Fontes \
  --fonts-windows PASTA/Fontes/so-windows --index indice-pastas.json \
  --substitutes substitutos-windows.txt --out packs/legendas.flpack
```

## Testar a lógica

```
cargo test -p flcore --release     # precisa de packs/legendas.flpack
```

## Próximas versões
- v0.2: painel web + login pelo e-mail de compra (Greenn) + download automático (sem arquivo para o aluno).
- v0.3: marca d'água por comprador, atualizações automáticas do app, demais packs (sons, músicas, B-roll, LUTs).
