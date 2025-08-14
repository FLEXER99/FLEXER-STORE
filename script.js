// إعدادات عامة
const PAYPAL_ME = 'https://www.paypal.me/yahyanob12';

// تفعيل الثيم المخزن
(function(){ const t = localStorage.getItem('theme') || 'light'; document.documentElement.dataset.theme = t; })();
document.getElementById('themeSwitch').addEventListener('click', ()=>{
  const cur = document.documentElement.dataset.theme || 'light';
  const next = cur === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
});

// أدوات
const el = s => document.querySelector(s);
const els = s => document.querySelectorAll(s);

// قواعد البيانات المحلية
const LS_USERS = 'store_users_v1';
const LS_PRODUCTS = 'store_products_v1';
const LS_ORDERS = 'store_orders_v1';

const db = {
  getUsers(){ return JSON.parse(localStorage.getItem(LS_USERS)||'{}'); },
  setUsers(v){ localStorage.setItem(LS_USERS, JSON.stringify(v)); },
  getProducts(){ return JSON.parse(localStorage.getItem(LS_PRODUCTS)||'[]'); },
  setProducts(v){ localStorage.setItem(LS_PRODUCTS, JSON.stringify(v)); },
  getOrders(){ return JSON.parse(localStorage.getItem(LS_ORDERS)||'[]'); },
  setOrders(v){ localStorage.setItem(LS_ORDERS, JSON.stringify(v)); },
};

// جلسة المستخدم
let user = null;
function saveSession(u){ user = u; localStorage.setItem('store_session_user', JSON.stringify(u)); }
function loadSession(){ try{ user = JSON.parse(localStorage.getItem('store_session_user')); }catch(e){ user=null; } }

// توجيه وحماية
function hideAll(){ els('main section').forEach(s=>s.classList.add('hidden')); }
function requireAuth(){ if(!user){ hideAll(); el('#authSection').classList.remove('hidden'); return false; } return true; }
function go(route){
  if(['home','products','contact','orders'].includes(route)){
    if(!requireAuth()) return;
    hideAll();
    el('#'+route).classList.remove('hidden');
    if(route==='home') el('#userEmail').textContent = user.email;
    if(route==='products') renderProducts();
    if(route==='orders') renderOrders();
  }
}
els('[data-route]').forEach(b=> b.addEventListener('click', ()=> go(b.dataset.route)));

// دخول/تسجيل
el('#loginForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  const f = new FormData(e.target);
  const email = (f.get('email')||'').toLowerCase().trim();
  const pass = (f.get('password')||'').trim();
  const users = db.getUsers();
  if(users[email] && users[email] === pass){
    saveSession({email});
    afterLogin();
  }else{
    el('#loginMsg').textContent = 'بيانات الدخول غير صحيحة';
  }
});
el('#registerForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  const f = new FormData(e.target);
  const email = (f.get('email')||'').toLowerCase().trim();
  const pass = (f.get('password')||'').trim();
  if(!email || !pass){ el('#registerMsg').textContent='أكمل البيانات'; return; }
  const users = db.getUsers();
  if(users[email]){ el('#registerMsg').textContent='البريد مستخدم'; return; }
  users[email] = pass; db.setUsers(users);
  saveSession({email});
  afterLogin();
});
document.getElementById('logoutBtn').addEventListener('click', ()=>{
  user = null; localStorage.removeItem('store_session_user');
  document.getElementById('ordersTab').classList.add('hidden');
  hideAll(); el('#authSection').classList.remove('hidden');
});

function afterLogin(){
  document.getElementById('logoutBtn').classList.remove('hidden');
  document.getElementById('ordersTab').classList.remove('hidden');
  go('home');
}

// منتجات
function renderProducts(){
  const grid = el('#productsGrid');
  grid.innerHTML = '';
  const prods = db.getProducts();
  if(prods.length === 0){
    grid.innerHTML = '<div class="card">لا توجد منتجات بعد. أضف منتجًا من الأسفل.</div>';
  }
  prods.forEach(p=>{
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `
      <img src="${p.image || 'assets/default.jpg'}" alt="${p.name}"/>
      <h3>${p.name}</h3>
      <p class="note">${p.desc || ''}</p>
      <div class="row" style="justify-content:space-between;">
        <div class="price">$${Number(p.price).toFixed(2)}</div>
        <div class="row">
          <a class="btn primary" href="${PAYPAL_ME}/${Number(p.price).toFixed(2)}" target="_blank" rel="noopener">ادفع عبر PayPal</a>
          <button class="btn" data-confirm="${p.id}">لقد دفعت</button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
  grid.querySelectorAll('[data-confirm]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-confirm');
      const p = db.getProducts().find(x=>String(x.id)===String(id));
      if(!p) return;
      const serial = 'SN-'+Math.random().toString(36).slice(2,10).toUpperCase();
      const orders = db.getOrders();
      orders.unshift({
        id: 'ORD-'+Date.now(),
        email: user.email,
        productId: p.id,
        productName: p.name,
        amount: Number(p.price),
        status: 'delivered',
        serial,
        at: new Date().toISOString()
      });
      db.setOrders(orders);
      alert('تم الدفع (تأكيد يدوي). السيريال: '+serial+'\nستجده في صفحة طلباتي.');
    });
  });
}

// إدارة المنتجات (محليًا)
el('#addProductForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  const f = new FormData(e.target);
  const prods = db.getProducts();
  prods.unshift({
    id: Date.now(),
    name: f.get('name'),
    price: Number(f.get('price')||0),
    image: f.get('image'),
    desc: f.get('desc')
  });
  db.setProducts(prods);
  e.target.reset();
  renderProducts();
});
el('#clearProducts').addEventListener('click', ()=>{
  if(confirm('هل تريد حذف جميع المنتجات المحفوظة محليًا؟')){
    db.setProducts([]);
    renderProducts();
  }
});

// الطلبات
function renderOrders(){
  const list = el('#ordersList'); list.innerHTML='';
  const orders = db.getOrders().filter(o=>o.email===user.email);
  if(orders.length===0){ list.innerHTML = '<div class="card">لا توجد طلبات بعد.</div>'; return; }
  orders.forEach(o=>{
    const d = document.createElement('div'); d.className='card';
    d.innerHTML = `
      <div class="row" style="justify-content:space-between;">
        <div>
          <div>الطلب: <b>${o.id}</b></div>
          <div>المنتج: ${o.productName}</div>
          <div>الحالة: <b>${o.status}</b></div>
          ${o.serial ? `<div class="note">السيريال: <b>${o.serial}</b></div>` : ''}
        </div>
        <div class="price">$${Number(o.amount).toFixed(2)}</div>
      </div>`;
    list.appendChild(d);
  });
}

// تشغيل أولي
(function init(){
  loadSession();
  if(user){ afterLogin(); } else { hideAll(); el('#authSection').classList.remove('hidden'); }
  // منتجات افتراضية مرة واحدة
  if(db.getProducts().length===0){
    db.setProducts([
      {id: 101, name:'كود تفعيل — باقة أساسية', price: 5, image:'', desc:'سيريال فوري بعد الدفع'},
      {id: 102, name:'كود تفعيل — باقة احترافية', price: 15, image:'', desc:'ميزات إضافية ودعم'}
    ]);
  }
})();
