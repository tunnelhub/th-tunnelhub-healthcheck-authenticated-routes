import Integration from '../../src/core/integration';
import { SDK } from '@tunnelhub/sdk';

describe('test src/integration', () => {
  beforeAll(() => {
    SDK.testMode = true;
  });

  test('successfully test', async () => {
    const integration = new Integration({}, {});
    await expect(integration.doIntegration(undefined)).resolves.not.toThrow();
    expect(integration.hasAnyErrors()).toBeFalsy();
  });
});