import { PARAM_DELIMITER } from './constants.ts';

interface ISplitByNextParamResult {
  readonly head?: string;
  readonly paramName?: string;
  readonly tail?: string;
}

export const splitStringToFirstOccurence = (
  arg: string,
  delimiter: string,
  trim = false,
): [string, string | undefined] => {
  const occurenceIdx = arg.indexOf(delimiter);
  return occurenceIdx !== -1
    ? [
      arg.substring(0, occurenceIdx),
      arg.substring(occurenceIdx + (trim ? delimiter.length : 0)),
    ]
    : [arg, undefined];
};

export const splitByNextParam = (path: string): ISplitByNextParamResult => {
  const [head, tailWithParam] = splitStringToFirstOccurence(
    path,
    `/${PARAM_DELIMITER}`,
    true,
  );
  if (!tailWithParam) {
    return { head };
  }

  const [paramName, tail] = splitStringToFirstOccurence(tailWithParam, '/');
  return { head, paramName, tail };
};

export interface IGetCommonSubstringResult {
  readonly tail1?: string;
  readonly tail2?: string;
  readonly common?: string;
}

export const getCommonSubstring = (
  arg1: string,
  arg2: string,
): IGetCommonSubstringResult => {
  const length = arg1.length >= arg2.length ? arg1.length : arg2.length;

  const inner = (
    idx = 0,
    acc = '',
    tail1 = arg1,
    tail2 = arg2,
  ): IGetCommonSubstringResult =>
    (idx === length) || (tail1[0] !== tail2[0])
      ? {
        tail1: tail1 !== '' ? tail1 : undefined,
        tail2: tail2 !== '' ? tail2 : undefined,
        common: acc !== '' ? acc : undefined,
      }
      : inner(idx + 1, acc + tail1[0], tail1.substring(1), tail2.substring(1));

  return inner();
};
