import * as THREE from 'three';

export function createPlanetMaterial(color: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { baseColor: { value: new THREE.Color(color) }, lightDirection: { value: new THREE.Vector3(-1, 0.3, 0.4).normalize() } },
    vertexShader: `varying vec3 vNormal; varying vec3 vPosition; void main(){vNormal=normalize(normalMatrix*normal);vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `
      uniform vec3 baseColor; uniform vec3 lightDirection; varying vec3 vNormal; varying vec3 vPosition;
      float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      void main(){float n=noise(normalize(vPosition)*7.)*.55+noise(normalize(vPosition)*19.)*.25+noise(normalize(vPosition)*43.)*.12;vec3 col=baseColor*(.45+n*1.15);float ice=smoothstep(.72,.95,abs(normalize(vPosition).y));col=mix(col,vec3(.72,.85,.9),ice*.7);float diffuse=max(dot(vNormal,lightDirection),0.);float rim=pow(1.-max(vNormal.z,0.),2.);gl_FragColor=vec4(col*(.06+diffuse*.95)+baseColor*rim*.035,1.);}`,
  });
}

export function createAtmosphereMaterial(color: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { glowColor: { value: new THREE.Color(color) } },
    vertexShader: `varying vec3 vNormal; varying vec3 vView; void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform vec3 glowColor; varying vec3 vNormal; varying vec3 vView; void main(){float intensity=pow(.72-dot(vNormal,vView),3.2);gl_FragColor=vec4(glowColor,1.)*intensity*.8;}`,
    side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
  });
}

export function createShieldMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, hit: { value: -10 }, hitPoint: { value: new THREE.Vector3(0, 0, 1) }, opacity: { value: 1 } },
    vertexShader: `varying vec3 vNormal;varying vec3 vView;varying vec3 vLocal;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=normalize(-mv.xyz);vLocal=position;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float time;uniform float hit;uniform vec3 hitPoint;uniform float opacity;varying vec3 vNormal;varying vec3 vView;varying vec3 vLocal;void main(){float fres=pow(1.-abs(dot(vNormal,vView)),3.);float age=time-hit;float ring=0.;if(age>0.&&age<1.2){float d=distance(normalize(vLocal),normalize(hitPoint));ring=smoothstep(.06,0.,abs(d-age*.85))*(1.-age/1.2);}float hex=step(.94,sin(vLocal.x*16.+sin(vLocal.y*12.))*sin(vLocal.z*14.));float a=(fres*.16+ring*.9+hex*.025)*opacity;gl_FragColor=vec4(vec3(.18,.85,1.)*(fres+ring*2.+.25),a);}`,
    transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
  });
}

export function createStarMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `varying vec3 vNormal;void main(){vNormal=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float time;varying vec3 vNormal;void main(){float cells=sin(vNormal.x*80.+time)*sin(vNormal.y*73.-time*.7)*sin(vNormal.z*91.);vec3 c=mix(vec3(1.,.22,.025),vec3(1.,.92,.52),cells*.5+.5);gl_FragColor=vec4(c,1.);}`,
  });
}
