import Model from '../../model/Model';
import ComputationChild from '../../model/ComputationChild';
import { handleChange, unbind } from '../../shared/methodCallers';
import getFunction from '../../shared/getFunction';
import resolveReference from './resolveReference';
import { removeFromArray } from '../../utils/array';
import runloop from '../../global/runloop';

function getValue ( model ) {
	return model ? model.get( true ) : undefined;
}

export default class ExpressionProxy extends Model {
	constructor ( fragment, template ) {
		super( fragment.ractive.viewmodel, null );

		this.fragment = fragment;
		this.template = template;

		this.isReadonly = true;

		this.fn = getFunction( template.s, template.r.length );
		this.computation = null;

		this.resolvers = [];
		this.models = this.template.r.map( ( ref, index ) => {
			const model = resolveReference( this.fragment, ref );
			let resolver;

			if ( !model ) {
				resolver = this.fragment.resolve( ref, model => {
					removeFromArray( this.resolvers, resolver );
					this.models[ index ] = model;
					this.bubble();
				});

				this.resolvers.push( resolver );
			}

			return model;
		});

		this.bubble();
	}

	bubble () {
		const ractive = this.fragment.ractive;

		const key = this.getComputationKey();
		// TODO can/should we reuse computations?
		const signature = this.getSignature( key );

		const computation = ractive.viewmodel.compute( key, signature );

		this.value = computation.get(); // TODO should not need this, eventually

		if ( this.computation ) {
			this.computation.unregister( this );
			// notify children...
		}

		this.computation = computation;
		computation.register( this );

		this.handleChange();
	}

	get ( shouldCapture ) {
		return this.computation.get( shouldCapture );
	}

	getKeypath () {
		return this.computation ? this.computation.getKeypath() : '@undefined';
	}

	getComputationKey () {
		// TODO the @ prevents computed props from shadowing keypaths, but the real
		// question is why it's a computed prop in the first place... (hint, it's
		// to do with {{else}} blocks)
		return '@' + this.template.s.replace( /_(\d+)/g, ( match, i ) => {
			if ( i >= this.models.length ) return match;

			const model = this.models[i];
			return model ? model.getKeypath() : '@undefined';
		});

	}

	getSignature ( key ) {
		const signature = {
			models: this.models.slice(0),
			fn: this.fn,
			getterString: key
		};

		signature.getter = (function () {
			const values = this.models.map( getValue );
			return this.fn.apply( this.ractive, values );
		}).bind( signature );

		return signature;
	}

	handleChange () {
		this.deps.forEach( handleChange );
		this.children.forEach( handleChange );

		this.clearUnresolveds();
	}

	joinKey ( key ) {
		if ( key === undefined || key === '' ) return this;

		if ( !this.childByKey.hasOwnProperty( key ) ) {
			const child = new ComputationChild( this, key );
			this.children.push( child );
			this.childByKey[ key ] = child;
		}

		return this.childByKey[ key ];
	}

	mark () {
		this.handleChange();
	}

	rebind () {
		this.models = this.models.map( ( m, index ) => {
			let next = runloop.rebind( m );
			if ( next === 0 ) next = m;
			if ( !next ) next = resolveReference( this.fragment, this.template.r[index] );
			return next;
		});
		let key = this.getComputationKey();
		let computation = this.root.computations[ key ];

		if ( !computation ) {
			const signature = this.getSignature( key );
			computation = this.root.compute( key, signature );
		}
		if ( this.computation !== computation ) {
			this.computation.unregister( this );
			if ( computation ) {
				this.computation = computation;
				computation.register( this );
				this.value = computation.get();
				this.handleChange();
			}
		}
		return this;
	}

	retrieve () {
		return this.get();
	}

	unbind () {
		this.resolvers.forEach( unbind );
	}
}
