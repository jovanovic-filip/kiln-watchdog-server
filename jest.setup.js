expect.extend({
  toBeOneOf(received, items) {
    const pass = items.includes(received);
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be one of [${items}]`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be one of [${items}]`,
        pass: false,
      };
    }
  },
}); 