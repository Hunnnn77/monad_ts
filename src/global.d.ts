// deno-lint-ignore-file no-explicit-any
declare type Result<T, E = Error> = Ok<T> | Err<E>;
declare type Option<T> = Some<T> | None;

declare type Ok<T> = Pair<'ok', T>;
declare type Err<E = Error> = Pair<'err', E>;
declare type Some<T> = Pair<'some', T>;
declare type None = Pair<'none', null>;

declare type Nullable<T> = T | undefined | null;
declare type Tuple<T> = readonly [...Array<T>];
declare type Fn<F extends (...args: any[]) => unknown> = F extends
	(...args: infer In) => infer Out ? Pair<In, Out> : never;
declare type FnArgument<F extends (...args: any[]) => unknown> = F extends
	(...args: infer In) => infer Out ? Readonly<Select<Pair<In, Out>, 'L'>>
	: never;
declare type FnReturn<F extends (...args: any[]) => unknown> = F extends
	(...args: infer In) => infer Out ? Readonly<Select<Pair<In, Out>, 'R'>>
	: never;

declare type Pair<T, U> = readonly [T, U];
declare type Pairs<T, U> = Array<Pair<T, U>>;
declare type MapPair<T extends Pair<unknown, unknown>> = {
	l: Select<T, 'L'>;
	r: Select<T, 'R'>;
};
declare type MapPairs<T extends Pair<unknown, unknown>, K = _PairSide> = {
	[P in K as `${Lowercase<P extends string ? string : never>}`]: P extends 'L'
		? Array<T[0]>
		: P extends 'R' ? Array<T[1]>
		: never;
};
declare type Zip<T, U> = readonly [Array<T>, Array<U>];
declare type ZipFromPair<P extends Pair<unknown, unknown>> = Zip<
	Select<P, 'L'>,
	Select<P, 'R'>
>;

declare type _PairSide = Uppercase<'l' | 'r'>;
declare type Select<
	T extends Pair<unknown, unknown> | Pairs<unknown, unknown>,
	S extends _PairSide,
> = T extends Pair<infer L, infer R> ? S extends 'L' ? L
	: R
	: T extends Pairs<infer L, infer R> ? S extends 'L' ? L
		: R
	: never;
