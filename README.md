# Tiny Cognito

Get [AWS Cognito](https://aws.amazon.com/cognito/) creds to use with [aws4fetch](https://github.com/mhart/aws4fetch)

Mints [unauthenticated creds](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cognito-identitypoolroleattachment.html#cfn-cognito-identitypoolroleattachment-roles) for calling AWS resources.


```js
import { AwsClient } from 'aws4fetch'
import cogniotAuth from 'tiny-cognito'

export default async function getAuth() {
  const creds = await cogniotAuth({
    COGNITO_REGION: 'us-east-1',
    IDENTITY_POOL_ID: 'us-east-1:1231311-8f1c-4978-b5e7-112322221'
  })
  const aws = new AwsClient({
    accessKeyId: creds.AccessKeyId,
    secretAccessKey: creds.SecretKey,
    sessionToken: creds.SessionToken,
  })
  const data = await aws.fetch(`https://lambda.us-east-1.amazonaws.com/2015-03-31/functions/${lambdaArn}/invocations`, {
    body: JSON.stringify({
      data: 'foo'
    }),
  }).then((d) => d.json())
  console.log('data', data)
}
```

## Example IAM statement

See `IdentityPoolUnauthenticatedRole` `Policies`

```yml
IdentityPoolRoleAttachment:
  Type: AWS::Cognito::IdentityPoolRoleAttachment
  Properties:
    IdentityPoolId: !Ref IdentityPool
    Roles:
      authenticated: !GetAtt IdentityPoolAuthenticatedRole.Arn
      unauthenticated: !GetAtt IdentityPoolUnauthenticatedRole.Arn
IdentityPoolAuthenticatedRole:
  Type: AWS::IAM::Role
  Properties:
    AssumeRolePolicyDocument:
      Version: '2012-10-17'
      Statement:
      - Effect: Allow
        Principal:
          Federated: ['cognito-identity.amazonaws.com']
        Action:
        - sts:AssumeRoleWithWebIdentity
        Condition:
          'ForAnyValue:StringLike':
            'cognito-identity.amazonaws.com:amr': 'authenticated'
    Path: "/"
    Policies:
      - PolicyName: "CognitoUnAuthorizedPolicy"
        PolicyDocument:
          Version: "2012-10-17"
          Statement:
          # Allow Only logged in access to ping AWS Lambda function from client
          - Effect: Allow
            Action:
            - lambda:InvokeFunction
            Resource:
            - !Sub arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:authed-function-name
IdentityPoolUnauthenticatedRole:
  Type: AWS::IAM::Role
  Properties:
    AssumeRolePolicyDocument:
      Version: '2012-10-17'
      Statement:
      - Effect: Allow
        Principal:
          Federated: ['cognito-identity.amazonaws.com']
        Action:
        - sts:AssumeRoleWithWebIdentity
        Condition:
          'ForAnyValue:StringLike':
            'cognito-identity.amazonaws.com:amr': 'unauthenticated'
    Path: "/"
    Policies:
      - PolicyName: "CognitoUnAuthorizedPolicy"
        PolicyDocument:
          Version: "2012-10-17"
          Statement:
          #################################################################################
          # Warning do not open yourself up to bad things. Scope IAM roles properly
          #################################################################################
          # Allow unauthed access to ping AWS Lambda function from client
          - Effect: Allow
            Action:
            - lambda:InvokeFunction
            Resource:
            - !Sub arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:your-function-name
          # Allow unauthed access to ping AWS pinpoint from client
          - Effect: Allow
            Action:
            - mobiletargeting:PutEvents
            Resource:
            - !Sub arn:${AWS::Partition}:mobiletargeting:${AWS::Region}:${AWS::AccountId}:apps/12313113112121212112121/*
```

## Security warning

Make sure your IAM permissions are scoped as tightly as possible (E.g. avoid `*`)

Use at own risk ✌️