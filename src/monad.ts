type ErrCallback<K extends string, R> = (e: error<K>) => R;
type _Catch = 'catchSync' | 'unreachable';
type _CatchAsync = 'catchAsync' | 'unreachable';

export function unwrap<T, K extends string>(
	target: Result<T, error<K>> | Option<T>,
): T {
	switch (target[0]) {
		case 'none':
			throw error.New<K>('none' as K);
		case 'err':
			throw error.New<K>('err' as K);
		default:
			return target[1];
	}
}

export function unwrapOr<T, K extends string>(
	target: Result<T, error<K>> | Option<T>,
	fallback: T,
): T {
	switch (target[0]) {
		case 'none':
			return fallback;
		case 'err':
			return fallback;
		default:
			return target[1];
	}
}

export function unwrapOrElse<T, K extends string, R extends VoidOr<T>>(
	target: Result<T, error<K>>,
	_else: ErrCallback<K, R>,
): T | R;
export function unwrapOrElse<T, R extends VoidOr<T>>(
	target: Option<T>,
	_else: VoidCallback<R>,
): T | R;
export function unwrapOrElse<T, K extends string, R extends VoidOr<T>>(
	target: Result<T, error<K>> | Option<T>,
	_else: ErrCallback<K, R> | VoidCallback<R>,
): T | R {
	switch (target[0]) {
		case 'err':
			return _else(error.has(target[1])!);
		case 'none':
			return (_else as VoidCallback<R>)();
		default:
			return target[1];
	}
}

export function match<T, K extends string, R extends VoidOr<T>>(
	target: Result<T, error<K>>,
	or: Pair<(resolve: T) => T, ErrCallback<K, R>>,
): T | R;
export function match<T, R extends VoidOr<T>>(
	target: Option<T>,
	or: Pair<(resolve: T) => T, VoidCallback<R>>,
): T | R;
export function match<T, K extends string, R extends VoidOr<T>>(
	target: Result<T, error<K>> | Option<T>,
	or: Pair<(resolve: T) => T, ErrCallback<K, R> | VoidCallback<R>>,
): T | R {
	switch (target[0]) {
		case 'err':
			return or[1](error.has(target[1])!);
		case 'none':
			return (or[1] as VoidCallback<R>)();
		default:
			return or[0](target[1]);
	}
}

export class Try {
	static catch<T>(t: () => T): Result<T, error<_Catch>> {
		try {
			return ['ok', t()];
		} catch (e: unknown) {
			if (e instanceof Error) {
				return ['err', error.New('catchSync', {}, e.message)];
			}
		}
		return ['err', error.New('unreachable')];
	}

	static async wait<T>(
		p: () => Promise<T>,
	): Promise<Result<T, error<_CatchAsync>>> {
		try {
			return ['ok', await p()];
		} catch (e: unknown) {
			if (e instanceof Error) {
				return ['err', error.New('catchAsync', {}, e.message)];
			}
		}
		return ['err', error.New('unreachable')];
	}

	static async waits<T>(
		ps: () => Promise<T>[],
	): Promise<Result<T[], error<_CatchAsync>>> {
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
				return ['err', error.New('catchAsync', {}, e.message)];
			}
		}
		return ['err', error.New('unreachable')];
	}
}

export class error<Type extends string> extends Error {
	private constructor(
		public readonly type: Type,
		public override readonly message: string,
		public readonly fallback?: Record<string, unknown>,
		public readonly option?: ErrorOptions,
	) {
		super(message, option);
	}

	static New<T extends string>(
		type: T,
		args?: Partial<{
			fallback: Record<string, unknown>;
			option: ErrorOptions;
		}>,
		message?: string,
	): error<T> {
		const { fallback, option } = args ?? {};
		return new error<T>(type, message ?? 'no message', fallback, option);
	}

	static is<T extends string>(e: Error | error<T>): e is error<T> {
		return e && e instanceof error && 'type' in e;
	}

	static has<T extends string>(
		e: Nullable<Error | error<T>>,
	): Nullable<error<T>> {
		if (e) {
			if (this.is(e)) {
				return e;
			} else {
				return this.from(e);
			}
		}
		return null;
	}

	static from<K extends string>(e: Error): error<K> {
		return error.New<K>(
			e.name as K,
			{
				option: {
					cause: e.cause,
				},
			},
			e.message,
		);
	}

	toMap(): {
		type: Type;
		message: string;
		data?: Record<string, unknown>;
		option?: ErrorOptions;
	} {
		const parsed: Record<string, unknown> = match(
			Try.catch(() => JSON.parse(this.message)),
			[
				(jsonParsed) => jsonParsed,
				(e) => ({
					err: e,
				}),
			],
		);
		const fmt = {
			type: this.type,
			message: this.message,
		};
		const optional = {
			fallback: Object.assign(parsed, this.fallback ?? {}) ?? {},
			option: this.option ?? {},
		};
		return this.fallback || this.option ? Object.assign(fmt, optional) : fmt;
	}

	static match<K extends string, R>(
		e: error<K>,
		by: (e: error<K>) => VoidOr<R>,
	): VoidOr<R> {
		return by(e);
	}

	static let<K extends string, R>(
		e: error<K>,
		err: K,
		andThen: (e: error<K>) => VoidOr<R>,
	): VoidOr<R> {
		if (e.type === err) {
			return andThen(e);
		}
	}
}

export function isVoid<T>(value: VoidOr<T>): value is void {
	return value === undefined && typeof value === 'undefined';
}
