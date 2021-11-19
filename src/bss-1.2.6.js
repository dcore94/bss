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

	/* Unified edi call to centralize error handling and logging */
	_call : function(f, e, d, i){
		try{
			return f(e,d,i)
		} catch (err){
			console.error("While calling edi function", f, "with (e d i) parameters", e, d, i, "got: ", err)
		}
	},

	/* Evaluates a field from a BSS instance checking whether it's an "edi function"*/
	_get : function (field, e, d, i){
		return typeof(field) == 'function' ? this._call(field, e, d, i) : field
	},

	/* Managing target which may be a function returning already a NodeList in addition to a css selector*/
	_selectTarget : function (tgt, e, d, i){
		return typeof(tgt) == 'function' ? this._call(tgt, e, d, i) : e.querySelector(tgt)
	},
	
	_selectTargets : function (tgt, e, d, i){
		return typeof(tgt) == 'function' ? this._call(tgt, e, d, i) : e.querySelectorAll(tgt)
	},

	_hasTemplate : function (bss){
		return typeof(bss["template"]) !== "undefined" && bss["template"] != null
	},

	//1.2.6: root bss is always necessary in order to access the rootdocument
	_getTemplate : function(bss, e, d, i){
		var templ = bss["template"]
		var template =  typeof(templ) == 'function' ? this._call(templ, e, d, i) : bss.rootdocument.querySelector(templ)
		if(template == null){
			throw "No template found " + templ
		}
		//Note that: importNode has to be performed on top level document
		return document.importNode(template.content, true) 
	},
	
	_setRootDocument : function(bss, rootdocument){
		//get root document to apply querySelector to. If not overriden in apply call or bss, defaults to global document.
		var rd = rootdocument ? rootdocument : this._get(bss["rootdocument"])
		rd = rd ? rd : document
		bss.rootdocument = rd
		return rd
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
				var	content  = template.children
				var	fragment = document.createDocumentFragment()
				template.style.display = "none";
				var node = null
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
		//1.2.6: the document to be used for querySelector is set on root bss in order to support querying in shadow doms
		var rd = this._setRootDocument(bss, bss.rootdocument ? bss.rootdocument : document)
		var target = this._selectTarget(bss.target, rd)
		if(target){
			target.innerHTML = ''
		}else{
			console.error("Target not found")
		}
	},

	/* Re-apply all cached bindings. This is useful for speeding up the change of shown values 
	 * when no structural changes have occurred in the model*/
	reapply : function (bss){
		this._bindingCache.reapply(bss)
	},

	/* Public entry point for the application of a BSS instance. 
	 * Takes care of extracting the BSS template (if any) and after applying the binding algorithm
	 * pastes the HTML output into the target declared at the top of the BSS */
	apply : function (bss, rootdocument){
		//var start = new Date()
		if(!bss.id) bss.id = (Math.random() * 10e11)|0
	
		this._bindingCache.clear(bss)
		
		//1.2.6: the document to be used for querySelector is set on root bss in order to support querying in shadow doms
		var rd = this._setRootDocument(bss, rootdocument)
		
		this._bind(bss, bss, bss.rootdocument)
		this.reapply(bss)
		var target = this._selectTarget(bss["target"], rd)
		if (target == null) {
			console.error("Target not found", bss.target)
			return
		}
		
		//console.log(new Date() - start)
	},

	_bindSingle : function (bss, rootBss, e, din, dout, i) {
		this._bindingCache.addApplyBinding(bss, rootBss, e, din, i)
		if (dout) {
			//expect output data to be homomorphic to input data thus it needs to be an array of same size as the input
			this._bindingCache.addCommitBinding(bss, rootBss, e, dout, i)
		}
		this._registerEvents(bss, e)
	},

	_bind : function(bss, rootBss, rootElement, data, dataOut, index){
				
		var targets = this._selectTargets(bss.target, rootElement, data, index)
		for(var ti=0, tl=targets.length; ti < tl; ti++){

			//for every element matched by target selector
			var target = targets[ti]

			//get data bound to target possibly by resolving edi function
			//if data is not rewritten by in/out/inout clause inherit data from previous level
			var currentData = this._getCurrentData(bss, target, data, index)
			var currentDataOut = this._getCurrentDataOut(bss, target, data, dataOut, index)

			//prepare for possible recursion
			var recurse = this._prepareRecurse(bss, target, currentData, index)

			//console.log("recurse is",recurse, "currentData", currentData)

			if(currentData instanceof Array){
				//create replicas and remove originating node
				var replicas = this._replaceTargetWithReplicas(bss, rootBss, target, currentData, index)

				//apply to all replicas
				for(var i in replicas){
					var e = replicas[i]
					// create edi-binding for each replicated e
					this._bindSingle(bss, rootBss, e, currentData, currentDataOut, i)
					for(var reci in recurse){
						this._bind(recurse[reci], rootBss, e, currentData[i], currentDataOut ? currentDataOut[i] : null, i)
					}
				}
			}else{
				target = this._replaceTarget(bss, target, currentData, null)

				// create edi-binding for targeted e with no index
				this._bindSingle(bss, rootBss, target, currentData, currentDataOut, null)
				for(var recj in recurse){
					this._bind(recurse[recj], rootBss, target, currentData, currentDataOut, index)
				}
			}
		}
	},

	_registerEvents : function(bss, e){
		var handlers = null
		for(var k in bss){
			if (k === "on"){
				var eventMap = bss[k]
				for(var event in eventMap){
					handlers = eventMap[event] instanceof Array ? eventMap[event] : [eventMap[event]]
					handlers.forEach( function(h){e.addEventListener(event, h, false)} )
				}
			}else	if(k.lastIndexOf("on_") === 0){
				handlers = bss[k] instanceof Array ? bss[k] : [bss[k]]
				handlers.forEach( function(h){e.addEventListener(k.substring(3), h, false)} )
			}
		}
	},
	
	_getCurrentData : function(bss, target, data, index){
		var currentData = data
		if(bss['inout']){
			currentData = this._get(bss['inout'], target, data, index)
		}
		if(bss['in']){
			currentData = this._get(bss['in'], target, data, index)
		}
		return currentData
	},

	_getCurrentDataOut : function(bss, target, data, dataOut, index){
		var currentDataOut = dataOut
		if(bss['inout']){
			currentDataOut = this._get(bss['inout'], target, data, index)
		}
		if(bss['out']){
			currentDataOut = this._get(bss['out'], target, data, index)
		}
		return currentDataOut
	},

	_prepareRecurse : function(bss, target, currentData, index){
		var recurse = bss.recurse ? this._get(bss['recurse'], target, currentData, index) : []
		recurse = recurse ? recurse : []
		return recurse instanceof Array ? recurse : [recurse]
	},

	_replaceTarget : function(bss, target, data, index) {
		var newtarget = target
		if(this._hasTemplate(bss)){
			newtarget = this._getTemplate(bss, target, data, index).firstElementChild
			target.parentNode.replaceChild(newtarget, target)
		}
		return newtarget
	},

	_replaceTargetWithReplicas : function(bss, rootBss, target, currentData, index){
		var replicas = []
		for(var i=0, j=currentData.length; i < j; i++){
			//redefining rootElement if template is overridden
			var replica = null
			if(this._hasTemplate(bss)){
				replica = this._getTemplate(rootBss, target, currentData, index).firstElementChild
			}else{
				replica = target.cloneNode(true)
			}
			replicas.push(replica)
			target.parentNode.appendChild(replica)
		}
		target.parentNode.removeChild(target)
		return replicas
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
				this.applies[bss.id].forEach(
					function(b){
						try{ b.transfer(b.element, b.data, b.index) } catch (err) { console.error("Error in apply", b.transfer, b.element, b.data, b.index) }
					}
				)
			}
		},

		commit : function(bss){
			if(this.commits[bss.id]){
				this.commits[bss.id].forEach(
					function(b){
						try{ b.transfer(b.element, b.data, b.index) } catch (err){ console.error("Error in commit",b.transfer, b.element, b.data, b.index) }
					}
				)
			}
		}
	}
}
