/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  flattenValidationErrors,
  type SafeActionResult,
  type ValidationErrors,
} from "next-safe-action";
import type { z } from "zod";

/**
 * Determines if a server action is successful or not
 * A server action is successful if it has a data property and no serverError property
 *
 * @param action Return value of a server action
 * @returns A boolean indicating if the action is successful
 */
export const isActionSuccessful = <
  T extends z.ZodType,
  Data,
  CVE = ValidationErrors<T>,
>(
  action?: SafeActionResult<string, T, readonly [], any, CVE, Data>,
): action is {
  data: Data;
  serverError: undefined;
  validationError: undefined;
} => {
  if (!action) {
    return false;
  }

  if (action.serverError) {
    return false;
  }

  if (action.validationErrors) {
    return false;
  }

  return true;
};

/**
 * Converts an action result to a promise that resolves to false
 *
 * @param action Return value of a server action
 * @returns A promise that resolves to false
 */
export const resolveActionResult = async <
  T extends z.ZodType,
  Data,
  CVE = ValidationErrors<T>,
>(
  action: Promise<
    SafeActionResult<string, T, readonly [], any, CVE, Data> | undefined
  >,
): Promise<Data> => {
  return new Promise((resolve, reject) => {
    action
      .then((result) => {
        if (isActionSuccessful(result)) {
          resolve(result.data);
        } else {
          if (result?.validationErrors) {
            const str = validationErrorToString(result.validationErrors);
            return reject(new Error(str));
          }
          if (result?.serverError) {
            return reject(new Error(result.serverError));
          }
          reject(new Error(result?.serverError ?? "Something went wrong"));
        }
      })
      .catch((error) => {
        reject(new Error(error));
      });
  });
};

/**
 * Converts validation errors to a string
 *
 * @param validationError Validation errors from a server action
 * @returns A string representation of the validation errors
 */
export const validationErrorToString = (
  validationError: ValidationErrors<any>,
) => {
  const flatten = flattenValidationErrors(validationError);
  return Object.entries(flatten.fieldErrors)
    .map(([key, value]) => `${key}: ${value?.join(", ")}`)
    .join("\n");
};
