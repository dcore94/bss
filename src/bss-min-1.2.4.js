var BSS={_get:function(t,n,e,i){return"function"==typeof t?t(n,e,i):t},_selectTarget:function(t,n,e,i){return"function"==typeof t?t(n,e,i):n.querySelector(t)},_selectTargets:function(t,n,e,i){return"function"==typeof t?t(n,e,i):n.querySelectorAll(t)},polyfill:function(){if(!("content"in document.createElement("template"))){var t=Array.prototype.slice.call(document.getElementsByTagName("template"));for(var n in t){var e=t[n];for(content=e.children,fragment=document.createDocumentFragment(),e.style.display="none",j=0;node=content[j];j++)fragment.appendChild(node);e.content=fragment}}},commit:function(t){this._bindingCache.commit(t)},clear:function(t){this._bindingCache.clear(t),this._selectTarget(t.target,document).innerHTML=""},reapply:function(t){this._bindingCache.reapply(t)},apply:function(t){if(t.id||(t.id=1e12*Math.random()|0),this._bindingCache.clear(t),t.template){var n=this._get(t.template),e=document.querySelector(n);if(null==e)return void console.error("Template not found",n);var i=document.importNode(e.content,!0);this._bind(t,t,i),this.reapply(t);var r=this._selectTarget(t.target,document);if(null==r)return void console.error("Target not found",t.target);r.parentNode.replaceChild(i,r)}else this._bind(t,t,document),this.reapply(t)},_bind:function(t,n,e,i,r,a){for(var o=this._selectTargets(t.target,e,i,a),s=0;s<o.length;s++){var c=o[s],d=i,l=r;t.inout&&(d=l=this._get(t.inout,c,i,a)),t.in&&(d=this._get(t.in,c,i,a)),t.out&&(l=this._get(t.out,c,i,a));var u=(u=t.recurse?this._get(t.recurse,c,d,a):[])?u instanceof Array?u:[u]:[];if(d instanceof Array){var f=[];for(var s in d)f.push(c.cloneNode(!0));var p=c.parentNode;for(var h in p.removeChild(c),f){var m=f[h];for(var g in this._bindingCache.addApplyBinding(t,n,m,d,h),l&&this._bindingCache.addCommitBinding(t,n,m,l,h),this._registerEvents(t,m),p.appendChild(m),u)this._bind(u[g],n,m,d[h],l?l[h]:null,h)}}else for(var g in this._bindingCache.addApplyBinding(t,n,c,d,null),l&&this._bindingCache.addCommitBinding(t,n,c,l,null),this._registerEvents(t,c),u)this._bind(u[g],n,c,d,l,a)}},_registerEvents:function(t,n){for(var e in t)if("on"==e){var i=t[e];for(var r in i){(i[r]instanceof Array?i[r]:[i[r]]).forEach(function(t){n.addEventListener(r,t,!1)})}}else if(0==e.lastIndexOf("on_")){(t[e]instanceof Array?t[e]:[t[e]]).forEach(function(t){n.addEventListener(e.substring(3),t,!1)})}},_bindingCache:{applies:{},commits:{},clear:function(t){this.applies[t.id]=this.applies[t.id]?this.applies[t.id].splice():[],this.commits[t.id]=this.commits[t.id]?this.commits[t.id].splice():[]},addApplyBinding:function(t,n,e,i,r){var a={element:e,index:r,transfer:t.apply?t.apply:function(){},data:r?i[r]:i,container:r?i:null};e.bss_input=a,this.applies[n.id].push(a)},addCommitBinding:function(t,n,e,i,r){var a={element:e,index:r,transfer:t.commit?t.commit:function(){},data:r?i[r]:i,container:r?i:null,remove:r?function(){this.container.splice(this.index,1)}:function(){}};e.bss_output=a,e.bss_binding=a,this.commits[n.id].push(a)},reapply:function(t){this.applies[t.id]&&this.applies[t.id].forEach(function(t){t.transfer(t.element,t.data,t.index)})},commit:function(t){this.commits[t.id]&&this.commits[t.id].forEach(function(t){t.transfer(t.element,t.data,t.index)})}}};