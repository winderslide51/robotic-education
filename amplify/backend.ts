import { defineBackend } from '@aws-amplify/backend';
import { Code, Function, FunctionUrlAuthType, HttpMethod, Runtime } from 'aws-cdk-lib/aws-lambda';
import { fileURLToPath } from 'node:url';

const backend = defineBackend({});

// Backend Python : une Lambda qui sert le contenu du parcours via une Function URL publique en lecture seule.
const stack = backend.createStack('robofete-api');
const contentFn = new Function(stack, 'ContentFunction', {
  runtime: Runtime.PYTHON_3_12,
  handler: 'handler.handler',
  code: Code.fromAsset(fileURLToPath(new URL('../backend/app', import.meta.url))),
});
const fnUrl = contentFn.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: { allowedOrigins: ['*'], allowedMethods: [HttpMethod.GET] },
});

backend.addOutput({ custom: { apiUrl: fnUrl.url } });
