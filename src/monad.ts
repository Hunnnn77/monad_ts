export function pipe<A>(initialValue: A): Pipe<A, A> {
	// deno-lint-ignore no-explicit-any
	let result: any = initialValue;
	function _pipe<A, B>(f: Func<A, B>): Pipe<A, B> {
		return Object.assign(f, {
			then<C>(g: Func<B, C>): Pipe<A, C> {
				result = g(result);
				return _pipe<A, C>((a) => g(f(a)));
			},
			get(): B {
				return result;
			},
			getAs<R>(): R {
				return result as R;
			},
		});
	}
	return _pipe((a) => a);
}

export function unwrap<T>(target: Result<T> | Option<T>): T {
	switch (target[0]) {
		case 'none':
			throw new Error('none');
		case 'err':
			throw new Error('err');
		default:
			return target[1];
	}
}
export function unwrapOr<K extends string, T>(
	target: Result<T, Errs<K>>,
	_else: ErrCallback<K, T>,
): T;
export function unwrapOr<T>(
	target: Option<T>,
	_else: VoidCallback<T>,
): T;
export function unwrapOr<K extends string, T>(
	target: Result<T, Errs<K>> | Option<T>,
	_else: ErrCallback<K, T> | VoidCallback<T>,
): T {
	switch (target[0]) {
		case 'err':
			return (_else as ErrCallback<K, T>)(target[1]);
		case 'none':
			return (_else as VoidCallback<T>)();
		default:
			return target[1];
	}
}

export function match<K extends string, T, R0, R1>(
	target: Result<T, Errs<K>>,
	or: Pair<(resolve: T) => R0, ErrCallback<K, R1>>,
): R0 | R1;
export function match<T, R0, R1>(
	target: Option<T>,
	or: Pair<(resolve: T) => R1, VoidCallback<R1>>,
): R0 | R1;
export function match<K extends string, T, R0, R1>(
	target: Result<T, Errs<K>> | Option<T>,
	or: Pair<(resolve: T) => R0, ErrCallback<K, R1> | VoidCallback<R1>>,
): R0 | R1 {
	switch (target[0]) {
		case 'err':
			return (or[1] as ErrCallback<K, R1>)(target[1]);
		case 'none':
			return (or[1] as VoidCallback<R1>)();
		default:
			return or[0](target[1]);
	}
}

export function either<
	K extends string,
	T = unknown,
	R0 = unknown,
	R1 = unknown,
>(
	target: T | Errs<K>,
	or: Pair<
		(value: Exclude<typeof target, Errs>) => R0,
		(e: Extract<typeof target, Errs>) => R1
	>,
): T | R0 | R1 {
	if (
		target instanceof Error || target instanceof error
	) {
		return or[1](target);
	} else {
		return or[0](target as Exclude<typeof target, Errs>);
	}
}

export function isOk<T>(result: Result<T>): result is Ok<T> {
	return result[0] === 'ok';
}
export function isErr<T>(result: Result<T>): result is Err {
	return result[0] === 'err';
}
export function isSome<T>(option: Option<T>): option is Some<T> {
	return option[0] === 'some';
}
export function isNone<T>(option: Option<T>): option is None {
	return option[0] === 'none';
}

export class Try {
	private constructor() {}

	static catch<T>(t: () => T): Result<T> {
		try {
			return ['ok', t()];
		} catch (e: unknown) {
			if (e instanceof Error) {
				return ['err', e];
			}
		}
		return ['err', error.new<_Base>('panic', 'unexpected')];
	}

	static async wait<T>(p: () => Promise<T>): Promise<Result<T>> {
		try {
			return ['ok', await p()];
		} catch (e: unknown) {
			if (e instanceof Error) {
				return ['err', e];
			}
		}
		return ['err', error.new<_Base>('panic', 'unexpected')];
	}

	static async waits<T>(ps: () => Promise<T>[]): Promise<Result<T[]>> {
		const resolved: T[] = [];

		try {
			await Promise.allSettled(ps()).then((res) => {
				for (const r of res) {
					if (r.status === 'rejected') {
						continue;
					}
					resolved.push(r.value);
				}
			});
			return ['ok', await Promise.all(resolved)];
		} catch (e: unknown) {
			if (e instanceof Error) {
				return ['err', e];
			}
		}
		return ['err', error.new<_Base>('panic', 'unexpected')];
	}
}

export class error<Type extends string> extends Error {
	private constructor(
		public type: Type,
		public message: string,
		public data?: Record<string, unknown>,
		public option?: Record<'cause', unknown>,
	) {
		super(message, option);
	}

	public toMap(): Record<string, unknown> {
		const parsed = pipe(Try.catch(() => JSON.parse(this.message)))
			.then((r) => match(r, [(jsonParsed) => jsonParsed, (_) => null]))
			.getAs<Record<string, unknown> | null>();
		const fmt = {
			type: this.type,
			message: parsed ?? this.message,
		};
		const optional = {
			data: this.data ?? null,
			option: this.option ?? {},
		};
		return this.data || this.option ? Object.assign(fmt, optional) : fmt;
	}

	public static new<T extends string>(
		type: T,
		message: string,
		data?: Record<string, unknown>,
		option?: Record<'cause', unknown>,
	) {
		return new error<T>(type, message, data, option);
	}
}
export function eq<K extends string, R0, R1, K2 extends K = K>(
	e: error<K>,
	is: K2,
	or: Pair<VoidCallback<R0>, (e: error<Exclude<K, K2>>) => R1>,
): R0 | R1 {
	if (e.type === is) return or[0]();
	return or[1](e as error<Exclude<K, K2>>);
}
export function when<K extends string, R0 = unknown, R1 = unknown>(
	e: Errs<K>,
	pairs: Pair<
		(e: error<K>) => R0,
		(e: Error) => R1
	>,
): R0 | R1 {
	if (e instanceof error) {
		return pairs[0](e);
	} else {
		return pairs[1](e);
	}
}

type Func<A, B> = (_: A) => B;
interface Pipe<A, B> extends Func<A, B> {
	then<C>(g: Func<B, C>): Pipe<A, C>;
	get(): B;
	getAs<R>(): R;
}
type VoidCallback<R> = () => R;
type ErrCallback<K extends string, R> = (e: Errs<K>) => R;
export type Errs<K extends string = string> = Error | error<K>;
export type _Base = 'panic' | 'catch';
