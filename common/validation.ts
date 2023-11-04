export const isArrayOfNumbers = (possibleArrayOfNumbers: any): boolean => {
  return (
    Array.isArray(possibleArrayOfNumbers) &&
    possibleArrayOfNumbers.every(
      (possibleNumber) => !Number.isNaN(Number(possibleNumber))
    )
  );
};
