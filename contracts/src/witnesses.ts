import { WitnessContext } from "@midnight-ntwrk/compact-runtime";

export type BrowseMePrivateState = {
  readonly callerAddress: Uint8Array;
};

export const createBrowseMePrivateState = (address: Uint8Array) => ({
  callerAddress: address,
});

export const witnesses = {
  callerAddress: ({ privateState }: WitnessContext<any, BrowseMePrivateState>): [BrowseMePrivateState, Uint8Array] =>
    [privateState, privateState.callerAddress],
};
