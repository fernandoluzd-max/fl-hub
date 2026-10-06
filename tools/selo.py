# Selo de garantia do Base FL (o mesmo desenho em todas as páginas; a cor vem de cada página, em selo.css).
import math
def selo(dias=7, tam=None):
    r = 128; c = 2 * math.pi * r
    st = f' style="--selo-tam:{tam}px"' if tam else ''
    return (f'<div class="selo-fl" role="img" aria-label="Garantia incondicional de {dias} dias"{st}>'
            f'<svg viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="147"/>'
            f'<path id="selo-c" fill="none" d="M150 150m-{r} 0a{r} {r} 0 1 1 {2*r} 0a{r} {r} 0 1 1 -{2*r} 0"/>'
            f'<text><textPath href="#selo-c" textLength="{c:.0f}" lengthAdjust="spacing">{dias} DIAS · RISCO ZERO · GARANTIA INCONDICIONAL · </textPath></text></svg>'
            f'<div class="selo-disco"><b>{dias}</b><span>DIAS</span></div></div>')
def garantia(dias=7, titulo=None, texto=None, tam=None):
    titulo = titulo or 'Teste por ' + str(dias) + ' dias. Risco zero.'
    texto = texto or 'Usou e não era o que esperava? Peça o reembolso nesse prazo e receba o valor de volta.'
    return (f'<div class="gar-fl">{selo(dias, tam)}<div class="gar-t"><span class="gar-k">Garantia de {dias} dias</span>'
            f'<span class="gar-h">{titulo}</span><p>{texto}</p></div></div>')
LINK = '<link rel="stylesheet" href="/selo.css?v=1">'
