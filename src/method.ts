export const ALL_HTTP_METHODS = [
  'GET',
  'POST',
  'PATCH',
  'PUT',
  'DELETE',
] as const;

export type Method = (typeof ALL_HTTP_METHODS)[number];

export const stringIsMethod = (arg: string): arg is Method => ALL_HTTP_METHODS.includes(arg as Method);
