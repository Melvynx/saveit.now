import { faker } from "@faker-js/faker";
import { nanoid } from "nanoid";

export const TEST_EMAIL = `playwright-test-main-${faker.internet.username().toLowerCase()}@playwright.dev`;
export const TEST_PASSWORD = "TestPassword123!";
export const TEST_NAME = faker.person.fullName();

export function getUserEmail(): string {
  return `playwright-test-${faker.internet.username().toLowerCase()}@playwright.dev`;
}

export function generateId(): string {
  return nanoid();
}

export function generateTestBookmarkData() {
  return {
    url: faker.internet.url(),
    title: faker.lorem.sentence(),
    description: faker.lorem.paragraph(),
    favicon: faker.image.url(),
    previewImage: faker.image.url(),
  };
}

export function generateTestTagData() {
  return {
    name: `test-${faker.lorem.word()}`,
  };
}

export function generateTestUserData() {
  return {
    name: faker.person.fullName(),
    email: getUserEmail(),
  };
}
