import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AucklandTransitPulseStack } from '../lib/AucklandTransitPulseStack';

const app = new cdk.App();
new AucklandTransitPulseStack(app, 'AucklandTransitPulseStack', {
  env: { region: 'ap-southeast-2' },
});
