import { Duration, RemovalPolicy, Stack, type StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as efs from 'aws-cdk-lib/aws-efs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class TwilioInboxStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 1
    });

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc
    });

    // Persist SQLite DB via EFS.
    const fileSystem = new efs.FileSystem(this, 'DbEfs', {
      vpc,
      encrypted: true,
      removalPolicy: RemovalPolicy.RETAIN
    });

    const accessPoint = new efs.AccessPoint(this, 'DbAccessPoint', {
      fileSystem,
      path: '/data',
      createAcl: {
        ownerGid: '1000',
        ownerUid: '1000',
        permissions: '750'
      },
      posixUser: {
        gid: '1000',
        uid: '1000'
      }
    });

    const jwtSecret = new secretsmanager.Secret(this, 'JwtSecret', {
      description: 'JWT secret for Twilio Inbox app'
    });

    const appEncryptionKey = new secretsmanager.Secret(this, 'AppEncryptionKey', {
      description: 'App encryption key used to encrypt Twilio credentials at rest'
    });

    const openAiKey = new secretsmanager.Secret(this, 'OpenAiApiKey', {
      description: 'OpenAI API key (optional)'
    });

    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Service', {
      cluster,
      publicLoadBalancer: true,
      desiredCount: 1,
      cpu: 512,
      memoryLimitMiB: 1024,
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset(this.node.tryGetContext('dockerAssetPath') ?? '..'),
        containerPort: 4000,
        environment: {
          NODE_ENV: 'production',
          PORT: '4000',
          // Persist DB on EFS
          DATABASE_URL: 'file:/data/dev.db',
          // Single-host deploy: allow same-origin without hardcoding
          WEB_ORIGIN: '*',
          // This gets overridden below with the ALB DNS (token resolved at deploy time).
          PUBLIC_BASE_URL: 'http://localhost'
        },
        secrets: {
          JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret),
          APP_ENCRYPTION_KEY: ecs.Secret.fromSecretsManager(appEncryptionKey),
          OPENAI_API_KEY: ecs.Secret.fromSecretsManager(openAiKey)
        }
      },
      healthCheckGracePeriod: Duration.seconds(60)
    });

    // Fix PUBLIC_BASE_URL to ALB DNS (token resolved at deploy time)
    service.taskDefinition.defaultContainer?.addEnvironment('PUBLIC_BASE_URL', `http://${service.loadBalancer.loadBalancerDnsName}`);

    // EFS mount
    service.taskDefinition.addVolume({
      name: 'db',
      efsVolumeConfiguration: {
        fileSystemId: fileSystem.fileSystemId,
        authorizationConfig: {
          accessPointId: accessPoint.accessPointId,
          iam: 'DISABLED'
        },
        transitEncryption: 'ENABLED'
      }
    });

    service.taskDefinition.defaultContainer?.addMountPoints({
      containerPath: '/data',
      sourceVolume: 'db',
      readOnly: false
    });

    // Allow ECS tasks to connect to EFS
    fileSystem.connections.allowDefaultPortFrom(service.service.connections);

    // ALB health check
    service.targetGroup.configureHealthCheck({
      path: '/healthz',
      healthyHttpCodes: '200'
    });

    new CfnOutput(this, 'LoadBalancerUrl', {
      value: `http://${service.loadBalancer.loadBalancerDnsName}`
    });

    new CfnOutput(this, 'JwtSecretArn', { value: jwtSecret.secretArn });
    new CfnOutput(this, 'AppEncryptionKeyArn', { value: appEncryptionKey.secretArn });
    new CfnOutput(this, 'OpenAiApiKeyArn', { value: openAiKey.secretArn });
  }
}
