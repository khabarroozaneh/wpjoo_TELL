const KEY='wpjoo.expert.v1', $=s=>document.querySelector(s), fa=n=>String(n).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
let db=JSON.parse(localStorage.getItem(KEY)||'{"appointments":[],"reports":[],"lastImport":null}'),filter='all';
if(!Array.isArray(db.reports))db.reports=[];

function go(id){document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));$('#'+id).classList.add('active');if(id==='main')render()}
document.addEventListener('click',e=>{let b=e.target.closest('[data-go]');if(b)go(b.dataset.go)});

const save=()=>{localStorage.setItem(KEY,JSON.stringify(db));render()};

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>{let d=new Date(v);return Number.isNaN(d.getTime())?null:d};
const key=r=>r.id||[r.leadId,r.followUp,r.createdAt,r.lead?.url].join('|');
const type=r=>{let d=date(r.followUp);if(!d)return'bad';let x=d-Date.now();return x<0?'overdue':x<=86400000?'soon':'future'};
const fmt=v=>{let d=date(v);return d?Jalali.storageText(Jalali.toStorage(d),'ثبت نشده'):'ثبت نشده'};
const reportFor=r=>db.reports.find(x=>x.appointmentKey===key(r));
const ago=v=>{let d=date(v);if(!d)return'';let x=d-Date.now(),m=Math.floor(Math.abs(x)/60000),h=Math.floor(m/60);return x>=0?`${fa(h)} ساعت و ${fa(m%60)} دقیقه مانده`:`${fa(h)} ساعت و ${fa(m%60)} دقیقه گذشته`};

function render(){
  let a=db.appointments.map(r=>({...r,t:type(r)}))
    .filter(r=>r.t!=='bad')
    .sort((a,b)=>date(a.followUp)-date(b.followUp));
  let soon=a.filter(r=>r.t==='soon');
  let over=a.filter(r=>r.t==='overdue');
  let rep=a.filter(r=>reportFor(r));
  let show=filter==='soon'?soon:filter==='overdue'?over:filter==='reported'?rep:filter==='unreported'?a.filter(r=>!reportFor(r)):a;

  $('#totalCount').textContent=fa(a.length);
  $('#soonCount').textContent=fa(soon.length);
  $('#overdueCount').textContent=fa(over.length);
  $('#reportedCount').textContent=fa(rep.length);

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
        ${reportFor(r)?`<div class="report-box"><b>گزارش ثبت‌شده:</b><br>${esc(reportFor(r).status)}<br>${esc(reportFor(r).notes||'')}<br><small>${fmt(reportFor(r).at)}${reportFor(r).nextAction?' — اقدام بعدی: '+esc(reportFor(r).nextAction):''}</small></div>`:''}
        <button type="button" class="reportBtn" data-report="${esc(key(r))}">${reportFor(r)?'ویرایش گزارش':'ثبت گزارش قرار'}</button>
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
$('#exportReports').onclick=()=>{
  if(!db.reports.length){alert('هنوز گزارشی ثبت نشده است.');return}
  download('wpjoo-expert-reports-'+new Date().toISOString().slice(0,10)+'.json',db.reports);
};
$('#clearData').onclick=()=>{
  if(!confirm('اطلاعات پنل کارشناس پاک شود؟'))return;
  if(!confirm('تأیید نهایی: همه قرارها و گزارش‌های ثبت‌شده برای همیشه حذف می‌شوند. مطمئن هستید؟'))return;
  db={appointments:[],reports:[],notified:{},dismissed:[],lastImport:null};
  save();
};

document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  filter=b.dataset.filter;
  render();
});

let editingKey=null;
document.addEventListener('click',e=>{
  let b=e.target.closest('[data-report]');
  if(!b)return;
  editingKey=b.dataset.report;
  let r=db.appointments.find(x=>key(x)===editingKey);
  if(!r)return;
  $('#reportCard').innerHTML=`<h3>${esc(r.lead?.ownerName||r.ownerName||'نام صاحب سایت ثبت نشده')}</h3><div class="line"><b>زمان قرار:</b> ${fmt(r.followUp)}</div><div class="line"><b>سایت:</b> ${esc(r.lead?.url||r.url||'ثبت نشده')}</div><div class="line"><b>تلفن:</b> ${esc(r.lead?.phone||r.phone||'ثبت نشده')}</div>`;
  let old=reportFor(r);
  $('#reportStatus').value=old?old.status:'';
  $('#reportNotes').value=old?old.notes:'';
  let d=old&&old.at?new Date(old.at):new Date();
  let p=n=>String(n).padStart(2,'0');
  $('#reportAt').value=`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  $('#reportSaved').textContent='';
  go('reportView');
});

$('#reportForm').addEventListener('submit',e=>{
  e.preventDefault();
  if(!editingKey)return;
  let status=$('#reportStatus').value,notes=$('#reportNotes').value.trim(),at=$('#reportAt').value;
  if(!status||notes.length<3){alert('نتیجه جلسه و توضیحات (حداقل ۳ حرف) اجباری است.');return}
  let i=db.reports.findIndex(x=>x.appointmentKey===editingKey);
  let rec={appointmentKey:editingKey,status,notes,at:new Date(at).toISOString(),updatedAt:new Date().toISOString()};
  if(i>=0)db.reports[i]=rec;else db.reports.push(rec);
  save();
  $('#reportForm').reset();
  $('#reportSaved').textContent='گزارش ذخیره شد و روی دستگاه نگه داشته شد.';
  go('main');
});

render();
setInterval(render,60000);
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');

/* ===== یادآوری قرارها (نوتیفیکیشن) ===== */
if(!db.notified||typeof db.notified!=='object')db.notified={};
function remindersOn(){return Notification.permission==='granted'}
function dismissed(k){return db.dismissed&&db.dismissed.includes(k)}
function checkReminders(){
  if(!remindersOn())return;
  let now=Date.now();
  db.appointments.forEach(r=>{
    let d=date(r.followUp);if(!d)return;
    let k=key(r),t=d.getTime(),x=t-now;
    if(dismissed(k))return;
    if(x<=86400000){
      let tag='gharar-'+k;
      if(!db.notified[tag]){
        db.notified[tag]=1;save();
        let body=x<=0?'اکنون زمان قرار است':x<=3600000?'کمتر از یک ساعت تا قرار مانده':'۲۴ ساعت تا قراردانید';
        navigator.serviceWorker.ready.then(reg=>reg.showNotification('یادآوری قرار — '+(r.lead?.ownerName||r.ownerName||''),{body,body,tag,requireInteraction:true,data:{k}}));
      }
    }
  });
}
if('Notification' in window){
  if(remindersOn()){$('#notifyBtn').classList.add('hidden');checkReminders();setInterval(checkReminders,30000)}
  else $('#notifyBtn').classList.remove('hidden');
}
$('#notifyBtn').onclick=()=>{Notification.requestPermission().then(p=>{if(p==='granted'){$('#notifyBtn').classList.add('hidden');checkReminders();setInterval(checkReminders,30000)}else alert('دسترسی نوتیفیکیشن داده نشد.')})};
navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.dismiss){let k=e.data.dismiss;if(!db.dismissed)db.dismissed=[];if(!db.dismissed.includes(k))db.dismissed.push(k);save()}});
