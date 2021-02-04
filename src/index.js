import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity-browser/CognitoIdentityClient'
import { GetCredentialsForIdentityCommand } from '@aws-sdk/client-cognito-identity-browser/commands/GetCredentialsForIdentityCommand'
import { GetIdCommand } from '@aws-sdk/client-cognito-identity-browser/commands/GetIdCommand'

export default async function auth(config = {}) {
  const {
    COGNITO_REGION = 'us-east-1',
    COGNITO_ENDPOINT,
		IDENTITY_POOL_ID,
		getUserId = _getUserId,
		setUserId = _setUserId,
		getUserCredentials = _getUserCredentials,
		setUserCredentials = _setUserCredentials,
		getUserCredentialsKey = _getUserCredentialsKey,
		getUserIdKey = _getUserIdKey,
		debug = false
  } = config
  const CREDS_KEY = await getUserCredentialsKey(IDENTITY_POOL_ID)
  const USER_KEY = await getUserIdKey(IDENTITY_POOL_ID)

  let userId = await getUserId(USER_KEY)
  // Get user credentials from cache.
  const persistedUserCreds = await getPersistedUserCredentials(CREDS_KEY, getUserCredentials, debug)
  if (persistedUserCreds && persistedUserCreds.Credentials) {
    return persistedUserCreds.Credentials
  }

  // Configure Cognito client.
  const cognitoIdentityClient = new CognitoIdentityClient({
    region: COGNITO_REGION,
    credentials: {},
    /* Add custom endpoint if set */
    ...(COGNITO_ENDPOINT ? { endpoint: COGNITO_ENDPOINT } : {})
  })

  // Get unique ID if not set.
  if (!userId) {
    try {
      const getIdCommand = new GetIdCommand({
        IdentityPoolId: IDENTITY_POOL_ID
      })
      // console.log('getIdCommand', getIdCommand)
      const result = await cognitoIdentityClient.send(getIdCommand)
      userId = result.IdentityId
      // console.log('CognitoIdentityClient GetIdCommand userId', result.IdentityId)
      await setUserId(USER_KEY, userId)
    } catch (error) {
      console.error(error)
    }
  }

  /* Get creds from AWS Cognito */
  try {
    const getCredentialsCommand = new GetCredentialsForIdentityCommand({
      IdentityId: userId
    })
    // console.log('getCredentialsCommand', getCredentialsCommand)
    const userCredentials = await cognitoIdentityClient.send(getCredentialsCommand)
    await setUserCredentials(CREDS_KEY, userCredentials)
    return userCredentials.Credentials
  } catch (error) {
    console.error(error)
  }
  return false
}

async function getPersistedUserCredentials(credsKey, getUserCredentials, debug) {
  try {
    const persistedCreds = await getUserCredentials(credsKey)
    const creds = JSON.parse(persistedCreds)
    const expireTime = new Date(creds.Credentials.Expiration)
    // console.log('== creds expire', expireTime)
    // console.log('== the time now', new Date())
    // Validate expiration
    if (expireTime.getTime() > Date.now()) {
      if (debug) console.log('creds cache hit')
      return creds
    }
  } catch (e) {
    if (debug) console.log('getCredentials error', e)
  }
  if (debug) console.log('creds have expired')
  return false
}

function _getUserIdKey(identityPoolId) {
  return `__identity-id.${identityPoolId}`
}

function _getUserCredentialsKey(identityPoolId) {
  return `__identity-credentials.${identityPoolId}`
}

// Creds last for 1 hour by default
function _setUserCredentials(credsKey, credentials) {
  localStorage.setItem(credsKey, JSON.stringify(credentials))
}

function _getUserCredentials(credsKey) {
  return window.localStorage.getItem(credsKey)
}

function _getUserId(userIdKey) {
  return window.localStorage.getItem(userIdKey)
}

function _setUserId(userIdKey, id) {
  return window.localStorage.setItem(userIdKey, id)
}