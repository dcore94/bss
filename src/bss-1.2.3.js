/*
 * Copyright (c) 2016 Marco Lettere

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation 
files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, 
modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software 
is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES 
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS 
BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF
OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 * */

var BSS = {

	/* Evaluates a field from a BSS instance checking whether it's an "edi function"*/
	_get : function (field, e, d, i){
		return typeof(field) == 'function' ? field(e, d, i) : field
	},

	/*
	  * Polyfill for templates suitable for older IE browsers, 
	  *	Big thanks to https://github.com/neovov/template-element-polyfill/blob/master/template.js for inspiration
	  */
	polyfill : function(){
		var support = ("content" in document.createElement("template"));
		if (!support) {
			var	templates = Array.prototype.slice.call(document.getElementsByTagName("template"))
			for(var t in templates) {
				var template = templates[t]
					content  = template.children;
					fragment = document.createDocumentFragment();
				template.style.display = "none";
				for (j = 0; node = content[j]; j++) {
					fragment.appendChild(node);
				}
				template.content = fragment;
			}
		}
	},

	/* Commits all databindings of one BSS instance back to the model*/
	commit : function (bss){
		this._bindingCache.commit(bss)
	},

	/* Destroys all bindings cached in bindingCache and erases all generated HTML output*/
	clear : function (bss){
		this._bindingCache.clear(bss)
		var target = document.querySelector(this.get(bss.target))
		target.innerHTML = ''
	},

	/* Re-apply all cached bindings. This is useful for speeding up the change of shown values 
	 * when no structural changes have occurred in the model*/
	reapply : function (bss){
		this._bindingCache.reapply(bss)
	},

	/* Public entry point for the application of a BSS instance. 
	 * Takes care of extracting the BSS template (if any) and after applying the binding algorithm
	 * pastes the HTML output into the target declared at the top of the BSS */
	apply : function (bss){
		//var start = new Date()
		if(!bss.id) bss.id = (Math.random() * 10e11)|0
		this._bindingCache.clear(bss)
		if(bss['template']){
			var templateStr = this._get(bss.template)
			var template = document.querySelector(templateStr)
			if (template == null) {
				console.error("Template not found", templateStr)
				return;
			}
			var newtarget = document.importNode(template.content, true)
			this._bind(bss, bss, newtarget)
			this.reapply(bss)
			var targetStr = this._get(bss.target)
			var target = document.querySelector(targetStr)
			if (target == null) {
				console.error("Target not found", targetStr)
				return;
			}
			target.parentNode.replaceChild(newtarget, target)
		}else{
			this._bind(bss, bss, document)
			this.reapply(bss)
		}
		//console.log(new Date() - start)
	},

	_bind : function(bss, rootBss, rootElement, data, dataOut, index){
		var targets = rootElement.querySelectorAll(this._get(bss.target, rootElement, data, index))
		for(var i=0; i < targets.length; i++){
			
			//for every element matched by target selector
			var target = targets.item(i)
			
			//get data bound to target possibly by resolving edi function
			//if data is not rewritten by in/out/inout clause inherit data from previous level
			var currentData = data, currentDataOut = dataOut
			if(bss['inout']){
				currentData = currentDataOut = this._get(bss['inout'], target, data, index)
			}
			if(bss['in']){
				currentData = this._get(bss['in'], target, data, index)
			}
			if(bss['out']){
				currentDataOut = this._get(bss['out'], target, data, index)
			}
			
			//prepare for possible recursion
			var recurse = bss.recurse ? this._get(bss['recurse'], target, currentData, index) : []
			var recurse = recurse ? (recurse instanceof Array ? recurse : [recurse]) : []
			
			console.log("recurse is",recurse, "currentData", currentData)
			
			if(currentData instanceof Array){
				//create replicas and remove originating node
				var replicas = []
				for (var i in currentData){ replicas.push(target.cloneNode(true)) }
				var parent = target.parentNode 
				parent.removeChild(target)
				//apply to all replicas
				for(var repl in replicas){
					var replica = replicas[repl]
					this._bindingCache.addApplyBinding(bss, rootBss, replica, currentData, repl)
					if(currentDataOut){
						//expect output data to be homomorphic to input data thus it needs to be an array of same size as the input
						this._bindingCache.addCommitBinding(bss, rootBss, replica, currentDataOut, repl)
					}
					this._registerEvents(bss, replica)
					parent.appendChild(replica)
					for(var rec in recurse){
						this._bind(recurse[rec], rootBss, replica, currentData[repl], currentDataOut ? currentDataOut[repl] : null, repl)
					}
				}
			}else{
				this._bindingCache.addApplyBinding(bss, rootBss, target, currentData, null)
				if(currentDataOut){
					this._bindingCache.addCommitBinding(bss, rootBss, target, currentDataOut, null)
				}
				this._registerEvents(bss, target)
				for(var rec in recurse){
					this._bind(recurse[rec], rootBss, target, currentData, currentDataOut, index)
				}
			}
		}
	},

	_registerEvents : function(bss, e){
		for(var k in bss){ 
			if (k == "on"){
				var eventMap = bss[k]
				for(var event in eventMap){
					var handlers = eventMap[event] instanceof Array ? eventMap[event] : [eventMap[event]]
					handlers.forEach( function(h){e.addEventListener(event, h, false)} )
				}
			}else	if(k.lastIndexOf("on_") == 0){
				//console.log("Found event ", k)
				var handlers = bss[k] instanceof Array ? bss[k] : [bss[k]]
				handlers.forEach( function(h){e.addEventListener(k.substring(3), h, false)} )
			}
		}
	},
	
	// The cache for apply and commit bindings
	_bindingCache : {
		applies : {},
		commits : {},
		
		clear : function(bss){
			this.applies[bss.id] = (this.applies[bss.id] ? this.applies[bss.id].splice() : [])
			this.commits[bss.id] = (this.commits[bss.id] ? this.commits[bss.id].splice() : [])
		},
		
		addApplyBinding : function(bss, rootBss, e, d, i){
			var b = { 
				element : e, 
				index : i, 
				transfer : (bss.apply ? bss.apply : function(){ return }),
				data : (i ? d[i] : d),
				container : (i ? d : null)
			}
			e.bss_input = b
			this.applies[rootBss.id].push(b)
		},

		addCommitBinding : function(bss, rootBss, e, d, i){
			var b = { 
				element : e, 
				index : i, 
				transfer : (bss.commit ? bss.commit : function(){ return }),
				data : (i ? d[i] : d),
				container : (i ? d : null),
				//shortcut to remove element from output container
				remove : (i ? function(){ this.container.splice(this.index, 1) } : function(){})
			}
			e.bss_output = b
			e.bss_binding = b //for back-compatibility with versions before 1.2.3
			this.commits[rootBss.id].push(b)
		},

		reapply : function(bss){
			if(this.applies[bss.id]){
				this.applies[bss.id].forEach(function(b){b.transfer(b.element, b.data, b.index)})
			}
		},

		commit : function(bss){
			if(this.commits[bss.id]){
				this.commits[bss.id].forEach(function(b){b.transfer(b.element, b.data, b.index)})
			}
		}
	}
}
