(()=>{
  const tel=document.getElementById('telefono');
  const dni=document.getElementById('dni');
  const form=document.getElementById('form-alta');
  const menu=document.getElementById('menu');
  const hamburguesa=document.querySelector('.hamburguesa');

  tel.addEventListener('keydown',e=>{
    if(e.key.length===1&&!/[0-9]/.test(e.key)&&!e.ctrlKey&&!e.metaKey)e.preventDefault();
  });
  tel.addEventListener('paste',e=>{
    const t=(e.clipboardData||window.clipboardData).getData('text');
    if(!/^[0-9]*$/.test(t))e.preventDefault();
  });

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

  form.addEventListener('submit',async function(e){
    e.preventDefault();
    if(!this.checkValidity()){this.reportValidity();return;}
    if(!validarDNI(dni.value)){
      dni.setCustomValidity(dni.dataset.errorInvalid);
      dni.reportValidity();
      dni.setCustomValidity('');
      return;
    }
    const boton=form.querySelector('.boton');
    boton.disabled=true;
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
    }
  });

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

  document.querySelector('.pie span:first-child').textContent='\u00a9 '+new Date().getFullYear()+' '+document.querySelector('.pie').dataset.copyright;
})();
