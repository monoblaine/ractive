import { defineProperty } from '../../../../utils/object';

const mutatorMethods = [ 'pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift' ];
let patchedArrayProto = [];

mutatorMethods.forEach( methodName => {
	const method = function ( ...args ) {
		const meta = this._ractive;

		if ( meta.setting ) {
			return Array.prototype[ methodName ].apply( this, arguments );
		}

		meta.setting = true;

		const first = meta.wrappers[0];

		// first one gets a shuffle
		args.unshift( first.keypath );
		const result = first.root[ methodName ].apply( first.root, args );

		// everyone else gets an update
		let i = meta.wrappers.length - 1;
		while ( i ) {
			const wrapper = meta.wrappers[i];
			wrapper.root.update( wrapper.keypath );
			i--;
		}

		meta.setting = false;

		return result.result;
	};

	defineProperty( patchedArrayProto, methodName, {
		value: method
	});
});

let patchArrayMethods;
let unpatchArrayMethods;

// can we use prototype chain injection?
// http://perfectionkills.com/how-ecmascript-5-still-does-not-allow-to-subclass-an-array/#wrappers_prototype_chain_injection
if ( ({}).__proto__ ) {
	// yes, we can
	patchArrayMethods = array => array.__proto__ = patchedArrayProto;
	unpatchArrayMethods = array => array.__proto__ = Array.prototype;
}

else {
	// no, we can't
	patchArrayMethods = array => {
		let i = mutatorMethods.length;
		while ( i-- ) {
			const methodName = mutatorMethods[i];
			defineProperty( array, methodName, {
				value: patchedArrayProto[ methodName ],
				configurable: true
			});
		}
	};

	unpatchArrayMethods = array => {
		let i = mutatorMethods.length;
		while ( i-- ) {
			delete array[ mutatorMethods[i] ];
		}
	};
}

patchArrayMethods.unpatch = unpatchArrayMethods; // TODO export separately?
export default patchArrayMethods;
