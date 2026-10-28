"use strict";
const { authenticate, json, errorMessage } = require("./_auth");

function colDate() {
  const parts=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:"America/Bogota",
    year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date())
    .filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
  return parts.year+"-"+parts.month+"-"+parts.day;
}
function short(value, n) {return String(value||"").trim().slice(0,n);}
function parseJson(content) {
  let raw=String(content||"").trim().replace(/^\x60{3}(?:json)?\s*/i,"").replace(/\s*\x60{3}$/,"");
  return JSON.parse(raw);
}
module.exports=async function handler(req,res){
  if(req.method!=="POST")return json(res,405,{error:"Método no permitido."});
  if(Number(req.headers["content-length"]||0)>8000)return json(res,413,{error:"Solicitud extensa."});
  try{
    const user=await authenticate(req);
    if(!user)return json(res,403,{error:"Solo el propietario puede preparar acciones."});
    const instruction=short(req.body?.instruction,1100);
    if(instruction.length<8||instruction.length>900)return json(res,400,{error:"Instrucción entre 8 y 900 caracteres."});
    if(!process.env.AI_GATEWAY_API_KEY)return json(res,503,{error:"AI Gateway aún no configurado para acciones conversacionales."});
    const result=await fetch("https://ai-gateway.vercel.sh/v1/chat/completions",{
      method:"POST",headers:{"Authorization":"Bearer "+process.env.AI_GATEWAY_API_KEY,"Content-Type":"application/json"},
      body:JSON.stringify({model:process.env.CORPARTES_AI_MODEL||"openai/gpt-5.5",
        max_tokens:600,messages:[
          {role:"system",content:"Analiza la instrucción empresarial en español. FECHA COLOMBIA HOY: "+colDate()+
          ". No ejecutes acciones. Tu ÚNICA habilidad autorizada es preparar un SEGUIMIENTO COMERCIAL para una empresa. Devuelve solamente un objeto JSON compacto. Si es un seguimiento suficientemente claro responde: {\"kind\":\"proposal\",\"company\":\"empresa\",\"subject\":\"actividad concreta\",\"dueDate\":\"YYYY-MM-DD\",\"note\":\"notas opcionales\"}. Para fechas relativas usa fecha Colombia. No inventes empresa o fecha si no están deducibles. Si no hay información suficiente o no es ese tipo de acción responde: {\"kind\":\"clarification\",\"message\":\"qué dato falta o que la capacidad aún no existe\"}. Nunca respondas código ni otros campos."},
          {role:"user",content:instruction}
        ]})
    });
    if(!result.ok)return json(res,502,{error:"No fue posible preparar la acción con el modelo."});
    const raw=await result.json();
    let out;
    try{out=parseJson(raw.choices?.[0]?.message?.content)}catch(_e){
      return json(res,422,{error:"El modelo no produjo una propuesta estructurada válida."});
    }
    if(out?.kind==="clarification"){
      return json(res,200,{kind:"clarification",message:short(out.message,300)||"Aclara la empresa y la fecha de la gestión."});
    }
    if(out?.kind!=="proposal")return json(res,422,{error:"Tipo de acción no permitido."});
    const company=short(out.company,120),subject=short(out.subject,200),
      dueDate=short(out.dueDate,10),note=short(out.note,500);
    if(company.length<2||subject.length<4||!/^\d{4}-\d{2}-\d{2}$/.test(dueDate))
      return json(res,200,{kind:"clarification",message:"Para crear un seguimiento indica la empresa, la actividad y una fecha válida."});
    const proposed=new Date(dueDate+"T12:00:00Z"),today=new Date(colDate()+"T12:00:00Z");
    if(!Number.isFinite(proposed.getTime())||proposed.toISOString().slice(0,10)!==dueDate||
       proposed<today||proposed.getTime()>today.getTime()+86400000*1095)
      return json(res,200,{kind:"clarification",message:"Confirma una fecha desde hoy y dentro de los próximos tres años."});
    return json(res,200,{kind:"proposal",requiresConfirmation:true,
      proposal:{action:"create_followup",company,subject,dueDate,note}});
  }catch(error){
    console.error("CORPARTES_PLAN_ERROR",String(error?.code||"error"));
    return json(res,503,{error:errorMessage(error)});
  }
};
