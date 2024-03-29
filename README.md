# BSS

BSS (Binding Style Sheet) is a Javascript library for data and event - binding in data-driven HTML5 applications. 
The binding is realized through a declarative DSL (domain specific language) based on JSON and CSS3 selectors. 

## Version 

1.2.6

## Disclaimer
I'm pretty much aware of the fact that there are several possibilities for doing this with other tools and frameworks. 
Unfortunately I'm an old school software developer and as such I like creating things on my own whenever possible in order to exactly fit my own requirements.

## Requirements

So what were the requirements when I started writing BSS?

There are a set of organizational requirements first.

* **Really** small footprint. Currently the code of the JS library is sized around 6K in bytes while the minified version should come around 3K.
* Just accomplish one mission. BSS is thought and written to do data-binding: transferring data to UI elements and vice versa. Nothing else.
* ... well actually no. It also does event handling.
* BSS should have **ZERO** external dependencies neither to libraries nor installation or packaging tools.

Starting with version 1.2 the missions to be accomplished are two. Event-binding has been added. That is externalized and declaratively adding of event handlers to selected DOM elements.

Some more functional requirements focus on granting the maximum freedom to BSS users. Everything, in terms of application structure, is up to the developers.

Here they are:

* BSS should not be limited by browser compatibility in the first place. I use what I need independently of browser support.
* Try to use "reasonable" possibilities offered by HTML (5). Reasonable means the template tag, the CSS3 selectors and the querySelector interface but not yet the Object.observe interface.
* Data and event -binding has to be written as much as possible in a declarative form.
* The binding sheet has to be external to both the model and the view and no programming model has to be enforced. Thus no extra attributes or particular markup structure is needed for data-binding. 
* No cronological order is enforced with respect to the development of data models and UI elements. 
* No extra-events have to be raised or handled. 
* UI elements have to be accessed at the finest grain of their functionality. textContent and value attribute but also style attributes (i. e. position, visibility, colors, sizes ...) may be data bound.

## The language

The BSS language is a simple, declarative DSL based on JSON and CSS3 selectors. It is based on two phases:

* **apply**: during this phase the BSS instance is parsed and a cached representation of _application points_ and _commit points_ is created. If _apply transfer functions_ are present, data is transferred from the model to the UI elements.
* **commit** : during this phase, information stored in some form in the UI element is transferred to the model. The _commit points_ where the transfer occurs are read from the cached representation of the BSS instance.

The transfer functions are called _edi-functions_ because of their characteristic signature. 

    function (e, d, i){ ... }

* **e**: is the visual DOM element
* **d**: is the data element currently bound
* **i**: in the case of binding to an array data object BSS performs the automatic replication and i represents the index in the replication sequence. 

_d_ and _i_ may be undefined if no data is bound when the _edi-function_ is executed. 
The following two examples show respectively a typical example of apply transfer function and a commit transfer function.

    function (e, d, i){ e.value = d.val } //typical apply function
    function (e, d, i){ d.val = e.value } //typical commit function
    function (e, d, i){ return THE_DATA } //function for returning a data instance in cases where the model changes significantly as in AJAX provided data

A BSS instance is a recursive JSON object that contains the following fields:

* **id**: an identifier assigned to the root BSS instance. This is optional. The library assigns a random generated id to BSS instances that lack an id.
* **template**: in the root BSS instance this field is a CSS3 selector that identifies the template containing the prototype markup that will be replaced at the target.
* **target**: a CSS3 selector resolving to a DOM element where the data-binding will be applied. Starting from version 1.2.5, target may be an edi-function returning a custom nodeset of DOM elements. This is useful for returning immediate children with a give tagname for example which is impossible to achieve with CSS selectors.
* **roodocument**: added with version 1.2.6 to specify which is the root document to execute querySelectors on. Useful in presence of shadow doms (see example 8).
* **in** : a reference to a Javascript object or array that serves as input model.
* **out** : a reference to a Javascript object or array that serves as output model.
* **apply**: the transfer function to be applied during the apply phase for the current binding.
* **commit**: the transfer function to be applied during the commit phase for the current binding.
* **recurse**: a sub-bss (or an array of these) that causes a recursive evaluation of CSS3 selectors to the current target in order to navigate down the DOM structure. When descending the DOM structure with recurse, the models bound by the _in_ and _out_ fields are inherited. Starting with version 1.2.5 recurse is an edi-function which allows for building up dynamically BSS segments. This comes in quite handy when facing arbitarily nested structures (see Example 7).

