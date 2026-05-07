targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the azd environment (used to derive resource names)')
param environmentName string

@minLength(1)
@description('Azure region for all resources')
param location string

@description('Object ID of the deploying user (granted dev access via RBAC, Constitution IV)')
param principalId string

@description('Foundry GA model name')
param gptModelName string = 'gpt-4.1'

@description('Foundry GA model version')
param gptModelVersion string

var resourceToken = uniqueString(subscription().id, environmentName, location)
var namePrefix = take(toLower(replace('${environmentName}${resourceToken}', '-', '')), 17)
var tags = {
  'azd-env-name': environmentName
}

resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: 'rg-${environmentName}'
  location: location
  tags: tags
}

module storage 'modules/storage.bicep' = {
  name: 'storage'
  scope: rg
  params: {
    namePrefix: namePrefix
    location: location
    tags: tags
  }
}

module foundry 'modules/foundry.bicep' = {
  name: 'foundry'
  scope: rg
  params: {
    namePrefix: namePrefix
    location: location
    tags: tags
    modelName: gptModelName
    modelVersion: gptModelVersion
  }
}

module functions 'modules/functions.bicep' = {
  name: 'functions'
  scope: rg
  params: {
    namePrefix: namePrefix
    location: location
    tags: tags
    storageAccountName: storage.outputs.storageAccountName
    storageBlobEndpoint: storage.outputs.blobEndpoint
    storageTableEndpoint: storage.outputs.tableEndpoint
    foundryEndpoint: foundry.outputs.endpoint
    foundryDeploymentName: foundry.outputs.deploymentName
  }
}

module staticWebApp 'modules/staticwebapp.bicep' = {
  name: 'staticWebApp'
  scope: rg
  params: {
    namePrefix: namePrefix
    location: location
    tags: tags
    backendFunctionAppId: resourceId(rg.name, 'Microsoft.Web/sites', functions.outputs.functionAppName)
  }
}

module rbac 'modules/rbac.bicep' = {
  name: 'rbac'
  scope: rg
  params: {
    storageAccountName: storage.outputs.storageAccountName
    foundryAccountName: '${namePrefix}oai'
    functionsPrincipalId: functions.outputs.principalId
    userPrincipalId: principalId
  }
}

output AZURE_LOCATION string = location
output AZURE_RESOURCE_GROUP string = rg.name
output SERVICE_API_NAME string = functions.outputs.functionAppName
output SERVICE_WEB_NAME string = staticWebApp.outputs.staticWebAppName
output STORAGE_ACCOUNT_NAME string = storage.outputs.storageAccountName
output STORAGE_BLOB_ENDPOINT string = storage.outputs.blobEndpoint
output STORAGE_TABLE_ENDPOINT string = storage.outputs.tableEndpoint
output FOUNDRY_ENDPOINT string = foundry.outputs.endpoint
output FOUNDRY_MODEL_DEPLOYMENT_NAME string = foundry.outputs.deploymentName
