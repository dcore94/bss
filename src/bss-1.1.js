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

var BSS = new _BSS();

function _BSS(){
	this._bindingCache = new _BindingCache()
}

/* Evaluates a field from a BSS instance checking whether it's an "edi function"*/
_BSS.prototype._get = function (field, e, d, i){
	return typeof(field) == 'function' ? field(e, d, i) : field
};

/* Commits all databindings of one BSS instance back to the model*/
_BSS.prototype.commit = function (bss){
	this._bindingCache.commit(bss)
};

/* Destroys all bindings cached in bindingCache and erases all generated HTML output*/
_BSS.prototype.clear = function (bss){
	this._bindingCache.clear(bss)
	var target = document.querySelector(this.get(bss.target))
	target.innerHTML = ''
};

/* Re-apply all cached bindings. This is useful for speeding up the change of shown values 
 * when no structural changes have occurred in the model*/
_BSS.prototype.reapply = function (bss){
	this._bindingCache.reapply(bss)
};

/* Public entry point for the application of a BSS instance. 
 * Takes care of extracting the BSS template (if any) and after applying the binding algorithm
 * pastes the HTML output into the target declared at the top of the BSS */
_BSS.prototype.apply = function (bss){
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
};

/* Recursive core algorithm for the application of a BSS instance. 
 * Generates HTML output based on the BSS and caches input bindings to be re-used with re-apply.
 * Generates the cache of output bindings to be executed on commit*/
_BSS.prototype._apply = function(bss, rootBss, selectorRoot, dataIn, dataOut, index){
	var root = selectorRoot.querySelectorAll(this._get(bss.target, null, dataIn, index))
	var currentInData = bss['in'] ? this._get(bss['in'], root, dataIn, index) : dataIn
	var currentOutData = bss['out'] ? this._get(bss['out'], root, dataOut, index) : dataOut
	var currentIndex = index
	//console.log("root -> target", root, bss, bss["in"], currentInData)
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
				if(true || bss.apply){
					var binding = new _Binding(replica, currentInData[repl], Number(repl), bss.apply)
					binding.transfer()
					this._bindingCache.addApplyBinding(rootBss, binding)
				}
				var indexedCurrentOutData = (currentOutData instanceof Array ? currentOutData[repl] : currentOutData)
				if(true || bss.commit){
					var binding = new _Binding(replica, indexedCurrentOutData, Number(repl), bss.commit, currentOutData)
					this._bindingCache.addCommitBinding(rootBss, binding)
				}
				parent.appendChild(replica)
				if(bss.recurse){
					for(var rec in bss.recurse){
						this._apply(bss.recurse[rec], rootBss, replica, currentInData[repl], indexedCurrentOutData, Number(repl))
					}
				}
			}
		}else{
			if(true||bss.apply){
				var binding = new _Binding(e, currentInData, currentIndex, bss.apply)
				//console.log("creating apply binding with data: ", binding)
				binding.transfer()
				this._bindingCache.addApplyBinding(rootBss, binding)
			}
			if(true||bss.commit){
				var binding = new _Binding(e, currentOutData, currentIndex, bss.commit)
				//console.log("creating commit binding with data: ", currentOutData, binding)
				this._bindingCache.addCommitBinding(rootBss, binding)
			}
			if(bss.recurse){
				for(var rec in bss.recurse){
					this._apply(bss.recurse[rec],rootBss, e, currentInData, currentOutData, currentIndex)
				}
			}
		}
	}
}

function _BindingCache(){
	this.applies = {}
	this.commits = {}
}

_BindingCache.prototype.clear = function(bss){
	this.applies[bss.id] = (this.applies[bss.id] ? this.applies[bss.id].splice() : [])
	this.commits[bss.id] = (this.commits[bss.id] ? this.commits[bss.id].splice() : [])
};

_BindingCache.prototype.addApplyBinding = function(bss, binding){
	this.applies[bss.id].push(binding)
};

_BindingCache.prototype.addCommitBinding = function(bss, binding){
	this.commits[bss.id].push(binding)
};

_BindingCache.prototype.reapply = function(bss){
	if(this.applies[bss.id]){
		this.applies[bss.id].forEach(function(b){b.transfer()})
	}
};

_BindingCache.prototype.commit = function(bss){
	if(this.commits[bss.id]){
		this.commits[bss.id].forEach(function(b){b.transfer()})
	}
};

function _Binding(e, d, i, f, container){
	this.element = e
	this.data = d
	this.index = i
	this.fun = f
	if(container){
		this.container = container
		this.element.bss_binding = this
	}
}

_Binding.prototype.transfer = function(){
	if(this.fun) this.fun(this.element, this.data, this.index)
};

_Binding.prototype.remove = function(){
	this.container.splice(this.index, 1)
};
