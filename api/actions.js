"use strict";
const { authenticate, json, errorMessage } = require("./_auth");
const { Timestamp } = require("firebase-admin/firestore");

function val(v,max){return String(v==null?"":v).trim().slice(0,max);}
module.exports=async function handler(req,res){
  if(!["GET","POST"].includes(req.method))return json(res,405,{error:"Método no permitido."});
  if(Number(req.headers["content-length"]||0)>8000)return json(res,413,{error:"Solicitud demasiado extensa."});
  try{
    const user=await authenticate(req);
    if(!user)return json(res,403,{error:"Acción reservada al propietario de CORPARTES."});
    if(req.method==="GET"){
      const rows=await user.db.collection("corpartes_crm_tasks").orderBy("createdAt","desc").limit(15).get();
      return json(res,200,{tasks:rows.docs.map(d=>({id:d.id,company:d.get("company"),subject:d.get("subject"),dueDate:d.get("dueDate"),status:d.get("status")}))});
    }
    const x=req.body||{};
    if(x.action!=="create_followup")return json(res,400,{error:"Acción no permitida."});
    if(x.confirmed!==true)return json(res,400,{error:"La acción debe confirmarse explícitamente."});
    const requestId=val(x.requestId,80),company=val(x.company,120),subject=val(x.subject,200),
      dueDate=val(x.dueDate,10),note=val(x.note,500);
    if(!/^[a-zA-Z0-9-]{20,80}$/.test(requestId)||company.length<2||subject.length<4||
       !/^\d{4}-\d{2}-\d{2}$/.test(dueDate))
      return json(res,400,{error:"Completa empresa, actividad, fecha e identificador válido."});
    const d=new Date(dueDate+"T12:00:00Z");
    const today=new Date();today.setUTCHours(0,0,0,0);
    if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==dueDate||
       d.getTime()<today.getTime()||d.getTime()>today.getTime()+86400000*1095)
      return json(res,400,{error:"La fecha debe ser válida, futura o de hoy y dentro de 3 años."});
    const id=user.uid+"-"+requestId;
    const doc=user.db.collection("corpartes_crm_tasks").doc(id);
    const audit=user.db.collection("corpartes_audit").doc(id);
    const result=await user.db.runTransaction(async tx=>{
      const previous=await tx.get(doc);
      if(previous.exists)return {id,alreadyExists:true};
      const record={company,subject,dueDate,note,status:"Pendiente",companyId:"corpartes",
        creatorUid:user.uid,createdAt:Timestamp.now(),updatedAt:Timestamp.now()};
      tx.create(doc,record);
      tx.create(audit,{action:"create_followup",target:id,actorUid:user.uid,
        companyId:"corpartes",createdAt:Timestamp.now(),details:{company,subject,dueDate}});
      return {id,alreadyExists:false};
    });
    return json(res,200,{ok:true,...result});
  }catch(error){
    console.error("CORPARTES_ACTION_ERROR",String(error?.code||"error"));
    return json(res,503,{error:errorMessage(error)});
  }
};
