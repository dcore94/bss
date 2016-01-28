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
			this._apply(bss, bss, newtarget)
			var targetStr = this._get(bss.target)
			var target = document.querySelector(targetStr)
			if (target == null) {
				console.error("Target not found", targetStr)
				return;
			}
			target.parentNode.replaceChild(newtarget, target)
		}else{
			this._apply(bss, bss, document)
		}
		//console.log(new Date() - start)
	},

	/* Recursive core algorithm for the application of a BSS instance. 
	 * Generates HTML output based on the BSS and caches input bindings to be re-used with re-apply.
	 * Generates the cache of output bindings to be executed on commit*/
	_apply : function(bss, rootBss, selectorRoot, dataIn, dataOut, index){
		var root = selectorRoot.querySelectorAll(this._get(bss.target, null, dataIn, index))
		
		//prepare data references for in and out
		var currentInData = bss['in'] ? this._get(bss['in'], root, dataIn, index) : dataIn
		var currentOutData = bss['out'] ? this._get(bss['out'], root, dataOut, index) : dataOut
		var currentIndex = index

		//prepare for possible recursion
		var recurse = bss.recurse ? (bss.recurse instanceof Array ? bss.recurse : [bss.recurse]) : []

		//console.log("root", root, "bss", bss, "in", bss["in"], "current in data", currentInData)
		for (var i=0; i < root.length; i++){
			var e = root.item(i)
			//console.log("root is", e)
			if(currentInData instanceof Array){
				//create replicas and remove originating node
				//console.log("removing ", e, "replicated into ", replicas)
				var replicas = []
				for (var i in currentInData){ replicas.push(e.cloneNode(true)) }
				var parent = e.parentNode 
				parent.removeChild(e)
				//apply to all replicas
				for(var repl in replicas){
					var replica = replicas[repl]
					var indexedCurrentOutData = (currentOutData instanceof Array ? currentOutData[repl] : currentOutData)
					this._bind(rootBss, bss, replica, repl, currentInData[repl], indexedCurrentOutData, currentOutData)
					this._registerEvents(bss, replica)
					parent.appendChild(replica)
					for(var rec in recurse){
							this._apply(recurse[rec], rootBss, replica, currentInData[repl], indexedCurrentOutData, Number(repl))
					}
				}
			}else{
				this._bind(rootBss, bss, e, null, currentInData, currentOutData, null)
				this._registerEvents(bss, e)
				for(var rec in recurse){
					this._apply(recurse[rec],rootBss, e, currentInData, currentOutData, currentIndex)
				}
			}
		}
	},
	
	_bind : function(rootBss, bss, e, index, inData, outData, outDataContainer){
		if(inData){
			var binding = this._bindingCache.newBinding(e, inData, index, bss.apply)
			binding.transfer()
			this._bindingCache.addApplyBinding(rootBss, binding)
		}
		if(outData){
			var binding = this._bindingCache.newBinding(e, outData, index, bss.commit, outDataContainer)
			this._bindingCache.addCommitBinding(rootBss, binding)
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
			}else	if(k.startsWith("on_")){
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
		
		addApplyBinding : function(bss, binding){
			this.applies[bss.id].push(binding)
		},

		addCommitBinding : function(bss, binding){
			this.commits[bss.id].push(binding)
		},

		reapply : function(bss){
			if(this.applies[bss.id]){
				this.applies[bss.id].forEach(function(b){b.transfer()})
			}
		},

		commit : function(bss){
			if(this.commits[bss.id]){
				this.commits[bss.id].forEach(function(b){b.transfer()})
			}
		},
	
		//factory method for a single binding point
		newBinding : function (e, d, i, f, container){
			var b = {
				element : e, data : d, index : i, fun : f,
				transfer : function(){ if(this.fun) this.fun(this.element, this.data, this.index) }
			}
			if(container){
				b.container = container
				e.bss_binding = b
				b.remove = function(){ this.container.splice(this.index, 1) }
			}
			return b
		}
	}
}
