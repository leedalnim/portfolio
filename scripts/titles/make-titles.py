# 큰 제목 이미지 만들기: 피그마에서 뽑은 글자 외곽선(figma-nodes.json)에 피그마와 같은 점진 블러를 입혀 site/title/ 에 저장
# 실행: cd scripts/titles && python3 make-titles.py (numpy, scipy, pillow, playwright 필요)
import json, math, re, numpy as np
from scipy.ndimage import gaussian_filter
from PIL import Image
from playwright.sync_api import sync_playwright
nodes=json.load(open('figma-nodes.json'))
keys=['pc-home-1','pc-home-2','pc-projects','pc-about','pc-ask','mo-home-1','mo-home-2','mo-projects','mo-about','mo-ask-1','mo-ask-2']
pos={'pc-home-1':(8,80),'pc-home-2':(730,80),'pc-projects':(8,80),'pc-about':(8,80),'pc-ask':(8,80),
     'mo-home-1':(10,72),'mo-home-2':(10,160),'mo-projects':(10,102),'mo-about':(10,102),'mo-ask-1':(10,72),'mo-ask-2':(10,168)}
meta={}
with sync_playwright() as pw:
  b=pw.chromium.launch()
  for k,n in zip(keys,nodes):
    S=2 if k.startswith('pc') else 3
    r=n['e']['r']; P=math.ceil(1.6*r)
    w,h=n['w'],n['h']; W,H=round((w+2*P)*S),round((h+2*P)*S)
    inner=re.search(r'<svg[^>]*>(.*)</svg>',n['svg']).group(1)
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {w+2*P} {h+2*P}"><g transform="translate({P+n["rbx"]},{P+n["rby"]})">{inner}</g></svg>'
    pg=b.new_page(viewport={'width':W,'height':H})
    pg.set_content(f'<html><body style="margin:0;background:transparent">{svg}</body></html>')
    pg.screenshot(path=f'/tmp/sharp-{k}.png',omit_background=True,clip={'x':0,'y':0,'width':W,'height':H})
    pg.close()
    A=np.asarray(Image.open(f'/tmp/sharp-{k}.png').convert('RGBA'))[...,3].astype(np.float32)/255
    # 점진 블러: 시작점(s)에서 끝점(e) 방향으로 0 → r
    sx,sy=(P+n['e']['s']['x']*w)*S,(P+n['e']['s']['y']*h)*S
    ex,ey=(P+n['e']['en']['x']*w)*S,(P+n['e']['en']['y']*h)*S
    dx,dy=ex-sx,ey-sy
    yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
    t=np.clip(((xx-sx)*dx+(yy-sy)*dy)/(dx*dx+dy*dy),0,1)
    smax=r/2*S; K=24
    levels=[A]+[gaussian_filter(A,smax*i/K) for i in range(1,K+1)]
    f=t*K; i0=np.floor(f).astype(int); i0=np.clip(i0,0,K-1); a=f-i0
    st=np.stack(levels)
    out=np.take_along_axis(st,i0[None],0)[0]*(1-a)+np.take_along_axis(st,(i0+1)[None],0)[0]*a
    rgba=np.zeros((H,W,4),np.uint8); rgba[...,3]=np.clip(out*255+.5,0,255).astype(np.uint8)
    im=Image.fromarray(rgba,'RGBA'); im.save(f'../../site/title/{k}.webp',lossless=True,method=6)
    x,y=pos[k]
    meta[k]={'x':x-P,'y':y-P,'w':w+2*P,'h':h+2*P,'alt':n['chars']}
    print(k,W,H)
  b.close()
json.dump(meta,open('../../site/title/meta.json','w'),ensure_ascii=False,indent=0)
