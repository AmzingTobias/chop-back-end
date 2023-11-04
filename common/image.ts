import fileSystem from "fs";

/**
 * Delete a file that has been saved
 * @param pathToFile The full path to the file
 * @returns Resolves true if the file is deleted, rejects on error
 */
export const deleteSavedFile = (pathToFile: string) => {
  return new Promise<boolean>((resolve, reject) => {
    fileSystem.unlink(pathToFile, (err) => {
      if (err) {
        console.error(err);
        reject();
      } else {
        resolve(true);
      }
    });
  });
};
