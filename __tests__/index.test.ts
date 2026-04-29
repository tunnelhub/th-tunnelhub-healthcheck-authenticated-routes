import { handler } from '../src';
import Integration from '../src/core/integration';
import * as thSdk from '@tunnelhub/sdk';

jest.mock('../src/core/integration');
jest.mock('@tunnelhub/sdk');

const mockedSdk = jest.mocked(thSdk);

describe('index text', () => {
  mockedSdk.AutomationExecution.executeAutomation.mockImplementation(jest.fn());

  test('success test', async () => {
    const hasAnyErrorsSpy = jest.spyOn(Integration.prototype as any, 'hasAnyErrors');
    hasAnyErrorsSpy.mockImplementationOnce(jest.fn(() => false));

    await expect(handler({}, {})).resolves.not.toThrow();
    expect(hasAnyErrorsSpy).toBeCalled();
  });

  test('error test', async () => {
    const hasAnyErrorsSpy = jest.spyOn(Integration.prototype as any, 'hasAnyErrors');
    hasAnyErrorsSpy.mockImplementationOnce(jest.fn(() => true));

    await expect(handler({}, {})).rejects.toThrow();
    expect(hasAnyErrorsSpy).toBeCalled();
  });

});