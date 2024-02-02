export const isArrayOfNumbers = (possibleArrayOfNumbers: any): boolean => {
  return (
    Array.isArray(possibleArrayOfNumbers) &&
    possibleArrayOfNumbers.every(
      (possibleNumber) => !Number.isNaN(Number(possibleNumber))
    )
  );
};

export const isArrayOfStrings = (possibleArrayOfStrings: any): boolean => {
  return (
    Array.isArray(possibleArrayOfStrings) &&
    possibleArrayOfStrings.every(
      (possibleString) => typeof possibleString === "string"
    )
  );
};
