export const hex8 = (value: number) => {
  return ("00" + (value >>> 0).toString(16)).slice(-2);
};

export const hex16 = (value: number) => {
  return ("0000" + (value >>> 0).toString(16)).slice(-4);
};
export const hex32 = (value: number) => {
  return ("00000000" + (value >>> 0).toString(16)).slice(-8);
};
