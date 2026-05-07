targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the azd environment (used to derive resource names)')
param environmentName string

@minLength(1)
@description('Azure region — must support Flex Consumption, Azure OpenAI, and Static Web Apps (e.g. eastus2)')
param location string

@description('Object ID of the deploying user (granted dev access via RBAC, Constitution IV)')
param principalId string

@description('Model deployments for the Foundry project — array of {name, modelName, modelVersion, capacity}')
param modelDeployments array = [
  { name: 'gpt-5.4', modelName: 'gpt-5.4', modelVersion: '2026-03-05', capacity: 100 }
]

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

// --- Networking: VNet, subnets, private DNS zones ---
module network 'modules/network.bicep' = {
  name: 'network'
  scope: rg
  params: {
    namePrefix: namePrefix
    location: location
    tags: tags
  }
}

// --- Storage: single account for AzureWebJobsStorage + app data ---
module storage 'modules/storage.bicep' = {
  name: 'storage'
  scope: rg
  params: {
    namePrefix: namePrefix
    location: location
    tags: tags
    privateEndpointSubnetId: network.outputs.privateEndpointSubnetId
    privateDnsZoneBlobId: network.outputs.privateDnsZoneBlobId
    privateDnsZoneTableId: network.outputs.privateDnsZoneTableId
    privateDnsZoneQueueId: network.outputs.privateDnsZoneQueueId
  }
}

// --- Microsoft Foundry (AI Services + model deployments) with private endpoint ---
module foundry 'modules/foundry.bicep' = {
  name: 'foundry'
  scope: rg
  params: {
    namePrefix: namePrefix
    location: location
    tags: tags
    modelDeployments: modelDeployments
    privateEndpointSubnetId: network.outputs.privateEndpointSubnetId
    privateDnsZoneOpenAIId: network.outputs.privateDnsZoneCogServicesId
  }
}

// --- Functions: VNet-integrated, single storage account, managed identity ---
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
    foundryDeploymentName: foundry.outputs.deploymentNames[0]
    functionsSubnetId: network.outputs.functionsSubnetId
  }
}

// --- Static Web App linked to Functions backend ---
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

// --- RBAC: MI + deploying user get Storage + Foundry access ---
module rbac 'modules/rbac.bicep' = {
  name: 'rbac'
  scope: rg
  params: {
    storageAccountName: storage.outputs.storageAccountName
    foundryAccountName: foundry.outputs.aiServicesAccountName
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
output FOUNDRY_MODEL_DEPLOYMENT_NAME string = foundry.outputs.deploymentNames[0]
output FOUNDRY_DEPLOYMENT_NAMES array = foundry.outputs.deploymentNames
