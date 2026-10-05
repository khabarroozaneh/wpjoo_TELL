const KEY='wpjoo.expert.v1', $=s=>document.querySelector(s), fa=n=>String(n).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
let db=JSON.parse(localStorage.getItem(KEY)||'{"appointments":[],"lastImport":null}'),filter='all';

const save=()=>{localStorage.setItem(KEY,JSON.stringify(db));render()};

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>{let d=new Date(v);return Number.isNaN(d.getTime())?null:d};
const key=r=>r.id||[r.leadId,r.followUp,r.createdAt,r.lead?.url].join('|');
const type=r=>{let d=date(r.followUp);if(!d)return'bad';let x=d-Date.now();return x<0?'overdue':x<=86400000?'soon':'future'};
const fmt=v=>{let d=date(v);return d?d.toLocaleString('fa-IR',{dateStyle:'medium',timeStyle:'short'}):'ثبت نشده'};
const ago=v=>{let d=date(v);if(!d)return'';let x=d-Date.now(),m=Math.floor(Math.abs(x)/60000),h=Math.floor(m/60);return x>=0?`${fa(h)} ساعت و ${fa(m%60)} دقیقه مانده`:`${fa(h)} ساعت و ${fa(m%60)} دقیقه گذشته`};

function render(){
  let a=db.appointments.map(r=>({...r,t:type(r)}))
    .filter(r=>r.t!=='bad')
    .sort((a,b)=>date(a.followUp)-date(b.followUp));
  let soon=a.filter(r=>r.t==='soon');
  let over=a.filter(r=>r.t==='overdue');
  let show=filter==='soon'?soon:filter==='overdue'?over:a;

  $('#totalCount').textContent=fa(a.length);
  $('#soonCount').textContent=fa(soon.length);
  $('#overdueCount').textContent=fa(over.length);

  let al=$('#alertBox');
  if(soon.length){al.className='alert urgent';al.innerHTML=`هشدار: ${fa(soon.length)} قرار تا ۲۴ ساعت آینده؛ نزدیک‌ترین قرار ${fmt(soon[0].followUp)}`}
  else if(over.length){al.className='alert';al.textContent=`توجه: ${fa(over.length)} قرار گذشته دارید.`}
  else{al.className='alert hidden'}

  $('#appointments').innerHTML=show.length?
    show.map(r=>`
      <article class="appointment ${r.t}">
        <h3>${esc(r.lead?.ownerName||r.ownerName||'نام صاحب سایت ثبت نشده')}</h3>
        <span class="badge">${r.t==='soon'?'تا ۲۴ ساعت آینده':r.t==='overdue'?'گذشته':'آینده'}</span>
        <div class="line"><b>زمان قرار:</b> ${fmt(r.followUp)} — ${ago(r.followUp)}</div>
        <div class="line"><b>سایت:</b> ${esc(r.lead?.url||r.url||'ثبت نشده')}</div>
        <div class="line"><b>تلفن:</b> ${esc(r.lead?.phone||r.phone||'ثبت نشده')}</div>
        <div class="line"><b>توضیحات:</b> ${esc(r.notes||'')}</div>
        <div class="line"><b>نام پاسخ‌دهنده:</b> ${esc(r.contactName||'ثبت نشده')}</div>
      </article>`).join('')
    :'<div class="result">برای این فیلتر قراری وجود ندارد.</div>';

  $('#result').textContent=db.lastImport
    ?`${fa(db.lastImport.added)} قرار اضافه شد؛ ${fa(db.lastImport.duplicates)} تکراری نادیده گرفته شد.`
    :'';
}

$('#jsonFile').addEventListener('change',async e=>{
  let f=e.target.files[0];
  if(!f)return;
  try{
    let raw=JSON.parse(await f.text());
    let arr=Array.isArray(raw)?raw:(raw.reports||raw.data||raw.items||[]);
    let old=new Set(db.appointments.map(key));
    let added=0,duplicates=0;
    arr.filter(r=>r&&r.status==='قرار جلسه با کارشناس').forEach(r=>{
      let k=key(r);
      if(old.has(k)){duplicates++;return}
      old.add(k);
      db.appointments.push(r);
      added++;
    });
    db.lastImport={added,duplicates,file:f.name};
    save();
  }catch(err){
    $('#result').textContent='خطا در خواندن JSON: '+err.message;
  }
});

function download(n,d){
  let a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:'application/json'}));
  a.download=n;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

$('#exportData').onclick=()=>download('wpjoo-expert-backup.json',db);
$('#clearData').onclick=()=>{
  if(confirm('اطلاعات پنل کارشناس پاک شود؟')){
    db={appointments:[],lastImport:null};
    save();
  }
};

document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  filter=b.dataset.filter;
  render();
});

render();
setInterval(render,60000);
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
