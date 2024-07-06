declare type Result<T, E = Error> = Ok<T> | Err<E>;
declare type Option<T> = Some<T> | None;

declare type Ok<T> = Pair<'ok', T>;
declare type Err<E = Error> = Pair<'err', E>;
declare type Some<T> = Pair<'some', T>;
declare type None = Pair<'none', null>;

declare type VoidCallback<R> = () => R;
declare type VoidOr<T> = T | void;
declare type NonVoid<T> = T extends void ? never : T;
declare type Nullable<T> = T | null;

declare type Fn<F extends (...args: unknown[]) => unknown> = F extends (
	...args: infer In
) => infer Out
	? Pair<In, Out>
	: never;
declare type FnArgument<F extends (...args: unknown[]) => unknown> = F extends (
	...args: infer In
) => infer Out
	? Readonly<Select<Pair<In, Out>, 'L'>>
	: never;
declare type FnReturn<F extends (...args: unknown[]) => unknown> = F extends (
	...args: infer In
) => infer Out
	? Readonly<Select<Pair<In, Out>, 'R'>>
	: never;

declare type Pair<T, U> = readonly [T, U];
declare type _PairSide = Uppercase<'l' | 'r'>;
declare type Select<
	T extends Pair<unknown, unknown>,
	S extends _PairSide,
> = T extends Pair<infer L, infer R> ? (S extends 'L' ? L : R) : never;
