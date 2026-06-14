import * as path from 'path';
import { Stack, StackProps, Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
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

    // DynamoDB — single table, pay-per-request, retained on cdk destroy
    const table = new dynamodb.Table(this, 'SnapshotTable', {
      tableName: 'auckland-transit-pulse-snapshot',
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey:      { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode:  dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // S3 — shape files, one JSON per route
    const shapesBucket = new s3.Bucket(this, 'ShapesBucket', {
      bucketName: `auckland-transit-pulse-shapes-${this.account}`,
      removalPolicy: RemovalPolicy.RETAIN,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // Poller Lambda
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
      bundling: { externalModules: ['@aws-sdk/*'] },
    });

    table.grantWriteData(pollerLambda);
    table.grantReadData(pollerLambda);
    pollerLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter${SSM_PARAM_NAME}`],
    }));

    new events.Rule(this, 'PollerSchedule', {
      schedule: events.Schedule.rate(Duration.minutes(1)),
      targets: [new targets.LambdaFunction(pollerLambda)],
    });

    // API Lambda
    const apiLambda = new NodejsFunction(this, 'ApiLambda', {
      functionName: 'atp-api',
      entry: path.join(__dirname, '../../backend/src/api/index.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_22_X,
      timeout: Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: table.tableName,
        SHAPES_BUCKET_NAME: shapesBucket.bucketName,
      },
      bundling: { externalModules: ['@aws-sdk/*'] },
    });

    table.grantReadData(apiLambda);
    shapesBucket.grantRead(apiLambda);

    // API Gateway
    const api = new apigateway.RestApi(this, 'TransitApi', {
      restApiName: 'auckland-transit-pulse-api',
      deployOptions: { stageName: 'prod' },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'OPTIONS'],
      },
    });

    const integration = new apigateway.LambdaIntegration(apiLambda);

    api.root.addResource('snapshot').addMethod('GET', integration);
    api.root.addResource('history').addMethod('GET', integration);
    api.root.addResource('hourly').addMethod('GET', integration);

    const shapesResource = api.root.addResource('shapes');
    shapesResource.addResource('{routeId}').addMethod('GET', integration);

    new CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway base URL — set as VITE_API_URL in Amplify environment variables',
    });

    new CfnOutput(this, 'ShapesBucketName', {
      value: shapesBucket.bucketName,
      description: 'S3 bucket name for shape files — use as SHAPES_BUCKET_NAME when running generate-shapes',
    });
  }
}
