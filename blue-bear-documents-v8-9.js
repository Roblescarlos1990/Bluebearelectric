window.BlueBearDocuments=(function(){
  const cfg=window.VOLTFLOW_COMPANY||{
    companyName:'Blue Bear Electric',phone:'760-234-8306',licenseLabel:'CA License #1141313',
    documentLogo:'assets/branding/blue-bear/document-logo.png',
    watermarkPrint:'assets/branding/blue-bear/watermark-print.png'
  };
  const abs=path=>new URL(path,location.href).href;
  function shell(title,body,options={}){
    const status=options.status||'DRAFT';
    return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
@page{margin:.58in}*{box-sizing:border-box}body{margin:0;color:#142030;font:14px/1.5 Arial,sans-serif;background:#fff}
body:before{content:"";position:fixed;inset:18% 10%;z-index:-1;background:url("${abs(cfg.watermarkPrint)}") center/contain no-repeat;opacity:${cfg.documentWatermarkOpacity||.055}}
.doc-page{position:relative;min-height:9.6in}.doc-head{display:flex;align-items:center;justify-content:space-between;gap:24px;padding-bottom:15px;border-bottom:4px solid ${cfg.accentColor||'#ffc400'}}
.doc-brand{display:flex;align-items:center;gap:14px}.doc-brand img{width:105px;max-height:74px;object-fit:contain}.doc-brand strong{display:block;font-size:19px;color:#061b35}.doc-brand small{color:#566477}
.doc-title{text-align:right}.doc-title h1{margin:0;color:#061b35;text-transform:uppercase;letter-spacing:.06em}.doc-title span{display:inline-block;margin-top:5px;padding:4px 8px;border:1px solid #ccd5df;border-radius:5px;font-size:10px;font-weight:700;color:#647181}
.doc-content{padding:28px 0 68px}.doc-footer{position:fixed;left:.58in;right:.58in;bottom:.28in;display:flex;justify-content:space-between;border-top:1px solid #dce3ea;padding-top:7px;color:#687583;font-size:10px}
h1,h2,h3{color:#062a52}.line{border-bottom:1px solid #d9e1e8;padding:9px 0;display:flex;justify-content:space-between;gap:20px}
table{width:100%;border-collapse:collapse}th{background:#062a52;color:#fff;text-align:left}th,td{padding:9px;border-bottom:1px solid #d9e1e8}
.print-actions{position:fixed;right:16px;top:16px;z-index:5}@media print{.print-actions{display:none}}
</style></head><body><button class="print-actions" onclick="window.print()">Print / Save PDF</button>
<main class="doc-page"><header class="doc-head"><div class="doc-brand"><img src="${abs(cfg.documentLogo)}"><div><strong>${cfg.companyName}</strong><small>${cfg.licenseLabel}<br>${cfg.phone}</small></div></div><div class="doc-title"><h1>${title}</h1><span>${status}</span></div></header><section class="doc-content">${body}</section><footer class="doc-footer"><span>${cfg.companyName} · ${cfg.phone}</span><span>Generated securely through VoltFlow</span></footer></main></body></html>`;
  }
  function open(title,body,options={}){
    const w=window.open('','_blank');if(!w)return null;
    w.document.write(shell(title,body,options));w.document.close();w.focus();
    return w;
  }
  return {shell,open};
})();