* **on_{event}** : bind an event handler for the event named _{event}_ in the DOM (for instance click, load, input, ...) to the selected target. The assigned value may be a function an object implementing EventListener or an array of these. 
* **on** : bind all the events contained in an eventMap. This is useful for reusing complex eventing patterns accross different elements. The event map is a JSON object like {_event1_: handler, _event2_ : handler, ...} where _event_ is the name of a DOM event and handler may be a function, object implementing EventListener or an array of these. 

The following is a commented example for a form based BSS instance. To have an overview of more examples check the #Examples section.
    
    var one_bss = {
		id : "_BSS_EXAMPLE_FORM",
		template : "template#T1", //bind to a HTML template element whose contents will be written over the target 
		target : "form#THEFORM",  //a target form that will be replaced by the template content
		in : labels,
		out : restQuery,   //a JS object to fill in with the form values when committing
		recurse : [
			{
				target : "label[for=FIRSTNAME]",  //select label that refers to form input for First name.
			 	apply : function (e, d, i){ e.innerText = e.textContent = d.firstNameLabel} // set the label with data stored in a JS object
			},
			{
				target : "input#FIRSTNAME",  //recursively select the descendant input field with id FIRSTNAME.
				commit : function (e, d, i){ d.firstName = e.value} // set the field firstName of the output data object to the input's value
				on_input: function(evt){ console.log("Changed", this.value) }
			}
		]
	}

Besides _apply_ and _commit_, which must be _edi-functions_, every field of a BSS instance is allowed to be evaluated with an _edi-function_. The _edi-function_ must return a value corresponding to the data-type of the field. 

## The API

The following methods are the API entry points to the BSS phases.

* **BSS.apply(bss[, rootdocument])**: this runs an apply phase on the BSS instance passed as argument. _application points_ and _commit points_ are cached for quick re-application and commit. An optional rootdocument can be passed in order to override rootdocument specified in the bss itself. Falls back to global document.
* **BSS.reapply(bss)**: if the model does not change structurally, this means only values of already bound data fields have been modified, the light-weight re-application of the BSS instance is much quicker than a complete apply.
* **BSS.commit(bss)**: runs a commit phase on the passed BSS instance.
* **BSS.clean(bss)**: clears all cached structures for the passed BSS instnace and zeroes the markup generated inside a target. This is useful for resetting visuals.

In order to allow for a clean design, the only point where BSS has to modify the DOM is when binding an element to a datastructure. A BSS stub object is attached to the HTML element only for both input and output **bindings**.

The stub object for input bindings is accessible through the code:

	e.bss_input //the whole stub
	e.bss_input.data // the data object bound to the element
	e.bss_input.index //the index if the element is replicated

The stub object for output bindings is accessible through the code:

	e.bss_output //the whole stub
	e.bss_output.data // the data object bound to the element
	e.bss_output.index //the index if the element is replicated

Other elements of the stub object are currently undocumented and it's recommended not to use them.

With version 1.1 a remove functionality has been added only for **replicated output bindings**. 
This functionality comes in very handy in dynamic list based bindings allowing for the removal of replicas when binding to arrays of elements. The syntax to access the delete functionality is the following:

	e.bss_output.delete()

See example5.html for a small example.
	
	<ul id="thelist">
		<li>
			<span></span> 
			<!-- remove the li when clicking on the button labeled x. Remember to reapply the BSS! -->
			<input type="button" value="x" onclick="this.parentNode.bss_binding.remove(); BSS.apply(bss_list)"/>
		</li>
	</ul>

## Examples

In the folder _examples_ you'll find some self-contained examples of simple HTML apps that realize few common patterns that should be useful for understanding BSS.

## Copyright and Licence

BSS is copyright of Marco Lettere.

BSS is distributed under the [MIT licence].

[//]: # (These are reference links used in the body of this note and get stripped out when the markdown processor does its job. There is no need to format nicely because it shouldn't be seen. Thanks SO - http://stackoverflow.com/questions/4823468/store-comments-in-markdown-syntax)

   [MIT licence]: <https://opensource.org/licenses/MIT>

