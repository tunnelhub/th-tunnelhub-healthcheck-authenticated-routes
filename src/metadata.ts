import { Metadata } from '@tunnelhub/sdk';
import { AuthenticatedRouteCheck } from './types/integration';

/**
 * Return all columns that will be visible on the monitoring screen.
 * The components order is the display order in the monitoring table.
 *
 * The implementation of this method is mandatory
 */
export default [
  {
    fieldName: 'name',
    fieldLabel: 'Check',
    fieldType: 'TEXT',
  },
  {
    fieldName: 'url',
    fieldLabel: 'URL',
    fieldType: 'TEXT',
  },
] as Metadata<AuthenticatedRouteCheck>[];