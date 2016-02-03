## Version 1.2.1

* Added an example that demonstrates the injection of BSS structures in order to bind arbitrary nested trtee structures
* Fixed library to make even _recurse_ a possible _edi-function_.

## Version 1.2

* Major
  + Added Event binding
	
* Minor
  + Passed from constructors to a slightly more compact JS object notation for BSS classes
  + Refactored binding code into one single function which is called from both replicated and non replicated bindings
  + Added check on type for _recurse_ keyword. _recurse_ now accepts also a single _bss_ in addition to arrays of them.
  + Rewritten all the examples (now 6) to exploit the new event binding feature

## Version 1.1

* Major
  + Added functionality for removal of replicas for output bound, replicated elements.

* Minor
  + Corrected some indentation issues in the core code.
  + Fixed reference to JS script from inside the examples.
  + Added licence note on examples where missing 

## Version 1.0

First release.


