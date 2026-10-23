// Native Back preserves the previous document when the browser supports it. No storage or profile access.
const back=document.querySelector('[data-resources-back]');
back?.addEventListener('click',event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||history.length<2)return;event.preventDefault();history.back();});
