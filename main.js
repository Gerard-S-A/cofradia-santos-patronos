(()=>{
  const tel=document.getElementById('telefono');
  const dni=document.getElementById('dni');
  const form=document.getElementById('form-alta');
  const menu=document.getElementById('menu');
  const hamburguesa=document.querySelector('.hamburguesa');

  /* ---------- accessible form errors ---------- */
  const camposRequeridos=form.querySelectorAll('[required], [pattern]');
  camposRequeridos.forEach(campo=>{
    campo.addEventListener('blur',function(){
      if(!this.validity.valid||this.value.trim()===''){
        this.setAttribute('aria-invalid','true');
        const err=document.getElementById('err-'+this.id);
        if(err)err.classList.add('visible');
      }else{
        this.removeAttribute('aria-invalid');
        const err=document.getElementById('err-'+this.id);
        if(err)err.classList.remove('visible');
      }
    });
    campo.addEventListener('input',function(){
      if(this.getAttribute('aria-invalid')==='true'&&this.validity.valid&&this.value.trim()!==''){
        this.removeAttribute('aria-invalid');
        const err=document.getElementById('err-'+this.id);
        if(err)err.classList.remove('visible');
      }
    });
  });

  /* ---------- phone: only digits ---------- */
  tel.addEventListener('keydown',e=>{
    if(e.key.length===1&&!/[0-9]/.test(e.key)&&!e.ctrlKey&&!e.metaKey)e.preventDefault();
  });
  tel.addEventListener('paste',e=>{
    const t=(e.clipboardData||window.clipboardData).getData('text');
    if(!/^[0-9]*$/.test(t))e.preventDefault();
  });

  /* ---------- DNI: uppercase + validate ---------- */
  dni.addEventListener('input',function(){this.value=this.value.toUpperCase()});
  dni.addEventListener('keydown',e=>{
    if(e.key.length===1&&!/[0-9A-Za-z]/.test(e.key)&&!e.ctrlKey&&!e.metaKey)e.preventDefault();
  });

  function validarDNI(valor){
    valor=valor.toUpperCase().trim();
    const letras='TRWAGMYFPDXBNJZSQVHLCKE';
    let num;
    if(/^[0-9]{8}[A-Z]$/.test(valor)){
      num=parseInt(valor.substring(0,8));
    }else if(/^[XYZ][0-9]{7}[A-Z]$/.test(valor)){
      num=parseInt(valor[0].replace('X','0').replace('Y','1').replace('Z','2')+valor.substring(1,8));
    }else{
      return false;
    }
    return valor[valor.length-1]===letras[num%23];
  }

  /* ---------- form submit with spinner ---------- */
  form.addEventListener('submit',async function(e){
    e.preventDefault();
    let hayErrores=false;
    camposRequeridos.forEach(campo=>{
      if(!campo.validity.valid||campo.value.trim()===''){
        campo.setAttribute('aria-invalid','true');
        const err=document.getElementById('err-'+campo.id);
        if(err)err.classList.add('visible');
        hayErrores=true;
      }
    });
    if(hayErrores){this.reportValidity();return;}
    if(!validarDNI(dni.value)){
      dni.setAttribute('aria-invalid','true');
      const errDni=document.getElementById('err-dni');
      if(errDni)errDni.classList.add('visible');
      dni.setCustomValidity(dni.dataset.errorInvalid);
      dni.reportValidity();
      dni.setCustomValidity('');
      return;
    }
    const boton=form.querySelector('.boton');
    const textoOriginal=boton.textContent;
    boton.disabled=true;
    boton.classList.add('enviando');
    boton.innerHTML='<span class="spinner" aria-hidden="true"></span> Enviando…';
    try{
      const respuesta=await fetch(form.action,{
        method:'POST',
        body:new FormData(form),
        headers:{'Accept':'application/json'}
      });
      const datos=await respuesta.json();
      if(datos.success){
        document.getElementById('form-ok').classList.add('visible');
        form.reset();
        document.getElementById('form-ok').scrollIntoView({behavior:'smooth',block:'nearest'});
      }else{
        alert(form.dataset.errorGeneric);
      }
    }catch(err){
      alert(form.dataset.errorGeneric);
    }finally{
      boton.disabled=false;
      boton.classList.remove('enviando');
      boton.textContent=textoOriginal;
    }
  });

  /* ---------- mobile menu ---------- */
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
    menu.classList.remove('abierto');
    hamburguesa.setAttribute('aria-expanded','false');
    hamburguesa.focus();
  }));

  hamburguesa.addEventListener('click',()=>{
    const abierto=menu.classList.toggle('abierto');
    hamburguesa.setAttribute('aria-expanded',String(abierto));
  });

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&menu.classList.contains('abierto')){
      menu.classList.remove('abierto');
      hamburguesa.setAttribute('aria-expanded','false');
      hamburguesa.focus();
    }
  });

  /* ---------- copyright year ---------- */
  document.querySelector('.pie span:first-child').textContent='\u00a9 '+new Date().getFullYear()+' '+document.querySelector('.pie').dataset.copyright;

  /* ---------- scroll animations ---------- */
  if('IntersectionObserver' in window){
    const fadeObserver=new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('visible');
          fadeObserver.unobserve(entry.target);
        }
      });
    },{threshold:0.12});
    document.querySelectorAll('.fade-in').forEach(el=>fadeObserver.observe(el));
  }else{
    document.querySelectorAll('.fade-in').forEach(el=>el.classList.add('visible'));
  }

  /* ---------- back to top ---------- */
  const btnTop=document.querySelector('.volver-arriba');
  if(btnTop){
    let ticking=false;
    window.addEventListener('scroll',()=>{
      if(!ticking){
        requestAnimationFrame(()=>{
          btnTop.classList.toggle('visible',window.scrollY>500);
          ticking=false;
        });
        ticking=true;
      }
    },{passive:true});
    btnTop.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
  }

  /* ---------- email obfuscation ---------- */
  document.querySelectorAll('[data-email]').forEach(el=>{
    const parts=el.dataset.email.split('@');
    el.textContent=parts[0]+'@'+parts[1];
    el.href='mailto:'+el.textContent;
  });

  /* ---------- dynamic calendar ---------- */
  document.querySelectorAll('.calendario[data-year]').forEach(cal=>{
    const year=parseInt(cal.dataset.year);
    const evento=parseInt(cal.dataset.evento);
    const fiesta=parseInt(cal.dataset.fiesta);
    const evLabel=cal.dataset.eventoLabel||'';
    const fiLabel=cal.dataset.fiestaLabel||'';
    const diasSem=['L','M','X','J','V','S','D'];
    const tabla=cal.querySelector('.cal-tabla');
    cal.querySelector('.cal-anyo').textContent=year;
    cal.querySelector('.cal-leyenda-ev').textContent=cal.dataset.leyendaEvento||'';
    cal.querySelector('.cal-leyenda-fi').textContent=cal.dataset.leyendaFiesta||'';
    diasSem.forEach(d=>{const h=document.createElement('div');h.className='dia-sem';h.setAttribute('role','columnheader');h.textContent=d;tabla.appendChild(h);});
    const primerDia=new Date(year,6,1).getDay();
    const diasEnMes=new Date(year,7,0).getDate();
    const offset=(primerDia+6)%7;
    for(let i=0;i<offset;i++){const empty=document.createElement('div');tabla.appendChild(empty);}
    for(let d=1;d<=diasEnMes;d++){
      const cell=document.createElement('div');
      cell.className='dia';
      cell.textContent=d;
      if(d===evento){cell.classList.add('evento');cell.setAttribute('role','gridcell');cell.setAttribute('aria-label',d+' de julio: '+evLabel);cell.title=evLabel;}
      if(d===fiesta){cell.classList.add('fiesta');cell.setAttribute('role','gridcell');cell.setAttribute('aria-label',d+' de julio: '+fiLabel);cell.title=fiLabel;}
      tabla.appendChild(cell);
    }
  });
})();
