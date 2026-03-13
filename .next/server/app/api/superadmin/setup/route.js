"use strict";(()=>{var e={};e.id=6739,e.ids=[6739],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},84770:e=>{e.exports=require("crypto")},84629:e=>{e.exports=import("@libsql/client")},85830:(e,t,a)=>{a.a(e,async(e,s)=>{try{a.r(t),a.d(t,{originalPathname:()=>m,patchFetch:()=>c,requestAsyncStorage:()=>p,routeModule:()=>E,serverHooks:()=>d,staticGenerationAsyncStorage:()=>T});var r=a(49303),n=a(88716),i=a(60670),u=a(43470),o=e([u]);u=(o.then?(await o)():o)[0];let E=new r.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/superadmin/setup/route",pathname:"/api/superadmin/setup",filename:"route",bundlePath:"app/api/superadmin/setup/route"},resolvedPagePath:"C:\\Users\\charitha\\OneDrive - Bileeta Pvt. Ltd\\Documents\\my projects\\pos-skyglow\\app\\api\\superadmin\\setup\\route.ts",nextConfigOutput:"",userland:u}),{requestAsyncStorage:p,staticGenerationAsyncStorage:T,serverHooks:d}=E,m="/api/superadmin/setup/route";function c(){return(0,i.patchFetch)({serverHooks:d,staticGenerationAsyncStorage:T})}s()}catch(e){s(e)}})},43470:(e,t,a)=>{a.a(e,async(e,s)=>{try{a.r(t),a.d(t,{GET:()=>c,dynamic:()=>E});var r=a(87070),n=a(9487),i=a(42023),u=a.n(i),o=e([n]);n=(o.then?(await o)():o)[0];let E="force-dynamic";async function c(e){try{let{searchParams:t}=new URL(e.url),a=t.get("key"),s=process.env.SETUP_KEY||"setup-superadmin-now";if(a!==s)return r.NextResponse.json({error:"Invalid key. Add ?key=setup-superadmin-now"},{status:403});let i=await u().hash("superadmin123",10);await (0,n.queryOne)("SELECT user_id FROM users WHERE username = 'superadmin'")?await (0,n.execute)("UPDATE users SET password_hash=?, role='superadmin', company_id=0, is_active=1 WHERE username='superadmin'",[i]):await (0,n.execute)("INSERT INTO users (username,email,password_hash,full_name,role,company_id,is_active) VALUES ('superadmin','super@admin.local',?,'Super Admin','superadmin',0,1)",[i]);try{await (0,n.execute)("UPDATE companies SET slug=LOWER(REPLACE(REPLACE(company_name,' ','-'),'''','')) WHERE company_id=1 AND (slug='default' OR slug IS NULL)")}catch{}await (0,n.execute)(`CREATE TABLE IF NOT EXISTS companies (
      company_id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      slug TEXT UNIQUE,
      plan TEXT DEFAULT 'standard',
      max_users INTEGER DEFAULT 10,
      max_products INTEGER DEFAULT 500,
      is_active INTEGER DEFAULT 1,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`);try{await (0,n.execute)(`INSERT OR IGNORE INTO companies (company_id, company_name, slug, plan, is_active)
      VALUES (1, (SELECT COALESCE(setting_value,'My Shop') FROM settings WHERE setting_key='shop_name' LIMIT 1), 'default', 'standard', 1)`)}catch{}let o=["users","products","categories","suppliers","customers","sales","expenses","cash_drawer","shifts"];for(let e of o)try{await (0,n.execute)(`ALTER TABLE ${e} ADD COLUMN company_id INTEGER DEFAULT 1`)}catch{}for(let e of o)try{await (0,n.execute)(`UPDATE ${e} SET company_id=1 WHERE company_id IS NULL`)}catch{}return await (0,n.execute)(`CREATE TABLE IF NOT EXISTS product_batches (
      batch_id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      company_id INTEGER NOT NULL DEFAULT 1,
      batch_number TEXT NOT NULL,
      barcode TEXT UNIQUE,
      cost_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 0,
      received_date TEXT DEFAULT (date('now')),
      expiry_date TEXT,
      notes TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`),r.NextResponse.json({success:!0,message:"Setup complete. Login at /superadmin/login with superadmin / superadmin123"})}catch(e){return r.NextResponse.json({error:e.message},{status:500})}}s()}catch(e){s(e)}})},9487:(e,t,a)=>{a.a(e,async(e,s)=>{try{a.r(t),a.d(t,{execute:()=>c,getDB:()=>i,query:()=>u,queryOne:()=>o,transaction:()=>E});var r=a(84629),n=e([r]);r=(n.then?(await n)():n)[0];let p=null;function i(){if(!p){let e=process.env.TURSO_DATABASE_URL||process.env.STORAGE_URL,t=process.env.TURSO_AUTH_TOKEN||process.env.STORAGE_AUTH_TOKEN;if(!e)throw Error("TURSO_DATABASE_URL is not set");p=r.createClient({url:e,authToken:t||void 0})}return p}async function u(e,t=[]){let a=i();return(await a.execute({sql:e,args:t})).rows}async function o(e,t=[]){return(await u(e,t))[0]??null}async function c(e,t=[]){let a=i(),s=await a.execute({sql:e,args:t});return{lastInsertRowid:s.lastInsertRowid??0,rowsAffected:s.rowsAffected}}async function E(e){let t=i();await t.batch(e.map(e=>({sql:e.sql,args:e.args??[]})),"write")}s()}catch(e){s(e)}})}};var t=require("../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),s=t.X(0,[9276,5972,2023],()=>a(85830));module.exports=s})();