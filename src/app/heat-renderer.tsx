import * as React from "react";

import {
  createToolcraftPngExportCanvas,
  getToolcraftVideoExportSize,
  shouldIncludeToolcraftExportBackground,
  shouldIncludeToolcraftPreviewBackground,
  type ToolcraftMediaAsset,
  type ToolcraftMediaTransform,
  type ToolcraftState,
} from "@/toolcraft/runtime";
import { useToolcraft } from "@/toolcraft/runtime/react";

type ThermalSettings = { background: string; baseBlur: number; bloom: number; colorBleed: number; contrast: number; detail: number; dotAmount: number; dotColor: string; dotDensity: number; dotEvenness: number; dotSize: number; dotThreshold: number; grain: number; heat: number; mode: string; pathAngle: number; pathBlur: number; scanlines: number };
type ThermalSource = HTMLImageElement | HTMLVideoElement;

const vertexSource = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`;

const fragmentSource = `#version 300 es
precision highp float;
uniform sampler2D u_image;
uniform vec2 u_source;
uniform vec2 u_output;
uniform vec4 u_effect;
uniform vec4 u_dots;
uniform float u_dotAmount;
uniform float u_dotEvenness;
uniform float u_bloom;
uniform vec3 u_dotColor;
uniform vec3 u_background;
uniform vec3 u_base;
uniform float u_colorBleed;
uniform float u_time;
uniform vec3 u_transform;
in vec2 v_uv;
out vec4 outColor;
float lum(vec3 c){return dot(c,vec3(.299,.587,.114));}
float noise(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float sensorNoise(vec2 p){return noise(p+vec2(u_time*91.7,u_time*47.3));}
vec2 coverUv(vec2 uv){
  float sa=u_source.x/u_source.y, oa=u_output.x/u_output.y;
  if(sa>oa){float w=oa/sa;uv.x=(uv.x-.5)*w+.5;}else{float h=sa/oa;uv.y=(uv.y-.5)*h+.5;}
  if(u_transform.z>.5) uv.x=1.-uv.x;
  if(u_transform.z<-.5) uv.y=1.-uv.y;
  int r=int(u_transform.x+.5); if(r==1)uv=vec2(uv.y,1.-uv.x);else if(r==2)uv=1.-uv;else if(r==3)uv=vec2(1.-uv.y,uv.x);
  return uv;
}
void main(){
  vec2 uv=coverUv(v_uv);
  vec4 src=texture(u_image,uv);
  vec2 px=1./u_source;
  float blurRadius=u_base.x*6.;
  vec3 soft=(src.rgb+texture(u_image,uv+vec2(px.x*blurRadius,0.)).rgb+texture(u_image,uv-vec2(px.x*blurRadius,0.)).rgb+texture(u_image,uv+vec2(0.,px.y*blurRadius)).rgb+texture(u_image,uv-vec2(0.,px.y*blurRadius)).rgb)/5.;
  float angle=u_base.z*3.14159265;
  vec2 pathVector=vec2(cos(angle)*px.x,sin(angle)*px.y)*u_base.y*22.;
  vec3 trail=(src.rgb+texture(u_image,uv-pathVector*.33).rgb+texture(u_image,uv-pathVector*.66).rgb+texture(u_image,uv-pathVector).rgb)/4.;
  vec3 baseRgb=mix(src.rgb,soft,u_base.x);
  baseRgb=mix(baseRgb,trail,u_base.y);
  float l=lum(baseRgb);
  float gx=lum(texture(u_image,uv+vec2(px.x,0.)).rgb)-lum(texture(u_image,uv-vec2(px.x,0.)).rgb);
  float gy=lum(texture(u_image,uv+vec2(0.,px.y)).rgb)-lum(texture(u_image,uv-vec2(0.,px.y)).rgb);
  float edge=length(vec2(gx,gy));
  float heat=u_effect.x, contrast=u_effect.y, detail=u_effect.z, grain=u_effect.w;
  float thermal=mix(l,1.-l,heat);
  thermal=(thermal-.5)*(1.+contrast*2.4)+.5;
  thermal=smoothstep(.08,.92,thermal)+edge*detail*4.5;
  thermal+=(sensorNoise(gl_FragCoord.xy)-.5)*grain*.34;
  float lines=(sin(gl_FragCoord.y*3.14159)+1.)*.5;
  thermal-=lines*${"u_scan"};
  thermal=clamp(thermal,0.,1.);
  if(u_dots.x>.5){
    float cell=mix(38.,5.,u_dots.y);
    vec2 cellId=floor(gl_FragCoord.xy/cell);
    float radius=mix(1.,cell*.42,u_dots.w);
    float marker=0.;
    float halo=0.;
    for(int ox=-1;ox<=1;ox++){
      for(int oy=-1;oy<=1;oy++){
        vec2 candidateId=cellId+vec2(float(ox),float(oy));
        vec2 randomOffset=vec2(noise(candidateId+vec2(17.1,3.7)),noise(candidateId+vec2(8.3,29.4)));
        vec2 gentleOffset=vec2(.5)+vec2(noise(candidateId+vec2(43.7,5.2))-.5,noise(candidateId+vec2(2.9,61.4))-.5)*.18;
        vec2 jitter=mix(randomOffset,gentleOffset,u_dotEvenness);
        vec2 cellCenter=(candidateId+.12+jitter*.76)*cell;
        vec2 cuv=coverUv(cellCenter/u_output);
        float cgx=lum(texture(u_image,cuv+vec2(px.x,0.)).rgb)-lum(texture(u_image,cuv-vec2(px.x,0.)).rgb);
        float cgy=lum(texture(u_image,cuv+vec2(0.,px.y)).rgb)-lum(texture(u_image,cuv-vec2(0.,px.y)).rgb);
        float edgeGate=mix(.18,.002,u_dotAmount)*mix(.35,1.45,u_dots.z);
        float strong=smoothstep(edgeGate,edgeGate+.035,length(vec2(cgx,cgy)));
        float accepted=step(noise(candidateId+vec2(71.2,11.9)),mix(.12,1.,u_dotAmount));
        float distanceToDot=length(gl_FragCoord.xy-cellCenter);
        marker=max(marker,strong*accepted*(1.-smoothstep(radius-1.,radius,distanceToDot)));
        halo=max(halo,strong*accepted*(1.-smoothstep(radius,radius*4.,distanceToDot))*u_bloom*.7);
      }
    }
    float haze=(lum(soft)+lum(trail))*.5;
    float base=clamp(l*.38+haze*u_bloom*.22+(sensorNoise(gl_FragCoord.xy)-.5)*grain*.62,0.,1.);
    vec3 shadowBase=mix(u_background,vec3(base),.58+base*.42);
    shadowBase=mix(shadowBase,baseRgb,u_colorBleed);
    vec3 dotted=mix(shadowBase,u_dotColor,clamp(marker+halo,0.,1.));
    outColor=vec4(dotted,src.a);
  }else{
    vec3 thermalColor=mix(u_background,vec3(thermal),.6+thermal*.4);
    thermalColor=mix(thermalColor,baseRgb,u_colorBleed);
    outColor=vec4(thermalColor,src.a);
  }
}`.replace("u_scan", "0.0");

function numberValue(value: unknown, fallback: number): number { const n=Number(value); return Number.isFinite(n)?Math.max(0,Math.min(100,n))/100:fallback; }
function stringValue(value: unknown, fallback: string): string { return typeof value === "string" ? value : fallback; }
function colorValue(value: unknown, fallback: string): string { if(typeof value==="string")return value; if(value&&typeof value==="object"&&"hex" in value&&typeof (value as {hex?:unknown}).hex==="string")return (value as {hex:string}).hex; return fallback; }
function hexRgb(value:string):[number,number,number]{const hex=value.replace("#","");return [0,2,4].map((i)=>{const parsed=parseInt(hex.slice(i,i+2),16);return Number.isFinite(parsed)?parsed/255:0;}) as [number,number,number];}
function getSettings(state: ToolcraftState): ThermalSettings { return { background:colorValue(state.values["scene.background"],"#050706"), baseBlur:numberValue(state.values["base.blur"],0), bloom:numberValue(state.values["thermal.bloom"],.42), colorBleed:numberValue(state.values["base.colorBleed"],0), heat:numberValue(state.values["thermal.heat"],.62), contrast:numberValue(state.values["thermal.contrast"],.72), detail:numberValue(state.values["thermal.detail"],.58), dotAmount:numberValue(state.values["dots.amount"],.64), dotColor:colorValue(state.values["dots.color"],"#FF5A24"), dotDensity:numberValue(state.values["dots.density"],.52), dotEvenness:numberValue(state.values["dots.evenness"],.42), dotSize:numberValue(state.values["dots.size"],.42), dotThreshold:numberValue(state.values["dots.threshold"],.38), grain:numberValue(state.values["thermal.grain"],.38), mode:stringValue(state.values["effect.mode"],"thermal"), pathAngle:(Number(state.values["base.pathAngle"])||0)/180, pathBlur:numberValue(state.values["base.pathBlur"],0), scanlines:numberValue(state.values["thermal.scanlines"],.22) }; }
function getSource(state: ToolcraftState): ToolcraftMediaAsset | null { const target=stringValue(state.values["source.kind"],"image")==="video"?"source.video":"source.image";return state.mediaAssets.find((asset)=>asset.sourceTarget===target)??null; }
function isVideoSource(source:ToolcraftMediaAsset|null):boolean{return source?.sourceTarget==="source.video";}

function loadImage(url:string):Promise<HTMLImageElement>{return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error("Unable to decode source image."));image.src=url;});}
function loadVideo(url:string):Promise<HTMLVideoElement>{return new Promise((resolve,reject)=>{const video=document.createElement("video");video.muted=true;video.playsInline=true;video.preload="auto";video.onloadeddata=()=>resolve(video);video.onerror=()=>reject(new Error("Unable to decode source video."));video.src=url;video.load();});}
function sourceSize(source:ThermalSource):{width:number;height:number}{return source instanceof HTMLVideoElement?{width:source.videoWidth,height:source.videoHeight}:{width:source.naturalWidth,height:source.naturalHeight};}
function compile(gl:WebGL2RenderingContext,type:number,source:string){const shader=gl.createShader(type);if(!shader)throw new Error("Unable to create shader.");gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader)??"Shader compilation failed.");return shader;}

function renderThermal(canvas:HTMLCanvasElement,image:ThermalSource,settings:ThermalSettings,transform:ToolcraftMediaTransform|undefined,includeBackground:boolean,timeSeconds=0):void{
  const gl=canvas.getContext("webgl2",{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true});if(!gl)throw new Error("WebGL 2 is required for thermal rendering.");
  const scanFragment=fragmentSource
    .replace("thermal-=lines*0.0;",`thermal-=lines*${(settings.scanlines*.12).toFixed(5)};`)
    .replace("if(u_dots.x>.5)",settings.mode==="dots"?"if(true)":"if(false)");
  const program=gl.createProgram();if(!program)throw new Error("Unable to create shader program.");
  gl.attachShader(program,compile(gl,gl.VERTEX_SHADER,vertexSource));gl.attachShader(program,compile(gl,gl.FRAGMENT_SHADER,scanFragment));gl.linkProgram(program);gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,"a_position");gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
  const bg=hexRgb(settings.background);gl.clearColor(bg[0],bg[1],bg[2],includeBackground?1:0);gl.clear(gl.COLOR_BUFFER_BIT);
  const dimensions=sourceSize(image);gl.uniform2f(gl.getUniformLocation(program,"u_source"),dimensions.width,dimensions.height);gl.uniform2f(gl.getUniformLocation(program,"u_output"),canvas.width,canvas.height);gl.uniform4f(gl.getUniformLocation(program,"u_effect"),settings.heat,settings.contrast,settings.detail,settings.grain);gl.uniform1f(gl.getUniformLocation(program,"u_colorBleed"),settings.colorBleed);gl.uniform1f(gl.getUniformLocation(program,"u_time"),image instanceof HTMLVideoElement?timeSeconds:0);
  const dotRgb=hexRgb(settings.dotColor);gl.uniform4f(gl.getUniformLocation(program,"u_dots"),settings.mode==="dots"?1:0,settings.dotDensity,settings.dotThreshold,settings.dotSize);gl.uniform1f(gl.getUniformLocation(program,"u_dotAmount"),settings.dotAmount);gl.uniform1f(gl.getUniformLocation(program,"u_dotEvenness"),settings.dotEvenness);gl.uniform1f(gl.getUniformLocation(program,"u_bloom"),settings.bloom);gl.uniform3f(gl.getUniformLocation(program,"u_dotColor"),dotRgb[0],dotRgb[1],dotRgb[2]);gl.uniform3f(gl.getUniformLocation(program,"u_background"),bg[0],bg[1],bg[2]);gl.uniform3f(gl.getUniformLocation(program,"u_base"),settings.baseBlur,settings.pathBlur,settings.pathAngle);
  const rotation=((transform?.rotationDeg??0)/90)%4;const flip=(transform?.flipHorizontal?1:0)+(transform?.flipVertical?-1:0);gl.uniform3f(gl.getUniformLocation(program,"u_transform"),rotation,0,flip);gl.viewport(0,0,canvas.width,canvas.height);gl.drawArrays(gl.TRIANGLES,0,6);
  gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);
}

function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

export async function exportThermalPng(state:ToolcraftState):Promise<Blob>{
  const source=getSource(state);if(!source)throw new Error("Paste or upload media before exporting.");const image:ThermalSource=isVideoSource(source)?await loadVideo(source.dataUrl):await loadImage(source.dataUrl);if(image instanceof HTMLVideoElement){image.currentTime=Math.min(image.duration||0,(state.timeline.currentTimeSeconds/Math.max(.001,state.timeline.durationSeconds))*(image.duration||0));await new Promise<void>((resolve)=>image.addEventListener("seeked",()=>resolve(),{once:true}));}const settings=getSettings(state);const format=stringValue(state.values["export.image.format"],"png");
  const output=createToolcraftPngExportCanvas({background:settings.background,includeBackground:Boolean(state.values["export.includeBackground"]),resolution:state.values["export.image.resolution"] as string,state,render:({context,cssHeight,cssWidth,pixelRatio})=>{const frame=document.createElement("canvas");frame.width=Math.round(cssWidth*pixelRatio);frame.height=Math.round(cssHeight*pixelRatio);renderThermal(frame,image,settings,source.transform,Boolean(state.values["export.includeBackground"]),state.timeline.currentTimeSeconds);context.drawImage(frame,0,0,cssWidth,cssHeight);}});
  const mime=format==="jpg"?"image/jpeg":"image/png";const blob=await new Promise<Blob>((resolve,reject)=>output.toBlob((value)=>value?resolve(value):reject(new Error("Image export failed.")),mime,.94));downloadBlob(blob,`thermal-vision.${format==="jpg"?"jpg":"png"}`);return blob;
}

function preferredVideoMime(format:string):string{const mp4=["video/mp4;codecs=avc1.42E01E","video/mp4"];const webm=["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"];return (format==="mp4"?[...mp4,...webm]:[...webm,...mp4]).find((type)=>MediaRecorder.isTypeSupported(type))??"video/webm";}
const wait=(ms:number)=>new Promise<void>((resolve)=>window.setTimeout(resolve,ms));
export async function exportThermalVideo(state:ToolcraftState,reportProgress:(progress:number)=>void):Promise<Blob>{const source=getSource(state);if(!source)throw new Error("Paste or upload media before exporting.");const media:ThermalSource=isVideoSource(source)?await loadVideo(source.dataUrl):await loadImage(source.dataUrl);const settings=getSettings(state);const size=getToolcraftVideoExportSize({resolution:state.values["export.video.resolution"] as string,state});const canvas=document.createElement("canvas");canvas.width=size.width;canvas.height=size.height;const includeBackground=shouldIncludeToolcraftExportBackground({format:"video",schema:state.schema});const fps=30;const duration=Math.max(1,state.timeline.durationSeconds);const stream=canvas.captureStream(fps);const mimeType=preferredVideoMime(stringValue(state.values["export.video.format"],"mp4"));const recorder=new MediaRecorder(stream,{mimeType});const chunks:Blob[]=[];const complete=new Promise<Blob>((resolve,reject)=>{recorder.ondataavailable=(event)=>{if(event.data.size)chunks.push(event.data);};recorder.onerror=()=>reject(new Error("Video export failed."));recorder.onstop=()=>chunks.length?resolve(new Blob(chunks,{type:mimeType})):reject(new Error("Video export produced no bytes."));});recorder.start();const started=performance.now();while(true){const elapsed=(performance.now()-started)/1000;const progress=Math.min(1,elapsed/duration);if(media instanceof HTMLVideoElement&&media.duration){media.currentTime=progress*media.duration;}renderThermal(canvas,media,settings,source.transform,includeBackground,progress*duration);(stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack|undefined)?.requestFrame?.();reportProgress(progress);if(progress>=1)break;await wait(1000/fps);}recorder.stop();const blob=await complete;stream.getTracks().forEach((track)=>track.stop());const extension=mimeType.includes("mp4")?"mp4":"webm";downloadBlob(blob,`thermal-vision.${extension}`);return blob;}

async function fileToAsset(file:File){const dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);});if(file.type.startsWith("video/")){const video=await loadVideo(dataUrl);return {assetKind:"file" as const,dataUrl,fileName:file.name||"pasted-video.mp4",mimeType:file.type||"video/mp4",position:{x:0,y:0},size:{height:video.videoHeight,unit:"px" as const,width:video.videoWidth},sourceTarget:"source.video"};}const bitmap=await createImageBitmap(file);const size={height:bitmap.height,unit:"px" as const,width:bitmap.width};bitmap.close();return {assetKind:"image" as const,dataUrl,fileName:file.name||"pasted-image.png",mimeType:file.type||"image/png",position:{x:0,y:0},size,sourceTarget:"source.image"};}

export function ThermalVisionRenderer():React.JSX.Element|null{
  const {dispatch,state}=useToolcraft();const source=getSource(state);const canvasRef=React.useRef<HTMLCanvasElement|null>(null);const [image,setImage]=React.useState<ThermalSource|null>(null);const settings=getSettings(state);const includeBackground=shouldIncludeToolcraftPreviewBackground({state});const renderScale=Math.max(1,Math.min(2,Number(state.values["canvas.renderScale"])||1));
  React.useEffect(()=>{const onPaste=(event:ClipboardEvent)=>{const file=[...(event.clipboardData?.files??[])].find((item)=>item.type.startsWith("image/")||item.type.startsWith("video/"));if(!file)return;event.preventDefault();void fileToAsset(file).then((asset)=>{dispatch({target:"source.kind",type:"controls.setValue",value:asset.sourceTarget==="source.video"?"video":"image"});dispatch({asset,replaceExisting:true,type:"media.import"});dispatch({size:asset.size,type:"canvas.setSize"});});};document.addEventListener("paste",onPaste);return()=>document.removeEventListener("paste",onPaste);},[dispatch]);
  React.useEffect(()=>{let cancelled=false;if(!source){setImage(null);return;}void (isVideoSource(source)?loadVideo(source.dataUrl):loadImage(source.dataUrl)).then((next)=>{if(cancelled)return;setImage(next);const dimensions=sourceSize(next);dispatch({size:{height:dimensions.height,unit:"px",width:dimensions.width},type:"canvas.setSize"});});return()=>{cancelled=true;};},[dispatch,source?.dataUrl,source?.sourceTarget]);
  React.useEffect(()=>{if(!(image instanceof HTMLVideoElement))return;const target=(state.timeline.currentTimeSeconds/Math.max(.001,state.timeline.durationSeconds))*(image.duration||0);if(Number.isFinite(target)&&Math.abs(image.currentTime-target)>.04)image.currentTime=target;if(state.timeline.isPlaying)void image.play().catch(()=>undefined);else image.pause();},[image,state.timeline.currentTimeSeconds,state.timeline.durationSeconds,state.timeline.isPlaying]);
  React.useEffect(()=>{const canvas=canvasRef.current;if(!canvas)return;canvas.width=Math.round(state.canvas.size.width*renderScale);canvas.height=Math.round(state.canvas.size.height*renderScale);if(!image){const gl=canvas.getContext("webgl2",{alpha:true});gl?.clearColor(0,0,0,0);gl?.clear(gl.COLOR_BUFFER_BIT);return;}renderThermal(canvas,image,settings,source?.transform,includeBackground,state.timeline.currentTimeSeconds);},[image,includeBackground,renderScale,settings.background,settings.baseBlur,settings.bloom,settings.colorBleed,settings.contrast,settings.detail,settings.dotAmount,settings.dotColor,settings.dotDensity,settings.dotEvenness,settings.dotSize,settings.dotThreshold,settings.grain,settings.heat,settings.mode,settings.pathAngle,settings.pathBlur,settings.scanlines,source?.transform,state.canvas.size.height,state.canvas.size.width,state.timeline.currentTimeSeconds]);
  return <canvas aria-label="Monochrome thermal vision output" className="absolute inset-0 block size-full" data-animated-grain={image instanceof HTMLVideoElement?"true":"false"} data-background={settings.background} data-base-blur={settings.baseBlur} data-color-bleed={settings.colorBleed} data-effect-mode={settings.mode} data-path-angle={settings.pathAngle} data-path-blur={settings.pathBlur} data-source-kind={stringValue(state.values["source.kind"],"image")} data-toolcraft-product-output="" key={settings.mode} ref={canvasRef} style={{backgroundColor:settings.background,height:state.canvas.size.height,width:state.canvas.size.width}}/>;
}
