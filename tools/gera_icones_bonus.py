# Gera os ícones das pastas de bônus dos Títulos (mesmo estilo do CaseUp e ChronoCut): SVG 512 -> PNG em ui/icones e icones.
BG='#1c201e'; CR='#f3efe3'; DK='#141615'
def svg(glow, body):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs><radialGradient id="g" cx="50%" cy="50%" r="55%"><stop offset="0" stop-color="{glow}" stop-opacity=".30"/><stop offset=".55" stop-color="{glow}" stop-opacity=".08"/><stop offset="1" stop-color="{glow}" stop-opacity="0"/></radialGradient></defs>
<rect width="512" height="512" fill="{BG}"/><rect width="512" height="512" fill="url(#g)"/>{body}</svg>'''
# 1) antes e depois: moldura creme, metade sem cor / metade colorida, divisor com alça
AC='#F2A541'
antes=svg(AC, f'''
<g transform="translate(256 256) scale(1.18) rotate(-6) translate(-256 -256)">
<rect x="100" y="132" width="312" height="248" rx="30" fill="{CR}"/>
<clipPath id="c"><rect x="120" y="152" width="272" height="208" rx="16"/></clipPath>
<g clip-path="url(#c)">
 <rect x="120" y="152" width="136" height="208" fill="#2e3230"/>
 <circle cx="196" cy="208" r="20" fill="#6b6f6c"/>
 <path d="M120 360 L190 268 L232 316 L256 292 L256 360Z" fill="#555955"/>
 <rect x="256" y="152" width="136" height="208" fill="#3a2a1c"/>
 <circle cx="336" cy="208" r="22" fill="{AC}"/>
 <path d="M256 360 L256 292 L282 262 L330 320 L362 286 L392 330 L392 360Z" fill="#FF7A59"/>
</g>
<rect x="249" y="140" width="14" height="232" rx="7" fill="{CR}"/>
<circle cx="256" cy="256" r="30" fill="{CR}"/>
<path d="M243 244 L231 256 L243 268 M269 244 L281 256 L269 268" stroke="{DK}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</g>''')
# 2) overlays e texturas: três camadas empilhadas (textura de grão, vazamento de luz, creme)
AC2='#B45CFF'
over=svg(AC2, f'''
<defs><linearGradient id="lk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB347"/><stop offset=".5" stop-color="#FF6FAE"/><stop offset="1" stop-color="{AC2}"/></linearGradient>
<pattern id="gr" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="5" cy="6" r="3" fill="{DK}" opacity=".55"/><circle cx="16" cy="15" r="2.4" fill="{DK}" opacity=".45"/><circle cx="14" cy="4" r="1.6" fill="{DK}" opacity=".4"/></pattern></defs>
<g transform="rotate(-10 256 256)">
 <rect x="150" y="104" width="230" height="230" rx="30" fill="#3d3443" stroke="{DK}" stroke-width="10"/>
 <rect x="150" y="104" width="230" height="230" rx="30" fill="url(#gr)"/>
 <rect x="132" y="146" width="230" height="230" rx="30" fill="url(#lk)" stroke="{DK}" stroke-width="10"/>
 <rect x="114" y="188" width="230" height="230" rx="30" fill="{CR}" stroke="{DK}" stroke-width="10"/>
 <rect x="114" y="188" width="230" height="230" rx="30" fill="url(#gr)" opacity=".35"/>
 <path d="M150 380 L214 300 L252 344 L280 316 L318 380" fill="none" stroke="{DK}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>
</g>''')
# 3) músicas: disco de vinil + nota musical
AC3='#7FCE8F'
mus=svg(AC3, f'''
<circle cx="230" cy="276" r="150" fill="{DK}" stroke="{CR}" stroke-width="16"/>
<circle cx="230" cy="276" r="112" fill="none" stroke="#2c302e" stroke-width="6"/>
<circle cx="230" cy="276" r="86" fill="none" stroke="#2c302e" stroke-width="6"/>
<circle cx="230" cy="276" r="54" fill="{AC3}"/>
<circle cx="230" cy="276" r="12" fill="{DK}"/>
<path d="M150 200 A112 112 0 0 1 206 168" stroke="{CR}" stroke-opacity=".5" stroke-width="8" fill="none" stroke-linecap="round"/>
<g transform="translate(300 96)">
 <rect x="74" y="0" width="22" height="176" rx="11" fill="{CR}" stroke="{DK}" stroke-width="8" paint-order="stroke"/>
 <path d="M85 4 C120 14 150 40 140 86 C132 60 112 50 92 46Z" fill="{CR}" stroke="{DK}" stroke-width="8" stroke-linejoin="round" paint-order="stroke"/>
 <ellipse cx="56" cy="176" rx="46" ry="36" transform="rotate(-20 56 176)" fill="{CR}" stroke="{DK}" stroke-width="10"/>
</g>''')
for n,s in [('bonus-antes',antes),('bonus-overlays',over),('bonus-musicas',mus)]: open(n+'.svg','w').write(s)
