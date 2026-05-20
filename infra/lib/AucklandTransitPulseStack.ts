import * as path from 'path';
import { Stack, StackProps, Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';

const SSM_PARAM_NAME = '/auckland-transit-pulse/at-api-key';

export class AucklandTransitPulseStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // DynamoDB — single table, pay-per-request, destroyed on cdk destroy
    const table = new dynamodb.Table(this, 'SnapshotTable', {
      tableName: 'auckland-transit-pulse-snapshot',
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Poller Lambda — fetches AT API every 60s and writes snapshot
    const pollerLambda = new NodejsFunction(this, 'PollerLambda', {
      functionName: 'atp-poller',
      entry: path.join(__dirname, '../../backend/src/poller/index.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_22_X,
      timeout: Duration.seconds(30),
      memorySize: 256,
      environment: {
        TABLE_NAME: table.tableName,
        SSM_PARAM_NAME,
      },
      bundling: {
        externalModules: ['@aws-sdk/*'],
      },
    });

    table.grantWriteData(pollerLambda);
    pollerLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [
        `arn:aws:ssm:${this.region}:${this.account}:parameter${SSM_PARAM_NAME}`,
      ],
    }));

    // EventBridge — minimum rate is 1 minute
    new events.Rule(this, 'PollerSchedule', {
      schedule: events.Schedule.rate(Duration.minutes(1)),
      targets: [new targets.LambdaFunction(pollerLambda)],
    });

    // API Lambda — reads snapshot from DynamoDB
    const apiLambda = new NodejsFunction(this, 'ApiLambda', {
      functionName: 'atp-api',
      entry: path.join(__dirname, '../../backend/src/api/index.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_22_X,
      timeout: Duration.seconds(10),
      memorySize: 128,
      environment: { TABLE_NAME: table.tableName },
      bundling: {
        externalModules: ['@aws-sdk/*'],
      },
    });

    table.grantReadData(apiLambda);

    // API Gateway — exposes /snapshot GET endpoint
    const api = new apigateway.RestApi(this, 'TransitApi', {
      restApiName: 'auckland-transit-pulse-api',
      deployOptions: { stageName: 'prod' },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'OPTIONS'],
      },
    });

    api.root
      .addResource('snapshot')
      .addMethod('GET', new apigateway.LambdaIntegration(apiLambda));

    new CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway base URL — set as VITE_API_URL in Amplify environment variables',
    });
  }
}
