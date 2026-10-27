/**
 * Preparación única de la nueva base CORPARTES. No crea contraseñas.
 * Requiere firebase-admin e identidad ADC del PROYECTO CORPARTES.
 * Nunca ejecutar sobre el proyecto ESS.
 */
import {initializeApp,applicationDefault} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore,FieldValue} from "firebase-admin/firestore";

const projectId=(process.env.CORPARTES_FIREBASE_PROJECT_ID||"").trim();
const adminEmail=(process.env.CORPARTES_ADMIN_EMAIL||"").trim().toLowerCase();

if(!/^corpartes-[a-z0-9-]+$/.test(projectId)){
  throw new Error("Project ID inválido: debe empezar por corpartes-. No tocar ESS.");
}
if(!adminEmail.includes("@")||process.env.CONFIRM_CORPARTES_EMPTY_BOOTSTRAP!=="SI"){
  throw new Error("Definir correo de administrador y confirmar proyecto vacío con CONFIRM_CORPARTES_EMPTY_BOOTSTRAP=SI.");
}
const app=initializeApp({credential:applicationDefault(),projectId});
const auth=getAuth(app),db=getFirestore(app);
const admin=await auth.getUserByEmail(adminEmail);
if(!admin.emailVerified)console.warn("Verificar el correo administrador antes de operar en producción.");
const meta=db.doc("ess_meta/main"),member=db.doc("corpartes_members/"+admin.uid);
const [oldMeta,oldMember]=await Promise.all([meta.get(),member.get()]);
if(oldMeta.exists||oldMember.exists)throw new Error("Base ya inicializada; no se sobrescribirá.");
const now=FieldValue.serverTimestamp();
const processes=[
 {id:"proc-programacion",name:"Programación",color:"#2563eb",status:"Activo",order:1},
 {id:"proc-punzonado",name:"Punzonado",color:"#7c3aed",status:"Activo",order:2},
 {id:"proc-doblez",name:"Doblez",color:"#f59e0b",status:"Activo",order:3},
 {id:"proc-soldadura",name:"Soldadura",color:"#dc2626",status:"Activo",order:4},
 {id:"proc-pintura",name:"Pintura",color:"#16a34a",status:"Activo",order:5},
 {id:"proc-entrega",name:"Entrega al cliente",color:"#334155",status:"Activo",order:6}
];
const role={
 id:"role-admin",name:"Administrador CORPARTES",status:"Activo",level:"admin",
 permissions:{economics:true},
 modules:["inicio","pedidos","remisiones","produccion","lamina","seguimiento",
 "informes","almacen","mantenimiento","cotizaciones","administracion","crm","ai"]
};
const profile={
 id:"user-admin",name:"Administrador CORPARTES",code:"ADM01",
 roleId:"role-admin",status:"Activo",authUid:admin.uid,authEmail:adminEmail
};
const batch=db.batch();
batch.create(member,{companyId:"corpartes",role:"owner",active:true,createdAt:now});
batch.create(db.doc("ess_roles/role-admin"),role);
batch.create(db.doc("ess_users/user-admin"),profile);
for(const process of processes)batch.create(db.doc("ess_processes/"+process.id),process);
batch.create(meta,{
 initialized:true,schema:"CORPARTES-V1-NATIVE",version:13,nextReprocess:1,
 maintenanceCatalog:{general:{preventivo:[],correctivo:[]}},
 activeWorks:{},activeMaintenances:{},sheetMaterialTypes:[],sheetGauges:[],
 quoteLibraries:{},externalProviders:[],externalProvidersInitialized:false,
 companyChat:[],crmCompanies:[],updatedAt:now
});
await batch.commit();
console.log("Proyecto CORPARTES inicializado:",projectId);
console.log("Cuenta administradora vinculada:",adminEmail);
console.log("Pedidos y demás documentos operativos: VACÍOS (sin copiar ESS).");
