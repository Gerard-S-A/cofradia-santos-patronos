(()=>{
  const isVA=location.pathname.startsWith('/va');
  document.querySelectorAll('[data-lang]').forEach(el=>{
    if(el.dataset.lang===(isVA?'va':'es')){
      el.removeAttribute('hidden');
    } else {
      el.setAttribute('hidden','');
    }
  });
  if(isVA){
    document.documentElement.lang='ca-valencia';
    document.title='Pàgina no trobada · Confraria Sants Patrons Sagunt';
  }
})()
