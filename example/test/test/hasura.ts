import { action } from "@cloudticon/functions";
export type TestActionArguments = {};
export type TestActionResults = Nullable<Cat>; // @ts-nocheck
/* tslint:disable */
type Nullable<T> = T | undefined | null;
export type Scalar = {
  String: string;
  Int: number;
  Float: number;
  Boolean: boolean;
  bigint: number;
  jsonb: any;
  timestamptz: Date | string;
  timestamp: Date | string;
};
export type Cat = {
  id: Scalar["String"];
  owner?: Nullable<Owner>;
  size?: Nullable<Size>;
  tags: Scalar["String"][];
};
export type Owner = {
  age?: Nullable<Scalar["Int"]>;
  name?: Nullable<Scalar["String"]>;
};
export enum Size {
  Big = "big",
  Small = "small",
}
export const test = action<TestActionArguments, TestActionResults>;
