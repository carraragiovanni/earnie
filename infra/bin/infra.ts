#!/usr/bin/env node
import 'source-map-support/register.js';
import { App } from 'aws-cdk-lib';
import { TwilioInboxStack } from '../lib/twilio-inbox-stack.js';

const app = new App();

new TwilioInboxStack(app, 'TwilioInboxStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
});
