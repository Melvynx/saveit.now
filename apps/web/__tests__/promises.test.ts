import { describe, it, expect } from "vitest";
import { safePromise, unwrapSafePromise } from "../src/lib/promises";

describe("promises", () => {
  describe("safePromise", () => {
    it("should return data when promise resolves", async () => {
      const successPromise = Promise.resolve("success");
      const result = await safePromise(successPromise);
      
      expect(result).toEqual({
        data: "success",
        error: null,
      });
    });

    it("should return error when promise rejects with Error", async () => {
      const errorMessage = "Something went wrong";
      const failPromise = Promise.reject(new Error(errorMessage));
      const result = await safePromise(failPromise);
      
      expect(result).toEqual({
        data: null,
        error: new Error(errorMessage),
      });
    });

    it("should return error when promise rejects with string", async () => {
      const errorMessage = "String error";
      const failPromise = Promise.reject(errorMessage);
      const result = await safePromise(failPromise);
      
      expect(result).toEqual({
        data: null,
        error: new Error(errorMessage),
      });
    });

    it("should return error when promise rejects with non-Error object", async () => {
      const errorObject = { code: 404, message: "Not found" };
      const failPromise = Promise.reject(errorObject);
      const result = await safePromise(failPromise);
      
      expect(result).toEqual({
        data: null,
        error: new Error("[object Object]"),
      });
    });

    it("should return error when promise rejects with null", async () => {
      const failPromise = Promise.reject(null);
      const result = await safePromise(failPromise);
      
      expect(result).toEqual({
        data: null,
        error: new Error("null"),
      });
    });

    it("should return error when promise rejects with undefined", async () => {
      const failPromise = Promise.reject(undefined);
      const result = await safePromise(failPromise);
      
      expect(result).toEqual({
        data: null,
        error: new Error("undefined"),
      });
    });

    it("should handle promise that resolves with null", async () => {
      const nullPromise = Promise.resolve(null);
      const result = await safePromise(nullPromise);
      
      expect(result).toEqual({
        data: null,
        error: null,
      });
    });

    it("should handle promise that resolves with undefined", async () => {
      const undefinedPromise = Promise.resolve(undefined);
      const result = await safePromise(undefinedPromise);
      
      expect(result).toEqual({
        data: undefined,
        error: null,
      });
    });

    it("should handle promise that resolves with complex object", async () => {
      const complexObject = {
        id: 1,
        name: "test",
        nested: { value: true },
        array: [1, 2, 3],
      };
      const complexPromise = Promise.resolve(complexObject);
      const result = await safePromise(complexPromise);
      
      expect(result).toEqual({
        data: complexObject,
        error: null,
      });
    });

    it("should handle promise that resolves with boolean", async () => {
      const booleanPromise = Promise.resolve(false);
      const result = await safePromise(booleanPromise);
      
      expect(result).toEqual({
        data: false,
        error: null,
      });
    });

    it("should handle promise that resolves with number", async () => {
      const numberPromise = Promise.resolve(42);
      const result = await safePromise(numberPromise);
      
      expect(result).toEqual({
        data: 42,
        error: null,
      });
    });

    it("should preserve original Error instance", async () => {
      class CustomError extends Error {
        code: number;
        constructor(message: string, code: number) {
          super(message);
          this.code = code;
        }
      }
      
      const customError = new CustomError("Custom error message", 500);
      const failPromise = Promise.reject(customError);
      const result = await safePromise(failPromise);
      
      expect(result.error).toBe(customError);
      expect(result.error).toBeInstanceOf(CustomError);
      expect((result.error as CustomError).code).toBe(500);
    });
  });

  describe("unwrapSafePromise", () => {
    it("should return data when no error", async () => {
      const safeResult = Promise.resolve({
        data: "success",
        error: null,
      });
      
      const result = await unwrapSafePromise(safeResult);
      expect(result).toBe("success");
    });

    it("should throw error when error is present", async () => {
      const error = new Error("Test error");
      const safeResult = Promise.resolve({
        data: null,
        error,
      });
      
      await expect(unwrapSafePromise(safeResult)).rejects.toThrow("Test error");
    });

    it("should throw error when data is null and no error provided", async () => {
      const safeResult = Promise.resolve({
        data: null,
        error: null,
      });
      
      await expect(unwrapSafePromise(safeResult)).rejects.toThrow(
        "Data is null but no error was provided"
      );
    });

    it("should return data when data is valid but falsy", async () => {
      const safeResult = Promise.resolve({
        data: false,
        error: null,
      });
      
      const result = await unwrapSafePromise(safeResult);
      expect(result).toBe(false);
    });

    it("should return data when data is 0", async () => {
      const safeResult = Promise.resolve({
        data: 0,
        error: null,
      });
      
      const result = await unwrapSafePromise(safeResult);
      expect(result).toBe(0);
    });

    it("should return data when data is empty string", async () => {
      const safeResult = Promise.resolve({
        data: "",
        error: null,
      });
      
      const result = await unwrapSafePromise(safeResult);
      expect(result).toBe("");
    });

    it("should return data when data is undefined", async () => {
      const safeResult = Promise.resolve({
        data: undefined,
        error: null,
      });
      
      const result = await unwrapSafePromise(safeResult);
      expect(result).toBe(undefined);
    });

    it("should throw custom error types", async () => {
      class CustomError extends Error {
        code: number;
        constructor(message: string, code: number) {
          super(message);
          this.code = code;
        }
      }
      
      const customError = new CustomError("Custom error", 404);
      const safeResult = Promise.resolve({
        data: null,
        error: customError,
      });
      
      await expect(unwrapSafePromise(safeResult)).rejects.toThrow(CustomError);
      await expect(unwrapSafePromise(safeResult)).rejects.toThrow("Custom error");
    });

    it("should handle complex data objects", async () => {
      const complexData = {
        id: 1,
        name: "test",
        nested: { value: true },
        array: [1, 2, 3],
      };
      
      const safeResult = Promise.resolve({
        data: complexData,
        error: null,
      });
      
      const result = await unwrapSafePromise(safeResult);
      expect(result).toEqual(complexData);
    });

    it("should work with promises that reject", async () => {
      const rejectedPromise = Promise.reject(new Error("Promise rejected"));
      
      await expect(unwrapSafePromise(rejectedPromise)).rejects.toThrow("Promise rejected");
    });
  });

  describe("integration tests", () => {
    it("should work together for successful promise", async () => {
      const originalPromise = Promise.resolve("integration test");
      const safeResult = safePromise(originalPromise);
      const finalResult = await unwrapSafePromise(safeResult);
      
      expect(finalResult).toBe("integration test");
    });

    it("should work together for failed promise", async () => {
      const originalPromise = Promise.reject(new Error("integration error"));
      const safeResult = safePromise(originalPromise);
      
      await expect(unwrapSafePromise(safeResult)).rejects.toThrow("integration error");
    });

    it("should preserve error types through the chain", async () => {
      class NetworkError extends Error {
        statusCode: number;
        constructor(message: string, statusCode: number) {
          super(message);
          this.statusCode = statusCode;
        }
      }
      
      const networkError = new NetworkError("Network failed", 500);
      const originalPromise = Promise.reject(networkError);
      const safeResult = safePromise(originalPromise);
      
      await expect(unwrapSafePromise(safeResult)).rejects.toThrow(NetworkError);
      await expect(unwrapSafePromise(safeResult)).rejects.toThrow("Network failed");
      
      try {
        await unwrapSafePromise(safeResult);
      } catch (error) {
        expect((error as NetworkError).statusCode).toBe(500);
      }
    });
  });
});