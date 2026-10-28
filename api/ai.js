/* CORPARTES AI SERVER · Vercel Function */
module.exports=async function(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method==="GET")return res.status(200).json({ok:true,configured:!!process.env.AI_GATEWAY_MODEL,auth:!!(process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN)});
 if(req.method!=="POST")return res.status(405).json({error:"Método no permitido"});
 const token=process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN,model=process.env.AI_GATEWAY_MODEL;
 if(!token||!model)return res.status(503).json({error:"Corpartes IA aún no está configurada en la nube."});
 try{
  const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):(req.body||{}),question=String(body.question||"").trim().slice(0,4000),mode=String(body.mode||"preguntar").slice(0,30),context=body.context&&typeof body.context==="object"?body.context:{};
  if(!question)return res.status(400).json({error:"Pregunta vacía"});
  const system=["Eres Corpartes IA, copiloto del ERP-CRM de una empresa metalmecánica colombiana.","Responde en español claro, práctico y breve. Usa únicamente el contexto recibido para cifras empresariales. Si falta un dato, dilo. No inventes cifras, clientes, pedidos, normas ni estados.","Modo: "+mode+".",mode==="enseñar"?"Enseña paso a paso y explica el porqué.":"",mode==="explicar"?"Explica el dato, causas probables y qué revisar.":"",mode==="proponer"?"Propón pocas acciones priorizadas por impacto, urgencia y riesgo; no afirmes que ya se ejecutaron.":"",mode==="ejecutar"?"Nunca afirmes que ejecutaste cambios. La interfaz ejecuta únicamente acciones autorizadas y confirmadas.":"", "Para acciones financieras, eliminaciones, envíos de comunicaciones o permisos exige confirmación humana. Nunca pidas contraseñas ni secretos."].filter(Boolean).join("\n");
  const up=await fetch("https://ai-gateway.vercel.sh/v1/chat/completions",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({model:model,temperature:0.2,max_tokens:900,messages:[{role:"system",content:system},{role:"user",content:"CONTEXTO ERP:\\n"+JSON.stringify(context).slice(0,18000)+"\\n\\nSOLICITUD:\\n"+question}]})});
  const data=await up.json().catch(function(){return{};});
  if(!up.ok)return res.status(502).json({error:"No fue posible consultar el modelo de IA."});
  const answer=data&&data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content;
  if(!answer)return res.status(502).json({error:"El modelo no devolvió respuesta."});
  return res.status(200).json({answer:String(answer)});
 }catch(err){console.error("CORPARTES_AI_ERROR",err);return res.status(500).json({error:"Error interno de Corpartes IA."});}
};