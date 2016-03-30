import { defineProperty } from '../../../../utils/object';
import { isArray } from '../../../../utils/is';
import patch from './patch';

export default {
	filter ( object ) {
		// wrap the array if a) b) it's an array, and b) either it hasn't been wrapped already,
		// or the array didn't trigger the get() itself
		return isArray( object ) && ( !object._ractive || !object._ractive.setting );
	},
	wrap ( ractive, array, keypath ) {
		return new ArrayWrapper( ractive, array, keypath );
	}
};

class ArrayWrapper {
	constructor ( ractive, array, keypath ) {
		this.root = ractive;
		this.value = array;
		this.keypath = keypath;

		// if this array hasn't already been ractified, ractify it
		if ( !array._ractive ) {
			// define a non-enumerable _ractive property to store the wrappers
			defineProperty( array, '_ractive', {
				value: {
					wrappers: [],
					setting: false
				},
				configurable: true
			});

			patch( array );
		}

		array._ractive.wrappers.push( this );
	}

	get () {
		return this.value;
	}

	teardown () {
		const array = this.value;
		const meta = array._ractive;

		// apparently already torn down, so nothing to do
		if ( !meta ) return;

		meta.wrappers.splice( meta.wrappers.indexOf( this, 1 ) );

		// if nothing else depends on this array, we can revert it to its
		// natural state
		if ( !meta.wrappers.length ) {
			delete array._ractive;
			patch.unpatch( array );
		}
	}
}
