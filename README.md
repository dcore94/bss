# BSS

BSS (Binding Style Sheet) is a Javascript library for databinding and data-driven HTML5 applications and pages. The data-binding is realized through a declarative DSL based on JSON and CSS3 selectors. 

## Version 

1.0

## Disclaimer
I'm pretty much aware of the fact that there are several possibilities for doing this with other tools and frameworks. Unfortunately I'm an old school software developer. As such I like to try creating things on my own whenever possible in order to exactly fit my own requirements.

## Requirements

So what were the requirements when I started writing BSS?

There are a set of organizational requirements first.

* **Really** small footprint. Currently the code of the JS library is mucch less the 6K in bytes while the minified version should come around 2.7K.
* Just do one thing. BSS is thought and written to do databinding. That is transferring data to UI elements and vice versa. Nothing else.
* BSS should have **ZERO** external dependencies neither from other libraries nor installation or packaging tools.

Some more functional requirements grant the maximum freedom to BSS users. Everything, in terms of application structure, is up to the developers. Actually, I find myself using BSS differently in dependence of whether I'm doing a small web page or a complicated RIA (are they still called that way?).

Here they are:

* BSS should not be limited by browser compatibility in the first place. Try to use "reasonable" possibilities offered by HTML (5). Reasonable means the template tag, the CSS3 selectors and the querySelector interface but not yet the Object.observe interface.
* Databinding has to be written as much as possible in a declarative form so it resolves to a JSON structure.
* The binding sheet has to be external to both the model and the view and no programming model has to be enforced. Thus no extra attributes or particular markup structure is needed for data-binding. 
* No cronological order is enforced for developing models or UIs. 
* No extra-events have to be raised or handled. 
* UI elements have to be accessed at the finest grain of their functionality. textContent and value attribute have to be bound exactly like style attributes (i. e. position, visibility, colors, sizes ...).

## The language

The BSS language is a simple, declarative DSL based on JSON and CSS3 selectors. It is based on two phases:

* **apply**: during this phase the BSS object is parsed and a cached representation of application and commit points is created. If apply transfer functions are present, data is transferred from the model to the UI elements.
* **commit** : during this phase, information stored in some form in the UI element is transferred to the model. The commit points are read from the cached BSS.

The transfer functions are called edi-function because of their characteristic signature. 

    function (e, d, i){ ... }

* **e**: is the visual DOM element
* **d**: is the data element currently bound
* **i**: in the case of binding to an array data object BSS performs the automatic replication and i represents the index in the replication sequence. 

The following two examples show respectively a typical example of apply transfer function and a commit transfer function.

    function (e, d, i){ e.value = d.val } //typical apply function
    function (e, d, i){ d.val = e.value } //typical commit function
    function (e, d, i){ return THE_DATA } //function for returning a data instance in cases where the model changes significantly as in AJAX provided data

A BSS object is a recursive JSON object that contains the following fields:

* **id**: an identifier assigned to the root BSS object. This is optional and the library assigns a random generated id to BSS objects that lack an id.
* **template**: in the root BSS object a CSS3 selector that identifies the template containing the prototype markup that will be replaced at the target.
* **target** : a CSS3 selector resolving to a DOM element where the data-binding will be applied.
* **in** : a reference to a Javascript object or array that serves as input model.
* **out** : a reference to a Javascript object or array that serves as output model.
* **apply**: the transfer function to be applied during the apply phase for the current binding.
* **commit**: the transfer function to be applied during the commit phase for the current binding.
* **recurse**: a recursive evaluation of CSS3 selectors is applied to the current target in order to navigate down the DOM structure. When descending the DOM structure with recurse, the models bound by the _in_ and _out_ fields are inherited.

The following is a commented example for a form based BSS instance. To have an overview of more examples check the Examples section.
    
    var one_bss = {
    		id : "_BSS_EXAMPLE_FORM",
		template : "template#T1", //bind to a HTML template element whose contents will be written over the target 
		target : "form#THEFORM",  //a target form that will be replaced by the template content
		in : labels,
		out : restQuery, 		 //a JS object to fill in with the form values when committing
		recurse : [
			{
				target : "label[for=FIRSTNAME]",  //select label that refers to form input for First name.
				apply : function (e, d, i){ e.innerText = e.textContent = d.firstNameLabel} // set the label with data stored in a JS object
			},
			{
				target : "input#FIRSTNAME",  //recursively select the descendant input field with id FIRSTNAME.
				commit : function (e, d, i){ d.firstName = e.value} // set the field firstName of the output data object to the input's value
			}
		]
	}

Besides apply and commit which must be edi-functions, actually every field of BSS object is allowed to be evaluated with an edi-function. This makes it possible to introduce an extra level of dynamic evaluation. 

## The API

The following methods are the API entry points to the BSS phases.

* **BSS.apply(bss)**: this runs an apply phase to passed BSS instance. application and commit points are cached for quick re-application and commit.
* **BSS.reapply(bss)**: if the model does not change structurally, this means only values of already bound data fields changed, the light-weight re-application of the BSS is much quicker than a complete apply.
* **BSS.commit(bss)**: runs a commit phase on the passed BSS instance.
* **BSS.clean(bss)**: clears all cached structures and the markup generated inside a target. This is useful for clearing visuals.

## Examples

In the folder www you'll find some self-contained examples of simple HTML apps that realize few common patterns that should be useful for understanding BSS.

## Copyright and Licence

BSS is copyright of Marco Lettere.

BSS is distributed under the [MIT licence].

[//]: # (These are reference links used in the body of this note and get stripped out when the markdown processor does its job. There is no need to format nicely because it shouldn't be seen. Thanks SO - http://stackoverflow.com/questions/4823468/store-comments-in-markdown-syntax)

   [MIT licence]: <https://opensource.org/licenses/MIT>

