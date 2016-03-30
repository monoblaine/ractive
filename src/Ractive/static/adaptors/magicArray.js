import magicAdaptor from './magic';
import arrayAdaptor from './array/index';

class MagicArrayWrapper {
	constructor ( ractive, array, keypath ) {
		this.value = array;

		this.magic = true;

		this.magicWrapper = magicAdaptor.wrap( ractive, array, keypath );
		this.arrayWrapper = arrayAdaptor.wrap( ractive, array, keypath );
	}

	get () {
		return this.value;
	}

	teardown () {
		this.arrayWrapper.teardown();
		this.magicWrapper.teardown();
	}
}

export default {
	filter ( object, keypath, ractive ) {
		return magicAdaptor.filter( object, keypath, ractive ) && arrayAdaptor.filter( object );
	},

	wrap ( ractive, array, keypath ) {
		return new MagicArrayWrapper( ractive, array, keypath );
	}
};
