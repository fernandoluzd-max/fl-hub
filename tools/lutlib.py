import numpy as np, re
def load(path):
    n=None; dmin=np.zeros(3); dmax=np.ones(3); data=[]
    for l in open(path,encoding='utf-8',errors='ignore'):
        l=l.strip()
        if not l or l.startswith('#'): continue
        u=l.upper()
        if u.startswith('LUT_3D_SIZE'): n=int(l.split()[1]); continue
        if u.startswith('DOMAIN_MIN'): dmin=np.array(list(map(float,l.split()[1:4]))); continue
        if u.startswith('DOMAIN_MAX'): dmax=np.array(list(map(float,l.split()[1:4]))); continue
        if u.startswith(('TITLE','LUT_1D','LUT_3D_INPUT')): continue
        p=l.split()
        if len(p)>=3:
            try: data.append([float(p[0]),float(p[1]),float(p[2])])
            except: pass
    a=np.array(data,dtype=np.float32)
    assert n and len(a)==n**3, (path,n,len(a))
    return a.reshape(n,n,n,3), dmin, dmax  # indexado [b][g][r]
def apply(lut, img):
    L,dmin,dmax=lut; n=L.shape[0]
    x=np.clip((img-dmin)/(dmax-dmin),0,1)*(n-1)
    i0=np.floor(x).astype(int); i1=np.minimum(i0+1,n-1); f=x-i0
    r0,g0,b0=i0[...,0],i0[...,1],i0[...,2]; r1,g1,b1=i1[...,0],i1[...,1],i1[...,2]
    fr,fg,fb=f[...,0:1],f[...,1:2],f[...,2:3]
    c=lambda b,g,r: L[b,g,r]
    c00=c(b0,g0,r0)*(1-fr)+c(b0,g0,r1)*fr; c01=c(b0,g1,r0)*(1-fr)+c(b0,g1,r1)*fr
    c10=c(b1,g0,r0)*(1-fr)+c(b1,g0,r1)*fr; c11=c(b1,g1,r0)*(1-fr)+c(b1,g1,r1)*fr
    c0=c00*(1-fg)+c01*fg; c1=c10*(1-fg)+c11*fg
    return np.clip(c0*(1-fb)+c1*fb,0,1)
